import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question } from '../../types';

interface ConselhoDisciplinaProps {
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview?: (q: Question) => void;
  onEdit?: (q: Question) => void;
  onDelete?: (q: Question) => void;
  onAdd?: () => void;
  isAdmin?: boolean;
}

const ConselhoDisciplina: React.FC<ConselhoDisciplinaProps> = (props) => {
  return <SubjectPage law="Conselho de Disciplina" {...props} />;
};

export default ConselhoDisciplina;
