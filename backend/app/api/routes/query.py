"""
Question Answering API Routes with Enhanced Processing
"""
import time
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status, UploadFile, File
import json

from app.models.question import (
    Question,
    Answer,
    QAResult,
    ProcessQuestionsRequest,
    QuestionType,
    SourceEvidence
)
from app.services.vector_store import vector_store
from app.services.gemini_service import gemini_service
from app.services.answer_processor import answer_processor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/process", response_model=QAResult)
async def process_questions(request: ProcessQuestionsRequest):
    """
    Process a batch of questions with enhanced source verification.

    Features:
    - Multiple question types support
    - Source verification and confidence scoring
    - Step-by-step reasoning extraction
    """
    batch_id = str(uuid.uuid4())
    start_time = time.time()

    results = []
    completed = 0
    failed = 0

    logger.info(f"Processing batch {batch_id}: {len(request.questions)} questions")

    for question in request.questions:
        try:
            answer = await _process_single_question(
                question=question,
                top_k=request.top_k,
                min_relevance=request.min_relevance_score,
                enable_verification=request.enable_verification
            )
            results.append(answer)
            completed += 1

        except Exception as e:
            logger.error(f"Failed to process question {question.id}: {e}")
            failed += 1

    total_time = time.time() - start_time

    logger.info(
        f"Batch {batch_id} complete: {completed} succeeded, {failed} failed, "
        f"{total_time:.2f}s total"
    )

    return QAResult(
        batch_id=batch_id,
        total_questions=len(request.questions),
        completed=completed,
        failed=failed,
        results=results,
        total_processing_time=total_time
    )


@router.post("/single", response_model=Answer)
async def ask_single_question(
    question: str = Query(..., description="Question text"),
    question_type: QuestionType = Query(QuestionType.OPEN_ENDED, description="Question type"),
    top_k: int = Query(5, ge=1, le=20, description="Number of chunks to retrieve"),
    enable_verification: bool = Query(True, description="Enable source verification")
):
    """
    Ask a single question with enhanced processing.

    Query Parameters:
    - question: The question text
    - question_type: Type of question (open_ended, multiple_choice, true_false, short_answer)
    - top_k: Number of document chunks to retrieve
    - enable_verification: Whether to verify sources
    """
    logger.info(f"Single question: '{question[:50]}...', type: {question_type}")

    try:
        q = Question(
            id=str(uuid.uuid4()),
            text=question,
            type=question_type
        )

        answer = await _process_single_question(
            question=q,
            top_k=top_k,
            enable_verification=enable_verification
        )

        return answer

    except Exception as e:
        logger.error(f"Single question failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/upload-json", response_model=QAResult)
