from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List
import uuid
import time
import logging

from app.models.document import DocumentUploadResponse, DocumentProcessingResult, DocumentStatus
from app.services.document_processor import document_processor
from app.services.vector_store import vector_store
from app.services.gemini_service import gemini_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document.

    Steps:
    1. Validate file type and size
    2. Save file to disk
    3. Extract and chunk text
    4. Generate embeddings
    5. Store in ChromaDB
    """
    try:
        # Validate file extension
        file_extension = file.filename.split('.')[-1].lower()
        if f".{file_extension}" not in settings.allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type. Allowed: {settings.allowed_extensions}"
            )

        # Read file content
        content = await file.read()

        # Validate file size
        if len(content) > settings.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Max size: {settings.max_file_size} bytes"
            )

        # Generate document ID
        document_id = str(uuid.uuid4())

        # Save file
        file_path = document_processor.save_uploaded_file(content, file.filename)

        logger.info(f"Processing document: {document_id} - {file.filename}")

        # Process document in background (for now, synchronously)
        chunks, metadata = await document_processor.process_document(file_path, document_id)

        # Generate embeddings
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = await gemini_service.generate_embeddings_batch(chunk_texts)

        # Store in ChromaDB
        vector_store.add_chunks(chunks, embeddings)

        return DocumentUploadResponse(
            document_id=document_id,
            filename=file.filename,
            status=DocumentStatus.COMPLETED,
            message=f"Document processed successfully. {len(chunks)} chunks created.",
            metadata=metadata
        )

    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )


@router.get("/stats")
async def get_stats():
    """Get statistics about stored documents."""
    try:
        stats = vector_store.get_collection_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its chunks."""
    try:
        # Delete from vector store
        success = vector_store.delete_by_document_id(document_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        logger.info(f"Document deleted: {document_id}")
        return {"message": "Document deleted successfully", "document_id": document_id}

    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/list", response_model=List[dict])
async def list_documents():
    """List all uploaded documents with metadata."""
    try:
        stats = vector_store.get_collection_stats()

        # Get unique document IDs from ChromaDB
        collection = vector_store.collection
        results = collection.get()

        docs = {}
        for metadata in results['metadatas']:
            doc_id = metadata.get('document_id')
            if doc_id and doc_id not in docs:
                docs[doc_id] = {
                    'document_id': doc_id,
                    'chunk_count': 0,
                    'first_seen': metadata.get('upload_date', 'Unknown')
                }
            if doc_id:
                docs[doc_id]['chunk_count'] += 1

        return list(docs.values())
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )