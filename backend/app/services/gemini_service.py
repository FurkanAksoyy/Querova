"""
Google Gemini AI Service with Enhanced Prompting and Batch Processing
"""
import time
import logging
import re
import asyncio
from typing import List, Dict, Any, Optional, Tuple

import google.generativeai as genai

from app.config import settings
from app.models.question import QuestionType, MultipleChoiceOption

logger = logging.getLogger(__name__)


class GeminiService:
    """
    Enhanced Gemini service with question type support and better prompting.

    Features:
    - Batch and single embedding generation
    - Type-aware question answering
    - Reasoning extraction
    - Error handling and retry logic
    """

    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(settings.gemini_model)
        self.embedding_model = settings.gemini_embedding_model
        self.max_retries = 3
        self.retry_delay = 1.0
        logger.info(f"GeminiService initialized with model: {settings.gemini_model}")

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors
        """
        embeddings = []

        for i, text in enumerate(texts):
            for attempt in range(self.max_retries):
                try:
                    result = genai.embed_content(
                        model=self.embedding_model,
                        content=text,
                        task_type="retrieval_document"
                    )
                    embeddings.append(result['embedding'])
                    break

                except Exception as e:
                    if attempt == self.max_retries - 1:
                        logger.error(f"Embedding generation failed after {self.max_retries} attempts: {e}")
                        # Return zero vector as fallback
                        embeddings.append([0.0] * 768)
                    else:
                        logger.warning(f"Embedding attempt {attempt + 1} failed, retrying...")
                        await asyncio.sleep(self.retry_delay)

        logger.info(f"Generated {len(embeddings)} embeddings")
        return embeddings

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Batch embedding generation (optimized for multiple texts).

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors
        """
        # For now, uses same implementation as generate_embeddings
        # Can be optimized with parallel processing if needed
        return await self.generate_embeddings(texts)

    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.

        Args:
            query: Search query text

        Returns:
            Embedding vector
        """
        try:
            result = genai.embed_content(
                model=self.embedding_model,
                content=query,
                task_type="retrieval_query"  # Different task type for queries
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Query embedding generation failed: {e}")
            return [0.0] * 768

    async def answer_question(
            self,
            question: str,
            question_type: QuestionType,
            context_chunks: List[Dict],
            options: Optional[List[MultipleChoiceOption]] = None
    ) -> Tuple[str, List[str]]:
        """Answer a question using context with type-specific prompting."""
        prompt = self._build_prompt(question, question_type, context_chunks, options)

        for attempt in range(self.max_retries):
            try:
                start_time = time.time()

                # Generate with DISABLED safety settings
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        top_p=0.9,
                        top_k=40,
                        max_output_tokens=2048,
                    ),
                    safety_settings=[
                        {
                            "category": "HARM_CATEGORY_HARASSMENT",
                            "threshold": "BLOCK_NONE"
                        },
                        {
                            "category": "HARM_CATEGORY_HATE_SPEECH",
                            "threshold": "BLOCK_NONE"
                        },
                        {
                            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            "threshold": "BLOCK_NONE"
                        },
                        {
                            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                            "threshold": "BLOCK_NONE"
                        }
                    ]
                )

                elapsed = time.time() - start_time

                # Check if response was blocked
                if not response.candidates or not response.candidates[0].content.parts:
                    logger.warning(f"Response blocked or empty, attempt {attempt + 1}")
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(self.retry_delay)
                        continue
                    else:
                        return (
                            "Üzgünüm, bu soruya güvenli bir yanıt oluşturamadım. "
                            "Soruyu farklı şekilde ifade ederseniz yardımcı olabilirim.",
                            []
                        )

                # Extract text
                answer = response.text
                reasoning_steps = self._extract_reasoning_steps(answer)

                logger.info(
                    f"Question answered in {elapsed:.2f}s, "
                    f"type: {question_type}, "
                    f"length: {len(answer)} chars"
                )

                return answer, reasoning_steps

            except AttributeError as e:
                # Response doesn't have .text attribute
                logger.error(f"Response parsing error: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                    continue
                else:
                    return (
                        "Yanıt oluşturuldu ancak işlenirken bir hata oluştu. "
                        "Lütfen tekrar deneyin.",
                        []
                    )

            except Exception as e:
                logger.error(f"Answer attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                else:
                    return (
                        "Üzgünüm, bu soruyu yanıtlarken teknik bir hata oluştu. "
                        "Lütfen daha sonra tekrar deneyin.",
                        []
                    )

        return "Yanıt oluşturulamadı.", []

    def _build_prompt(
        self,
        question: str,
        question_type: QuestionType,
        chunks: List[Dict],
        options: Optional[List[MultipleChoiceOption]] = None
    ) -> str:
        """Build type-specific prompt with enhanced instructions."""

        # Build context from chunks
        context = self._format_context(chunks)

        # Base instructions (common for all types)
        base_instructions = """Sen bir belge analiz uzmanısın. Verilen bağlamı kullanarak soruları yanıtla.

