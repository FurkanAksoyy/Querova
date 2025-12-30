"""
ChromaDB Vector Store Service
"""
import logging
from typing import List, Dict, Any, Optional
import chromadb

from app.config import settings
from app.models.document import DocumentChunk

logger = logging.getLogger(__name__)


class VectorStoreService:
    """
    ChromaDB vector store wrapper with enhanced search.

    Features:
    - Document chunk storage with embeddings
    - Similarity search
    - Metadata filtering
    - Collection statistics
    """

    def __init__(self):
        try:
            # ChromaDB 0.5.x uses PersistentClient
            self.client = chromadb.PersistentClient(
                path=settings.chroma_persist_directory
            )

            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name=settings.chroma_collection_name,
                metadata={"description": "Document chunks for RAG"}
            )

            logger.info(
                f"VectorStoreService initialized: "
                f"collection='{settings.chroma_collection_name}', "
                f"path='{settings.chroma_persist_directory}'"
            )

        except Exception as e:
            logger.error(f"Failed to initialize VectorStoreService: {e}")
            raise

    def add_chunks(
        self,
        chunks: List[DocumentChunk],
        embeddings: List[List[float]]
    ) -> bool:
        """
        Add document chunks with embeddings to vector store.

        Args:
            chunks: List of DocumentChunk objects
            embeddings: Corresponding embedding vectors

        Returns:
            True if successful
        """
        if len(chunks) != len(embeddings):
            raise ValueError("Number of chunks and embeddings must match")

        if not chunks:
            logger.warning("No chunks to add")
            return False

        try:
            # Prepare data for ChromaDB
            ids = [chunk.chunk_id for chunk in chunks]
            documents = [chunk.text for chunk in chunks]
            metadatas = []

            for chunk in chunks:
                metadata = {
                    'document_id': chunk.document_id,
                    'chunk_index': chunk.chunk_index,
                    'page_number': chunk.page_number or 0,
                    **chunk.metadata
                }
                metadatas.append(metadata)

            # Add to collection
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )

            logger.info(f"Added {len(chunks)} chunks to ChromaDB")
            return True

        except Exception as e:
            logger.error(f"Failed to add chunks: {e}")
            raise

    def search(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        document_ids: Optional[List[str]] = None,
        min_score: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Search for similar document chunks.

        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return (renamed from top_k)
            document_ids: Filter by specific document IDs
            min_score: Minimum similarity score threshold

        Returns:
            List of search results with metadata
        """
        try:
            # Build where filter if document_ids specified
            where_filter = None
            if document_ids:
                where_filter = {"document_id": {"$in": document_ids}}

            # Query collection
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter
            )

            # Format results
            formatted_results = []

            if not results['ids'] or not results['ids'][0]:
                logger.info("No search results found")
                return formatted_results

            for i, chunk_id in enumerate(results['ids'][0]):
                distance = results['distances'][0][i]
                metadata = results['metadatas'][0][i]
                document = results['documents'][0][i]

                # Convert distance to similarity score (lower distance = higher similarity)
                # ChromaDB uses L2 distance, convert to 0-1 score
                relevance_score = 1 / (1 + distance)

                # Apply min_score filter
                if relevance_score < min_score:
                    continue

                result = {
                    'chunk_id': chunk_id,
                    'document_id': metadata.get('document_id', ''),
                    'text': document,
                    'page_number': metadata.get('page_number'),
                    'chunk_index': metadata.get('chunk_index', 0),
                    'relevance_score': relevance_score,
                    'distance': distance,
                    'metadata': metadata
                }
                formatted_results.append(result)

            logger.info(f"Search returned {len(formatted_results)} results")
            return formatted_results

        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise

    def delete_by_document_id(self, document_id: str) -> bool:
        """
        Delete all chunks for a specific document.

        Args:
            document_id: Document identifier

        Returns:
            True if successful
        """
        try:
            # Get all chunk IDs for this document
            results = self.collection.get(
                where={"document_id": document_id}
            )

            if not results['ids']:
                logger.warning(f"No chunks found for document {document_id}")
                return False

            # Delete chunks
            self.collection.delete(ids=results['ids'])

            logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete chunks for document {document_id}: {e}")
            raise

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collection.

        Returns:
            Dictionary with stats
        """
        try:
            count = self.collection.count()

            # Get unique document IDs
            all_data = self.collection.get()
            unique_docs = set()
            if all_data['metadatas']:
                for metadata in all_data['metadatas']:
                    doc_id = metadata.get('document_id')
                    if doc_id:
                        unique_docs.add(doc_id)

            stats = {
                'total_chunks': count,
                'total_documents': len(unique_docs),
                'collection_name': self.collection.name
            }

            logger.info(f"Collection stats: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {
                'total_chunks': 0,
                'total_documents': 0,
                'collection_name': self.collection.name
            }

    def clear_collection(self) -> bool:
        """
        Clear all data from collection (use with caution).

        Returns:
            True if successful
        """
        try:
            # Delete collection and recreate
            self.client.delete_collection(name=settings.chroma_collection_name)
            self.collection = self.client.create_collection(
                name=settings.chroma_collection_name,
                metadata={"description": "Document chunks for RAG"}
            )

            logger.warning("Collection cleared - all data deleted!")
            return True

        except Exception as e:
            logger.error(f"Failed to clear collection: {e}")
            return False


# Singleton instance
vector_store = VectorStoreService()