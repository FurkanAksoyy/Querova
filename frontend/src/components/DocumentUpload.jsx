import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentAPI } from '../services/api';
import { cn } from '../utils/helpers';

export default function DocumentUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await documentAPI.list();
      setUploadedFiles(docs.map(doc => ({
        document_id: doc.document_id,
        name: `Belge (${doc.chunk_count} chunk)`,
        status: 'success',
        chunk_count: doc.chunk_count
      })));
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(file => {
      const error = file.errors[0];
      if (error.code === 'file-too-large') {
        toast.error(`${file.file.name}: Dosya çok büyük (max 10MB)`);
      } else if (error.code === 'file-invalid-type') {
        toast.error(`${file.file.name}: Desteklenmeyen format`);
      }
    });

    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const results = [];

    for (const file of acceptedFiles) {
      try {
        const result = await documentAPI.upload(file);
        results.push({
          document_id: result.document_id,
          name: file.name,
          status: 'success',
          data: result,
          chunk_count: result.metadata?.total_chunks || 0
        });
        toast.success(`✅ ${file.name} yüklendi!`, {
          icon: '📄',
        });
      } catch (error) {
        results.push({
          name: file.name,
          status: 'error',
          error: error.response?.data?.detail || 'Yükleme hatası',
        });
        toast.error(`❌ ${file.name} yüklenemedi`);
      }
    }

    setUploadedFiles((prev) => [...results, ...prev]);
    setUploading(false);

    if (onUploadComplete) {
      onUploadComplete(results);
    }
  }, [onUploadComplete]);

  const handleDelete = async (documentId, fileName) => {
    if (!confirm(`"${fileName}" belgesini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await documentAPI.delete(documentId);
      setUploadedFiles(prev => prev.filter(f => f.document_id !== documentId));
      toast.success('🗑️ Belge silindi');
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      toast.error('❌ Silme başarısız');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: uploading,
  });

  return (
    <div className="space-y-5">
      {/* Upload Zone */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        {...getRootProps()}
        className={cn(
          'glass cursor-pointer transition-all duration-300 p-8 rounded-2xl group relative overflow-hidden',
          'border-2 border-dashed',
          isDragActive
            ? 'border-primary-500 bg-primary-50/50 shadow-2xl scale-[1.02]'
            : 'border-slate-300 hover:border-primary-400 hover:shadow-xl',
          uploading && 'opacity-60 pointer-events-none'
        )}
      >
        <input {...getInputProps()} />

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer"></div>
        </div>

        <div className="relative flex flex-col items-center justify-center space-y-4">
          {uploading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Loader2 className="w-20 h-20 text-primary-500" />
              </motion.div>
              <p className="text-lg font-semibold text-slate-700">
                Belgeler İşleniyor...
              </p>
              <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </>
          ) : (
            <>
              <motion.div
                animate={{
                  y: isDragActive ? [0, -10, 0] : 0,
                  scale: isDragActive ? 1.1 : 1
                }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <Upload className={cn(
                  'w-20 h-20 transition-all duration-300',
                  isDragActive
                    ? 'text-primary-600'
                    : 'text-slate-400 group-hover:text-primary-500'
                )} />
                {isDragActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute inset-0 border-4 border-primary-500 rounded-full"
                  />
                )}
              </motion.div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {isDragActive ? '📂 Dosyaları Buraya Bırakın' : '📤 Belgelerinizi Yükleyin'}
                </h3>
                <p className="text-slate-600 mb-1">
                  {isDragActive ? 'Hemen yüklenecek!' : 'Sürükle-bırak veya tıklayın'}
                </p>
                <p className="text-sm text-slate-500">
                  <span className="font-semibold">PDF, DOCX, TXT</span> • Max 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-lg flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <span>Yüklenen Belgeler</span>
              </h4>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                {uploadedFiles.length} belge
              </span>
            </div>

            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={file.document_id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl hover:shadow-md transition-all duration-300 group border border-slate-200"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      file.status === 'success'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-red-100 text-red-600'
                    )}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {file.name}
                      </p>
                      {file.chunk_count && (
                        <p className="text-xs text-slate-600 flex items-center space-x-1">
                          <span>📊</span>
                          <span>{file.chunk_count} chunk oluşturuldu</span>
                        </p>
                      )}
                      {file.error && (
                        <p className="text-xs text-red-600 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{file.error}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {file.status === 'success' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        {file.document_id && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(file.document_id, file.name)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Belgeyi sil"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </motion.button>
                        )}
                      </>
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}