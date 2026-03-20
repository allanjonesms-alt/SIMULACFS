import React from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

const ContatoPage: React.FC = () => {
  return (
    <motion.div key="contato" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Entre em contato</h2>
      <a 
        href="https://wa.me/5567984373039" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-4 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-200"
      >
        <MessageCircle className="w-8 h-8" />
        WhatsApp: (67) 98437-3039
      </a>
    </motion.div>
  );
};

export default ContatoPage;
