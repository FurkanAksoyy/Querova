import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Document API
export const documentAPI = {
  list: async () => {
      const response = await api.get('/documents/list');
      return response.data;
    },

  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);


    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/documents/stats');
    return response.data;
  },

  delete: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },
};

// Questions API
export const questionsAPI = {
  uploadJSON: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    if (options.top_k) params.append('top_k', options.top_k);
    if (options.min_relevance_score) params.append('min_relevance_score', options.min_relevance_score);

    const response = await api.post(`/questions/upload-json?${params.toString()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  askSingle: async (question, options = {}) => {
    const params = new URLSearchParams({ question });
    if (options.top_k) params.append('top_k', options.top_k);
    if (options.document_ids) {
      options.document_ids.forEach(id => params.append('document_ids', id));
    }

    const response = await api.post(`/questions/single?${params.toString()}`);
    return response.data;
  },

  processBatch: async (questions, options = {}) => {
    const response = await api.post('/questions/process', {
      questions,
      ...options,
    });
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health', { baseURL: 'http://localhost:8000' });
    return response.data;
  } catch (error) {
    throw new Error('API is not reachable');
  }
};

export default api;