async def upload_questions_json(file: UploadFile = File(...)):
    """Upload questions from JSON file with auto type detection."""
    if not file.filename.endswith('.json'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .json files are supported"
        )

    try:
        content = await file.read()
        data = json.loads(content)

        if 'questions' not in data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON must contain 'questions' array"
            )

        # Parse questions with auto type detection
        questions = []
        for q_data in data['questions']:
            # Auto-detect type from text
            question_text = q_data.get('text', '')
            question_type = _detect_question_type(question_text)

            # Parse options for multiple choice
            options = None
            if question_type == QuestionType.MULTIPLE_CHOICE:
                options = _parse_multiple_choice_options(question_text)

            q = Question(
                id=q_data.get('id', str(uuid.uuid4())),
                text=question_text,
                type=question_type,
                options=options,
                metadata=q_data.get('metadata', {})
            )
            questions.append(q)

        logger.info(f"Loaded {len(questions)} questions from JSON with auto-detected types")

        # Process questions
        request = ProcessQuestionsRequest(questions=questions)
        result = await process_questions(request)

        return result

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {str(e)}"
        )
    except Exception as e:
        logger.error(f"JSON upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


def _detect_question_type(text: str) -> QuestionType:
    """Auto-detect question type from text."""
    text_lower = text.lower()

    # True/False detection
    if any(pattern in text_lower for pattern in ['evet/hayir', 'doğru/yanlış', 'true/false']):
        return QuestionType.TRUE_FALSE

    # Multiple choice detection
    if any(pattern in text_lower for pattern in ['çoktan seçmeli', 'multiple choice']) or \
            ('a)' in text_lower and 'b)' in text_lower):
        return QuestionType.MULTIPLE_CHOICE

    # Short answer detection (look for keywords)
    if any(pattern in text_lower for pattern in ['kaç', 'ne zaman', 'hangi yıl', 'kim']):
        return QuestionType.SHORT_ANSWER

    # Default to open-ended
    return QuestionType.OPEN_ENDED


def _parse_multiple_choice_options(text: str) -> List:
    """Parse multiple choice options from question text."""
    from app.models.question import MultipleChoiceOption

    # Find options (A), B), C), D) etc.
    import re
    options = []

    # Split by newlines and look for patterns
    lines = text.split('\n')
    for line in lines:
        # Match: A) text, B) text, etc.
        match = re.match(r'^([A-Z])\)\s*(.+)', line.strip())
        if match:
            option_id = match.group(1)
            option_text = match.group(2).strip()
            options.append(MultipleChoiceOption(
                id=option_id,
                text=option_text
            ))

    return options if options else None


async def _process_single_question(
    question: Question,
    top_k: int = 5,
    min_relevance: float = 0.5,
    enable_verification: bool = True
) -> Answer:
    """
    Process a single question with full pipeline.

    Pipeline:
    1. Generate question embedding
    2. Retrieve relevant chunks from vector store
    3. Generate answer with Gemini
    4. Extract and verify sources
    5. Calculate confidence scores
    """
    start_time = time.time()

    # Step 1: Generate embedding
    question_embeddings = await gemini_service.generate_embeddings([question.text])
    question_embedding = question_embeddings[0]

    # Step 2: Search vector store (FIXED: n_results instead of top_k)
    search_results = vector_store.search(
        query_embedding=question_embedding,
        n_results=top_k  # <-- DÜZELTME: top_k -> n_results
    )

    if not search_results:
        logger.warning(f"No relevant chunks found for question: {question.id}")
        return Answer(
            question_id=question.id,
            question_text=question.text,
            question_type=question.type,
            answer="Üzgünüm, bu soruyla ilgili yüklenen belgelerde bilgi bulamadım.",
            sources=[],
            confidence_score=0.0,
            verification_status="unverified",
            processing_time=time.time() - start_time,
            model_used=gemini_service.model.model_name
        )

    # Filter by relevance
    relevant_chunks = [
        chunk for chunk in search_results
        if chunk['relevance_score'] >= min_relevance
    ]

    if not relevant_chunks:
        relevant_chunks = search_results[:2]  # At least use top 2

    logger.info(f"Retrieved {len(relevant_chunks)} relevant chunks")

    # Step 3: Generate answer
    answer_text, reasoning_steps = await gemini_service.answer_question(
        question=question.text,
        question_type=question.type,
        context_chunks=relevant_chunks,
        options=question.options
    )

    # Step 4: Extract and verify sources
    if enable_verification:
        sources = answer_processor.extract_quotes_from_answer(
            answer=answer_text,
            chunks=relevant_chunks
        )

        verification_status = answer_processor.verify_sources(sources)

        confidence_score = answer_processor.calculate_answer_confidence(
            answer=answer_text,
            sources=sources,
            question_type=question.type
        )
    else:
        # Fallback: Create basic sources from top chunks
        sources = [
            SourceEvidence(
                chunk_id=chunk['chunk_id'],
                document_id=chunk['document_id'],
                exact_quote=chunk['text'][:200],
                context=chunk['text'][:300],
                page_number=chunk.get('page_number'),
                relevance_score=chunk['relevance_score'],
                confidence_score=chunk['relevance_score'],
                match_type="inference"
            )
            for chunk in relevant_chunks[:3]
        ]
        verification_status = "unverified"
        confidence_score = 0.7

    # Step 5: Extract selected option for multiple choice
    selected_option_id = None
    if question.type == QuestionType.MULTIPLE_CHOICE:
        selected_option_id = _extract_selected_option(answer_text, question.options)

    processing_time = time.time() - start_time

    logger.info(
        f"Question {question.id} processed: "
        f"{len(sources)} sources, "
        f"confidence={confidence_score:.2f}, "
        f"status={verification_status}, "
        f"time={processing_time:.2f}s"
    )

    return Answer(
        question_id=question.id,
        question_text=question.text,
        question_type=question.type,
        answer=answer_text,
        selected_option_id=selected_option_id,
        sources=sources,
        confidence_score=confidence_score,
        reasoning_steps=reasoning_steps if reasoning_steps else None,
        verification_status=verification_status,
        processing_time=processing_time,
        model_used=gemini_service.model.model_name
    )


def _extract_selected_option(
    answer: str,
    options: Optional[List]
) -> Optional[str]:
    """Extract selected option from multiple choice answer."""
    if not options:
        return None

    # Look for patterns like "Cevap: A" or "Answer: B"
    import re
    match = re.search(r'(?:Cevap|Answer):\s*([A-Za-z0-9]+)', answer, re.IGNORECASE)
    if match:
        selected_id = match.group(1).upper()
        # Verify it's a valid option
        valid_ids = [opt.id.upper() for opt in options]
        if selected_id in valid_ids:
            return selected_id

    return None