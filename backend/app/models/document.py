from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    """Document processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentMetadata(BaseModel):
    """Metadata for uploaded documents."""
    filename: str
    file_type: str
    file_size: int
    upload_date: datetime = Field(default_factory=datetime.now)
    page_count: Optional[int] = None
    total_chunks: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentChunk(BaseModel):
    """A chunk of text extracted from a document."""
    chunk_id: str
    document_id: str
    text: str
    page_number: Optional[int] = None
    chunk_index: int
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    """Response for document upload."""
    document_id: str
    filename: str
    status: DocumentStatus
    message: str
    metadata: Optional[DocumentMetadata] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentProcessingResult(BaseModel):
    """Result of document processing."""
    document_id: str
    status: DocumentStatus
    chunks_created: int
    embeddings_generated: int
    processing_time: float
    error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)