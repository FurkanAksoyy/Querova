from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class QuestionType(str, Enum):
    """Types of questions supported."""
    OPEN_ENDED = "open_ended"  # Serbest cevap
    MULTIPLE_CHOICE = "multiple_choice"  # Çoktan seçmeli
    TRUE_FALSE = "true_false"  # Doğru/Yanlış
    SHORT_ANSWER = "short_answer"  # Kısa cevap (1-2 cümle)


class MultipleChoiceOption(BaseModel):
    """A single option for multiple choice questions."""
    id: str
    text: str
    is_correct: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class Question(BaseModel):
    """A single question with type support."""
    id: str
    text: str
    type: QuestionType = Field(default=QuestionType.OPEN_ENDED)
    options: Optional[List[MultipleChoiceOption]] = None  # For multiple choice
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class QuestionBatch(BaseModel):
    """A batch of questions."""
    questions: List[Question]

    model_config = ConfigDict(from_attributes=True)


class SourceEvidence(BaseModel):
    """Evidence from source with exact quote."""
    chunk_id: str
    document_id: str
    exact_quote: str  # Tam alıntı
    context: str  # Çevresindeki metin
    page_number: Optional[int] = None
    relevance_score: float
    confidence_score: float  # Bu kaynak ne kadar güvenilir
    match_type: Literal["exact", "paraphrase", "inference"] = "exact"

    model_config = ConfigDict(from_attributes=True)


class Answer(BaseModel):
    """Answer with enhanced source tracking."""
    question_id: str
    question_text: str
    question_type: QuestionType
    answer: str
    selected_option_id: Optional[str] = None  # For multiple choice
    sources: List[SourceEvidence]
    confidence_score: float  # Overall answer confidence
    reasoning_steps: Optional[List[str]] = None  # Step-by-step reasoning
    verification_status: Literal["verified", "partial", "unverified"] = "unverified"
    processing_time: float
    model_used: str

    model_config = ConfigDict(from_attributes=True)


class QAResult(BaseModel):
    """Result of processing questions."""
    batch_id: str
    total_questions: int
    completed: int
    failed: int
    results: List[Answer]
    total_processing_time: float
    timestamp: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(from_attributes=True)


class ProcessQuestionsRequest(BaseModel):
    """Request to process questions."""
    questions: List[Question]
    document_ids: Optional[List[str]] = None
    top_k: int = Field(default=5, ge=1, le=20)
    min_relevance_score: float = Field(default=0.5, ge=0.0, le=1.0)
    enable_verification: bool = Field(default=True)  # Source verification

    model_config = ConfigDict(from_attributes=True)