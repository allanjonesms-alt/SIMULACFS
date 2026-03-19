import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question } from '../../types';

interface Lei1102Props {
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview?: (q: Question) => void;
  onEdit?: (q: Question) => void;
  onDelete?: (q: Question) => void;
  onAdd?: () => void;
  isAdmin?: boolean;
}

const Lei1102: React.FC<Lei1102Props> = (props) => {
  return <SubjectPage law="Lei 1.102/90" {...props} />;
};

export default Lei1102;