⚠️ ÖNEMLİ KURALLAR:
1. SADECE verilen belge bağlamını kullan - kendi bilgini ekleme
2. Her iddiada kaynak göster: [Kaynak X] formatında (X = kaynak numarası)
3. Emin değilsen "Bu bilgi belgede açıkça belirtilmemiş" de
4. Doğrudan alıntı yaparken çift tırnak kullan: "alıntı metni"
5. Net, öz ve Türkçe yanıt ver"""

        if question_type == QuestionType.OPEN_ENDED:
            return f"""{base_instructions}

📚 BAĞLAM:
{context}

❓ SORU: {question}

📝 CEVAP FORMATI:
1. Ana cevabı 2-4 paragraf olarak ver
2. Her iddia için [Kaynak X] ile kaynak göster
3. Önemli noktalarda doğrudan alıntı yap: "alıntı"
4. Sonunda kısa bir özet ekle

CEVAP:"""

        elif question_type == QuestionType.MULTIPLE_CHOICE:
            if not options:
                return f"{base_instructions}\n\nSORU: {question}\n\nCEVAP:"

            options_text = "\n".join([f"{opt.id}. {opt.text}" for opt in options])
            return f"""{base_instructions}

📚 BAĞLAM:
{context}

❓ SORU: {question}

✅ SEÇENEKLER:
{options_text}

📝 CEVAP FORMATI:
1. İlk satırda: "Cevap: [seçenek_id]" formatında doğru cevabı belirt
2. Seçim gerekçesini açıkla ve [Kaynak X] ile kaynak göster
3. Diğer seçeneklerin neden yanlış olduğunu kısaca açıkla

CEVAP:"""

        elif question_type == QuestionType.TRUE_FALSE:
            return f"""{base_instructions}

📚 BAĞLAM:
{context}

⚖️ İFADE: {question}

📝 CEVAP FORMATI:
1. İlk satırda sadece "DOĞRU" veya "YANLIŞ" yaz
2. Gerekçeyi açıkla ve [Kaynak X] ile kaynak göster
3. Belgeden alıntı yaparak kanıtla: "alıntı metni"

CEVAP:"""

        elif question_type == QuestionType.SHORT_ANSWER:
            return f"""{base_instructions}

📚 BAĞLAM:
{context}

❓ SORU: {question}

📝 CEVAP FORMATI:
Kısa ve öz yanıt ver (maksimum 2-3 cümle), kaynak göster [Kaynak X]

CEVAP:"""

        # Fallback for unknown types
        return f"{base_instructions}\n\nBĞLAM:\n{context}\n\nSORU: {question}\n\nCEVAP:"

    def _format_context(self, chunks: List[Dict]) -> str:
        """
        Format context chunks with source markers and metadata.

        Args:
            chunks: List of document chunks with metadata

        Returns:
            Formatted context string
        """
        context_parts = []

        for i, chunk in enumerate(chunks, 1):
            text = chunk.get('text', '')
            page = chunk.get('page_number', 'N/A')
            relevance = chunk.get('relevance_score', 0.0)

            # Add source marker with metadata
            header = f"[Kaynak {i}] (Sayfa {page}, İlgililik: {relevance:.0%})"
            context_parts.append(f"{header}:\n{text}")

        return "\n\n" + "="*80 + "\n\n".join(context_parts)

    def _extract_reasoning_steps(self, answer: str) -> List[str]:
        """
        Extract step-by-step reasoning from answer text.

        Args:
            answer: The generated answer text

        Returns:
            List of reasoning steps (max 5)
        """
        steps = []

        # Look for numbered lists, bullet points, or step indicators
        lines = answer.split('\n')

        for line in lines:
            line = line.strip()

            # Match various list formats:
            # "1. ", "2) ", "- ", "• ", "* ", "Step 1:", "Adım 1:"
            if re.match(r'^(\d+[\.)]\s+|[-•*]\s+|(?:Step|Adım)\s+\d+:)', line, re.IGNORECASE):
                # Remove the marker
                step = re.sub(r'^(\d+[\.)]\s+|[-•*]\s+|(?:Step|Adım)\s+\d+:)', '', line, flags=re.IGNORECASE)
                step = step.strip()

                # Only include meaningful steps (> 15 chars)
                if len(step) > 15:
                    steps.append(step)

        # Return max 5 steps
        return steps[:5]

    def test_connection(self) -> bool:
        """
        Test if Gemini API connection is working.

        Returns:
            True if connection successful
        """
        try:
            test_result = genai.embed_content(
                model=self.embedding_model,
                content="test",
                task_type="retrieval_document"
            )
            logger.info("Gemini API connection test successful")
            return True
        except Exception as e:
            logger.error(f"Gemini API connection test failed: {e}")
            return False


# Singleton instance
gemini_service = GeminiService()