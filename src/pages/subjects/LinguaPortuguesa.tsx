import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question } from '../../types';

interface LinguaPortuguesaProps {
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview: (q: Question) => void;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
  onAdd: () => void;
}

const LinguaPortuguesa: React.FC<LinguaPortuguesaProps> = (props) => {
  return <SubjectPage law="Língua Portuguesa" {...props} />;
};

export default LinguaPortuguesa;
