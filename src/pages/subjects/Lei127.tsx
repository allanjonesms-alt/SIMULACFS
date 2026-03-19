import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question } from '../../types';

interface Lei127Props {
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview: (q: Question) => void;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
  onAdd: () => void;
}

const Lei127: React.FC<Lei127Props> = (props) => {
  return <SubjectPage law="Lei 127/2008" {...props} />;
};

export default Lei127;
