import React, { useState, useMemo } from 'react';
import { Question } from '../types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Star, Download, Play, Settings, XCircle, ChevronLeft, Search } from 'lucide-react';

interface SubjectPageProps {
  law: string;
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview?: (q: Question) => void;
  onEdit?: (q: Question) => void;
  onDelete?: (q: Question) => void;
  onAdd?: () => void;
  disableLawFilter?: boolean;
  isAdmin?: boolean;
}

const SubjectPage: React.FC<SubjectPageProps> = ({
  law,
  questions,
  onBack,
  onDownloadPDF,
  onPreview,
  onEdit,
  onDelete,
  onAdd,
  disableLawFilter = false,
  isAdmin = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuestions = useMemo(() => {
    let filtered = disableLawFilter ? questions : questions.filter(q => (q.law || q.category || 'Sem Matéria') === law);
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(q => q.text.toLowerCase().includes(lowerSearch));
    }
    return filtered;
  }, [questions, law, searchTerm, disableLawFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{law}</h2>
            <p className="text-slate-500 font-medium">
              {filteredQuestions.length} questões encontradas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && onAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
            >
              <PlusCircle className="w-5 h-5" />
              Nova Questão
            </button>
          )}
          <button 
            onClick={() => onDownloadPDF(law)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-5 h-5" />
            Baixar PDF
          </button>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar no enunciado da questão..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredQuestions.map((q, index) => (
          <div key={q.id} className={`p-6 rounded-3xl border border-slate-200 shadow-sm group transition-colors ${(!q.justification || q.justification.trim() === '') ? 'bg-orange-500/70' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase">
                    #{index + 1}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase">
                    ID: {q.id.slice(0, 5)}
                  </span>
                  {q.category && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">
                      {q.category}
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          (q.difficulty || 0) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="font-bold text-slate-900 whitespace-pre-wrap" translate="no">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>{q.text}</ReactMarkdown>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onPreview && (
                    <button 
                      onClick={() => onPreview(q)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  {onEdit && (
                    <button 
                      onClick={() => onEdit(q)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={() => onDelete(q)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, i) => (
                <div key={i} className={`p-3 rounded-xl border text-sm ${i === q.correctOption ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`} translate="no">
                  {String.fromCharCode(65 + i)}) {opt}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import { PlusCircle } from 'lucide-react';

export default SubjectPage;
