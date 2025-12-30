"""
Agent Service Module - Placeholder

This module is not used in the current MVP implementation.
The Q&A functionality is handled directly by gemini_service.py

If you want to add agentic behavior later, implement it here.
"""

import logging

logger = logging.getLogger(__name__)


class AgentService:
    """Placeholder for future agentic functionality."""

    def __init__(self):
        logger.info("AgentService initialized (placeholder)")

    async def process_query(self, query: str):
        """Process a query using agentic approach."""
        raise NotImplementedError("Agent service not yet implemented")


# Singleton instance
agent_service = AgentService()