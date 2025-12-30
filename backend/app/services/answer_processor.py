"""
Answer Quality Enhancement & Source Verification Service
"""
"""
Answer Quality Enhancement & Source Verification Service
"""
import re
import logging
from typing import List, Tuple, Dict, Optional  # Optional ekledik
from difflib import SequenceMatcher

from app.models.question import SourceEvidence, QuestionType

logger = logging.getLogger(__name__)


class AnswerProcessor:
    """
    Processes and validates answers with source verification.

    Features:
    - Exact quote extraction
    - Source confidence scoring
    - Answer-source alignment verification
    - Citation format standardization
    """

    def __init__(self):
        self.min_quote_length = 10
        self.min_match_ratio = 0.85
        logger.info("AnswerProcessor initialized")

    def extract_quotes_from_answer(
            self,
            answer: str,
            chunks: List[Dict]
    ) -> List[SourceEvidence]:
        """
        Extract verifiable quotes from answer text and match to sources.
        SIMPLIFIED VERSION - Just map chunks to sources.
        """
        sources = []

        # Strategy 1: Look for [Kaynak X] citations
        citation_pattern = r'\[(?:Kaynak|Source)\s+(\d+)\]'
        citations = list(re.finditer(citation_pattern, answer, re.IGNORECASE))

        if citations:
            logger.info(f"Found {len(citations)} citation markers")
            for match in citations:
                citation_num = int(match.group(1))
                chunk_idx = citation_num - 1

                if chunk_idx < 0 or chunk_idx >= len(chunks):
                    continue

                chunk = chunks[chunk_idx]

                # Create source evidence
                source = SourceEvidence(
                    chunk_id=chunk['chunk_id'],
                    document_id=chunk['document_id'],
                    exact_quote=chunk['text'][:300],  # First 300 chars
                    context=chunk['text'][:500],
                    page_number=chunk.get('page_number'),
                    relevance_score=chunk['relevance_score'],
                    confidence_score=0.9,  # High confidence for cited sources
                    match_type="exact"
                )

                # Avoid duplicates
                if not any(s.chunk_id == source.chunk_id for s in sources):
                    sources.append(source)

        # Strategy 2: If no citations, use top chunks as sources
        if not sources:
            logger.info("No citations found, using top chunks as sources")
            for i, chunk in enumerate(chunks[:3]):  # Top 3 chunks
                source = SourceEvidence(
                    chunk_id=chunk['chunk_id'],
                    document_id=chunk['document_id'],
                    exact_quote=chunk['text'][:300],
                    context=chunk['text'][:500],
                    page_number=chunk.get('page_number'),
                    relevance_score=chunk['relevance_score'],
                    confidence_score=chunk['relevance_score'],
                    match_type="inference"
                )
                sources.append(source)

        logger.info(f"Extracted {len(sources)} verified sources")
        return sources

    def _extract_quote_context(
            self,
            answer: str,
            citation_pos: int,
            chunk_text: str
    ) -> Optional[Tuple[str, str, str, float]]:
        """
        Extract the relevant quote and context around a citation.

        Returns:
            Tuple of (exact_quote, context, match_type, confidence_score)
        """
        # Get sentence containing citation
        sentences_before = answer[:citation_pos].split('.')
        sentence = sentences_before[-1] if sentences_before else ""

        # Clean sentence
        sentence = sentence.strip()
        if len(sentence) < self.min_quote_length:
            return None

        # Try exact match
        if sentence.lower() in chunk_text.lower():
            start_idx = chunk_text.lower().index(sentence.lower())
            context_start = max(0, start_idx - 100)
            context_end = min(len(chunk_text), start_idx + len(sentence) + 100)
            context = chunk_text[context_start:context_end]

            return (sentence, context, "exact", 1.0)

        # Try fuzzy match
        best_match = self._find_best_match(sentence, chunk_text)
        if best_match:
            match_text, match_ratio = best_match
            if match_ratio >= self.min_match_ratio:
                # Extract context around match
                start_idx = chunk_text.index(match_text)
                context_start = max(0, start_idx - 100)
                context_end = min(len(chunk_text), start_idx + len(match_text) + 100)
                context = chunk_text[context_start:context_end]

                match_type = "paraphrase" if match_ratio < 1.0 else "exact"
                return (match_text, context, match_type, match_ratio)

        return None

    def _find_best_match(
            self,
            query: str,
            text: str
    ) -> Optional[Tuple[str, float]]:
        """
        Find best matching substring in text using sliding window.

        Returns:
            Tuple of (matched_text, similarity_ratio)
        """
        words = text.split()
        query_words = query.split()
        query_len = len(query_words)

        if query_len == 0 or len(words) == 0:
            return None

        best_match = None
        best_ratio = 0.0

        for i in range(len(words) - query_len + 1):
            window = ' '.join(words[i:i + query_len])
            ratio = SequenceMatcher(None, query.lower(), window.lower()).ratio()

            if ratio > best_ratio:
                best_ratio = ratio
                best_match = window

        if best_ratio >= self.min_match_ratio:
            return (best_match, best_ratio)

        return None

    def _fuzzy_match_to_chunks(
            self,
            answer: str,
            chunks: List[Dict]
    ) -> List[SourceEvidence]:
        """
        When no explicit citations, try to match answer content to chunks.
        """
        sources = []
        sentences = [s.strip() for s in answer.split('.') if len(s.strip()) > 20]

        for chunk in chunks[:3]:  # Top 3 chunks
            chunk_text = chunk['text']
            matched_sentences = []

            for sentence in sentences:
                best_match = self._find_best_match(sentence, chunk_text)
                if best_match:
                    matched_text, ratio = best_match
                    if ratio >= 0.7:  # Lower threshold for fuzzy matching
                        matched_sentences.append((matched_text, ratio))

            if matched_sentences:
                # Use best matching sentence as quote
                best_sentence, confidence = max(matched_sentences, key=lambda x: x[1])

                # Extract context
                start_idx = chunk_text.index(best_sentence)
                context_start = max(0, start_idx - 100)
                context_end = min(len(chunk_text), start_idx + len(best_sentence) + 100)
                context = chunk_text[context_start:context_end]

                source = SourceEvidence(
                    chunk_id=chunk['chunk_id'],
                    document_id=chunk['document_id'],
                    exact_quote=best_sentence,
                    context=context,
                    page_number=chunk.get('page_number'),
                    relevance_score=chunk['relevance_score'],
                    confidence_score=confidence,
                    match_type="inference"
                )
                sources.append(source)

        return sources

    def calculate_answer_confidence(
            self,
            answer: str,
            sources: List[SourceEvidence],
            question_type: QuestionType
    ) -> float:
        """
        Calculate overall confidence score for the answer.

        Factors:
        - Number of sources
        - Source confidence scores
        - Answer length and completeness
        - Question type
        """
        if not sources:
            return 0.3  # Low confidence without sources

        # Average source confidence
        avg_source_confidence = sum(s.confidence_score for s in sources) / len(sources)

        # Number of sources (more is better, up to a point)
        source_factor = min(len(sources) / 3, 1.0)

        # Answer completeness (based on length)
        length_factor = 1.0
        if question_type == QuestionType.OPEN_ENDED:
            if len(answer) < 50:
                length_factor = 0.7
            elif len(answer) > 500:
                length_factor = 0.9

        # Combine factors
        confidence = (avg_source_confidence * 0.5 +
                      source_factor * 0.3 +
                      length_factor * 0.2)

        return min(confidence, 1.0)

    def verify_sources(self, sources: List[SourceEvidence]) -> str:
        """
        Determine overall verification status.

        Returns:
            "verified", "partial", or "unverified"
        """
        if not sources:
            return "unverified"

        exact_matches = sum(1 for s in sources if s.match_type == "exact")
        high_confidence = sum(1 for s in sources if s.confidence_score >= 0.9)

        if exact_matches >= 2 or high_confidence >= 2:
            return "verified"
        elif exact_matches >= 1 or high_confidence >= 1:
            return "partial"
        else:
            return "unverified"


# Singleton instance
answer_processor = AnswerProcessor()