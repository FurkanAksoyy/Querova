import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Upload, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { questionsAPI } from '../services/api';
import { cn } from '../utils/helpers';

export default function QuestionUpload({ onQuestionsProcessed }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'json'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Lütfen bir soru yazın!');
      return;
    }

    setLoading(true);
    try {
      const result = await questionsAPI.askSingle(question);
      toast.success('✅ Soru cevaplandı!', { icon: '🤖' });

      if (onQuestionsProcessed) {
        onQuestionsProcessed({
          batch_id: Date.now().toString(),
          total_questions: 1,
          completed: 1,
          failed: 0,
          results: [result],
          total_processing_time: result.processing_time,
          timestamp: new Date().toISOString()
        });
      }
      setQuestion('');
    } catch (error) {
      toast.error('❌ Hata oluştu: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleJSONUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Sadece .json dosyaları destekleniyor!');
      return;
    }

    setLoading(true);
    try {
      const result = await questionsAPI.uploadJSON(file);
      toast.success(`✅ ${result.completed} soru cevaplandı!`);

      if (onQuestionsProcessed) {
        onQuestionsProcessed(result);
      }
    } catch (error) {
      toast.error('❌ JSON yükleme hatası: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Tab Selector */}
      <div className="flex space-x-2 p-1 bg-slate-100 rounded-xl">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('manual')}
          className={cn(
            'flex-1 py-3 rounded-lg font-semibold transition-all duration-300',
            activeTab === 'manual'
              ? 'bg-white text-primary-600 shadow-lg'
              : 'text-slate-600 hover:text-slate-800'
          )}
        >
          <span className="flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Manuel Soru</span>
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('json')}
          className={cn(
            'flex-1 py-3 rounded-lg font-semibold transition-all duration-300',
            activeTab === 'json'
              ? 'bg-white text-primary-600 shadow-lg'
              : 'text-slate-600 hover:text-slate-800'
          )}
        >
          <span className="flex items-center justify-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>JSON Yükle</span>
          </span>
        </motion.button>
      </div>

      {/* Manual Question Form */}
      {activeTab === 'manual' && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Sorunuzu Yazın
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Örn: Bu belgedeki ana konular nelerdir?"
              className={cn(
                'w-full px-4 py-3 rounded-xl border-2 transition-all duration-300',
                'focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20',
                'min-h-[120px] resize-none bg-white/50',
                'placeholder:text-slate-400',
                loading && 'opacity-50 cursor-not-allowed'
              )}
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-2">
              💡 İpucu: Spesifik ve net sorular daha iyi sonuçlar verir
            </p>
          </div>

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="submit"
            disabled={loading || !question.trim()}
            className={cn(
              'w-full py-4 rounded-xl font-bold text-white transition-all duration-300',
              'flex items-center justify-center space-x-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              loading
                ? 'bg-slate-400'
                : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:shadow-2xl hover:shadow-primary-500/50'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>İşleniyor...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Soruyu Gönder</span>
              </>
            )}
          </motion.button>
        </motion.form>
      )}

      {/* JSON Upload */}
      {activeTab === 'json' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="glass border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleJSONUpload}
              disabled={loading}
              className="hidden"
              id="json-upload"
            />
            <label
              htmlFor="json-upload"
              className="cursor-pointer block"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4"
              >
                {loading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-white" />
                )}
              </motion.div>

              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {loading ? 'JSON İşleniyor...' : 'JSON Dosyası Yükle'}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Sorularınızı içeren .json dosyasını seçin
              </p>

              <div className="inline-block px-6 py-3 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold">
                📁 Dosya Seç
              </div>
            </label>
          </div>

          {/* JSON Format Example */}
          <details className="glass rounded-xl p-4">
            <summary className="cursor-pointer font-semibold text-slate-700 flex items-center space-x-2">
              <span>📋 JSON Format Örneği</span>
            </summary>
            <pre className="mt-3 p-4 bg-slate-900 text-green-400 rounded-lg text-xs overflow-x-auto font-mono">
{`{
  "questions": [
    {
      "id": "q1",
      "text": "Bu belge neyi anlatıyor?"
    },
    {
      "id": "q2",
      "text": "Ana konular nelerdir?"
    }
  ]
}`}
            </pre>
          </details>
        </motion.div>
      )}
    </div>
  );
}