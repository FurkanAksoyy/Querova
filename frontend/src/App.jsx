import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sparkles, Database, Info, Zap } from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import QuestionUpload from './components/QuestionUpload';
import ResultsView from './components/ResultsView';
import { documentAPI, healthCheck } from './services/api';

function App() {
  const [qaResult, setQaResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    checkAPIHealth();
    loadStats();
  }, []);

  const checkAPIHealth = async () => {
    try {
      await healthCheck();
      setApiStatus('connected');
    } catch (error) {
      setApiStatus('disconnected');
    }
  };

  const loadStats = async () => {
    try {
      const data = await documentAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleUploadComplete = (results) => {
    loadStats();
  };

  const handleQuestionsProcessed = (result) => {
    setQaResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#0f172a',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Header with Gradient */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-primary-600 to-primary-700 p-3 rounded-2xl shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-purple-600 bg-clip-text text-transparent">
                  Querova
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  AI-Powered Document Intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* API Status Badge */}
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                apiStatus === 'connected' 
                  ? 'bg-green-50 border border-green-200' 
                  : apiStatus === 'disconnected'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  apiStatus === 'connected' ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                  apiStatus === 'disconnected' ? 'bg-red-500' :
                  'bg-amber-500 animate-pulse'
                }`} />
                <span className={`text-sm font-medium ${
                  apiStatus === 'connected' ? 'text-green-700' :
                  apiStatus === 'disconnected' ? 'text-red-700' :
                  'text-amber-700'
                }`}>
                  {apiStatus === 'connected' ? 'API Bağlı' :
                   apiStatus === 'disconnected' ? 'API Bağlantısız' :
                   'Kontrol ediliyor...'}
                </span>
              </div>

              {/* Stats Badge */}
              {stats && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-xl">
                  <Database className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-semibold text-primary-700">
                    {stats.total_chunks} chunks
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* API Disconnect Warning */}
        {apiStatus === 'disconnected' && (
          <div className="mb-6 animate-slide-down">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">
                    🚨 API Bağlantısı Kurulamadı
                  </h3>
                  <p className="text-sm text-red-700">
                    Backend sunucusunun çalıştığından emin olun:
                    <code className="ml-2 bg-red-100 px-2 py-1 rounded text-xs font-mono">
                      http://localhost:8000
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Document Upload Section */}
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📄</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    1. Belgelerinizi Yükleyin
                  </h2>
                  <p className="text-slate-600 text-sm">
                    PDF, DOCX veya TXT formatında
                  </p>
                </div>
              </div>
            </div>
            <DocumentUpload onUploadComplete={handleUploadComplete} />
          </div>

          {/* Question Upload Section */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">❓</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    2. Sorularınızı Gönderin
                  </h2>
                  <p className="text-slate-600 text-sm">
                    JSON veya manuel soru
                  </p>
                </div>
              </div>
            </div>
            <QuestionUpload onQuestionsProcessed={handleQuestionsProcessed} />
          </div>
        </div>

        {/* Results Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  3. Sonuçları İnceleyin
                </h2>
                <p className="text-slate-600 text-sm">
                  AI destekli cevaplar ve kaynak referansları
                </p>
              </div>
            </div>
          </div>
          <ResultsView qaResult={qaResult} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-200/60 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
            <p className="flex items-center space-x-2">
              <span>Built with</span>
              <span className="text-red-500">❤️</span>
              <span>using FastAPI & ChromaDB</span>
            </p>
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-slate-700">Querova v0.1.0</span>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                MVP
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;