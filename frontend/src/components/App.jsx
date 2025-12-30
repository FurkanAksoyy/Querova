import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Sparkles, Database, Info, Zap, TrendingUp } from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import QuestionUpload from './components/QuestionUpload';
import ResultsView from './components/ResultsView';
import BackgroundEffects from './components/BackgroundEffects';
import { documentAPI, healthCheck } from './services/api';

function App() {
  const [qaResult, setQaResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    checkAPIHealth();
    loadStats();

    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAPIHealth = async () => {
    try {
      await healthCheck();
      setApiStatus('connected');
    } catch (error) {
      setApiStatus('disconnected');
      console.error('API health check failed:', error);
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

  const handleUploadComplete = () => {
    loadStats();
  };

  const handleQuestionsProcessed = (result) => {
    setQaResult(result);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/20 via-transparent to-transparent"></div>
        <BackgroundEffects />
      </div>

      {/* Gradient Orbs */}
      <div className="fixed top-20 left-10 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="fixed top-40 right-10 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="fixed -bottom-8 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#0f172a',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            borderRadius: '16px',
            padding: '16px 20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
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

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 border-b border-white/20 shadow-lg"
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-primary-600 via-purple-600 to-primary-700 p-3.5 rounded-2xl shadow-2xl">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </motion.div>

              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
                  Querova
                </h1>
                <p className="text-sm text-slate-600 font-medium flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI-Powered Document Intelligence</span>
                </p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex items-center space-x-3">
              {/* API Status */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                  apiStatus === 'connected' 
                    ? 'bg-green-100/80 border border-green-300/50 shadow-lg shadow-green-500/20' 
                    : apiStatus === 'disconnected'
                    ? 'bg-red-100/80 border border-red-300/50'
                    : 'bg-amber-100/80 border border-amber-300/50'
                }`}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`w-2.5 h-2.5 rounded-full ${
                    apiStatus === 'connected' ? 'bg-green-500 shadow-lg shadow-green-500/50' :
                    apiStatus === 'disconnected' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`}
                />
                <span className={`text-sm font-semibold ${
                  apiStatus === 'connected' ? 'text-green-700' :
                  apiStatus === 'disconnected' ? 'text-red-700' :
                  'text-amber-700'
                }`}>
                  {apiStatus === 'connected' ? '🟢 Bağlı' :
                   apiStatus === 'disconnected' ? '🔴 Bağlantısız' :
                   '🟡 Kontrol...'}
                </span>
              </motion.div>

              {/* Stats */}
              {stats && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-primary-100/80 to-purple-100/80 backdrop-blur-sm border border-primary-200/50 rounded-xl shadow-lg"
                >
                  <Database className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-bold text-primary-700">
                    {stats.total_chunks}
                  </span>
                  <span className="text-xs text-primary-600">chunks</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 relative z-10">
        {/* API Warning */}
        {apiStatus === 'disconnected' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="glass rounded-2xl p-5 border-2 border-red-300/50 shadow-xl">
              <div className="flex items-start space-x-3">
                <Info className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-red-800 mb-1 text-lg">
                    🚨 Backend Bağlantısı Yok
                  </h3>
                  <p className="text-sm text-red-700 leading-relaxed">
                    Backend sunucusunun çalıştığından emin olun:
                    <code className="ml-2 bg-red-200/50 px-3 py-1 rounded-lg text-xs font-mono">
                      http://localhost:8000
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Document Upload */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="mb-5">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📄</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    1. Belgelerinizi Yükleyin
                  </h2>
                  <p className="text-slate-600 text-sm">
                    PDF, DOCX veya TXT • Max 10MB
                  </p>
                </div>
              </div>
            </div>
            <DocumentUpload onUploadComplete={handleUploadComplete} />
          </motion.div>

          {/* Questions */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="mb-5">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">❓</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    2. Sorularınızı Gönderin
                  </h2>
                  <p className="text-slate-600 text-sm">
                    Manuel soru veya JSON yükleyin
                  </p>
                </div>
              </div>
            </div>
            <QuestionUpload onQuestionsProcessed={handleQuestionsProcessed} />
          </motion.div>
        </div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="mb-5">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  3. Sonuçları İnceleyin
                </h2>
                <p className="text-slate-600 text-sm">
                  AI destekli cevaplar ve kaynak gösterimi
                </p>
              </div>
            </div>
          </div>
          <ResultsView qaResult={qaResult} />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-sm bg-white/40 border-t border-white/20 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="flex items-center space-x-2 text-sm text-slate-600">
              <span>Built with</span>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-red-500"
              >
                ❤️
              </motion.span>
              <span>using FastAPI & ChromaDB </span>
            </p>
            <div className="flex items-center space-x-4">
              <span className="font-bold text-slate-700">Querova v0.1.0</span>
              <span className="px-3 py-1.5 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-full text-xs font-bold shadow-lg">
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