import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question } from '../../types';

interface Lei053Props {
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview?: (q: Question) => void;
  onEdit?: (q: Question) => void;
  onDelete?: (q: Question) => void;
  onAdd?: () => void;
  isAdmin?: boolean;
}

const Lei053: React.FC<Lei053Props> = (props) => {
  return <SubjectPage law="Lei 053/1990" {...props} />;
};

export default Lei053;
