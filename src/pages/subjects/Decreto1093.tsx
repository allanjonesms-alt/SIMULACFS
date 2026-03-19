import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question } from '../../types';

interface Decreto1093Props {
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview?: (q: Question) => void;
  onEdit?: (q: Question) => void;
  onDelete?: (q: Question) => void;
  onAdd?: () => void;
  isAdmin?: boolean;
}

const Decreto1093: React.FC<Decreto1093Props> = (props) => {
  return <SubjectPage law="Decreto 1.093/81" {...props} />;
};

export default Decreto1093;
