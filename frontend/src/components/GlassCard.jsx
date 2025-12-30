import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}