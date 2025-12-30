import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Quote,
  FileSearch
} from 'lucide-react';

function VerificationBadge({ status }) {
  const configs = {
    verified: {
      icon: ShieldCheck,
      text: 'Doğrulanmış',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300'
    },
    partial: {
      icon: ShieldAlert,
      text: 'Kısmen Doğrulanmış',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-300'
    },
    unverified: {
      icon: ShieldQuestion,
      text: 'Doğrulanmamış',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-700',
      borderColor: 'border-slate-300'
    }
  };

  const config = configs[status] || configs.unverified;
  const Icon = config.icon;

  return (
    <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <Icon className={`w-4 h-4 ${config.textColor}`} />
      <span className={`text-xs font-semibold ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
}

function MatchTypeBadge({ matchType }) {
  const configs = {
    exact: {
      text: 'Tam Eşleşme',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700'
    },
    paraphrase: {
      text: 'Parafraz',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    inference: {
      text: 'Çıkarım',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700'
    }
  };

  const config = configs[matchType] || configs.inference;

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      {config.text}
    </span>
  );
}

function EnhancedSourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {index + 1}
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-700">Kaynak {index + 1}</span>
            <div className="flex items-center space-x-2 mt-1">
              <MatchTypeBadge matchType={source.match_type} />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold text-amber-700">
              {(source.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Exact Quote */}
      <div className="mb-3 p-3 bg-white rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2 mb-2">
          <Quote className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-blue-700">Alıntı:</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed italic">
          "{source.exact_quote}"
        </p>
      </div>

      {/* Context (Expandable) */}
      {source.context && source.context !== source.exact_quote && (
        <div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-1 text-xs text-slate-600 hover:text-blue-600 font-medium mb-2"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>{expanded ? 'Bağlamı Gizle' : 'Bağlamı Göster'}</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </motion.button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {source.context}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 text-xs">
        <span className="text-slate-500">
          {source.page_number ? `📄 Sayfa ${source.page_number}` : '📄 Sayfa N/A'}
        </span>
        <span className="text-slate-400 font-mono text-[10px]">
          {source.chunk_id.slice(0, 8)}...
        </span>
      </div>
    </motion.div>
  );
}

function QuestionCard({ result }) {
  const [expanded, setExpanded] = useState(true);

  const getQuestionTypeLabel = (type) => {
    const labels = {
      open_ended: '📝 Açık Uçlu',
      multiple_choice: '✅ Çoktan Seçmeli',
      true_false: '⚖️ Doğru/Yanlış',
      short_answer: '💬 Kısa Cevap'
    };
    return labels[type] || '❓ Soru';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-white/20"
    >
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-sm font-semibold text-primary-600 bg-primary-100 px-3 py-1 rounded-full">
                {getQuestionTypeLabel(result.question_type)}
              </span>
              <VerificationBadge status={result.verification_status} />
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-3 leading-relaxed">
              {result.question_text}
            </h3>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1.5 text-slate-600">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{result.processing_time.toFixed(2)}s</span>
              </div>

              {result.confidence_score > 0 && (
                <div className="flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-amber-600">
                    {(result.confidence_score * 100).toFixed(0)}% güven
                  </span>
                </div>
              )}

              <span className="text-slate-500">
                📚 {result.sources.length} kaynak
              </span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2"
          >
            {expanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-6 pb-6 space-y-5 border-t border-white/20"
          >
            {/* Answer */}
            <div className="mt-5 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 shadow-inner">
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
                  💡
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-blue-900 mb-2">Cevap</h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {result.answer}
                  </p>
                </div>
              </div>
            </div>

            {/* Reasoning Steps */}
            {result.reasoning_steps && result.reasoning_steps.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h4 className="text-sm font-bold text-purple-900 mb-3 flex items-center space-x-2">
                  <span>🧠</span>
                  <span>Adım Adım Akıl Yürütme</span>
                </h4>
                <ol className="space-y-2">
                  {result.reasoning_steps.map((step, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start space-x-3"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700 leading-relaxed flex-1">
                        {step}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            )}

            {/* Sources */}
            {result.sources.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Doğrulanmış Kaynaklar</span>
                  <span className="text-sm font-normal text-slate-500">
                    ({result.sources.length} belge bölümü)
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.sources.map((source, index) => (
                    <EnhancedSourceCard key={index} source={source} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Footer Metadata */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
              <div className="flex items-center space-x-4">
                <span>🤖 Model: {result.model_used}</span>
                {result.selected_option_id && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
                    Seçilen: {result.selected_option_id}
                  </span>
                )}
              </div>
              <span className="font-mono text-slate-400">
                ID: {result.question_id.slice(0, 12)}...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResultsView({ qaResult }) {
  if (!qaResult) {
    return (
      <div className="glass rounded-2xl p-16 text-center">
        <FileText className="w-24 h-24 text-slate-300 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-slate-600 mb-3">
          Henüz sonuç yok
        </h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Yukarıdaki adımları takip ederek belge yükleyin ve soru sorun.
          Gelişmiş kaynak doğrulama sistemi ile güvenilir cevaplar alın.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl shadow-2xl p-6 border border-white/20"
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Sonuç Özeti
          </span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <p className="text-blue-600 text-sm font-semibold mb-1">Toplam Soru</p>
            <p className="text-4xl font-bold text-blue-700">{qaResult.total_questions}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <p className="text-green-600 text-sm font-semibold mb-1">Tamamlandı</p>
            <p className="text-4xl font-bold text-green-700">{qaResult.completed}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
            <p className="text-red-600 text-sm font-semibold mb-1">Başarısız</p>
            <p className="text-4xl font-bold text-red-700">{qaResult.failed}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <p className="text-purple-600 text-sm font-semibold mb-1">Toplam Süre</p>
            <p className="text-4xl font-bold text-purple-700">
              {qaResult.total_processing_time.toFixed(1)}s
            </p>
          </div>
        </div>
      </motion.div>

      {/* Results List */}
      <div className="space-y-5">
        {qaResult.results.map((result, index) => (
          <QuestionCard key={result.question_id || index} result={result} />
        ))}
      </div>
    </div>
  );
}