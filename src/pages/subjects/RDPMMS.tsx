import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question } from '../../types';

interface RDPMMSProps {
  questions: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview?: (q: Question) => void;
  onEdit?: (q: Question) => void;
  onDelete?: (q: Question) => void;
  onAdd?: () => void;
  isAdmin?: boolean;
}

const RDPMMS: React.FC<RDPMMSProps> = (props) => {
  return <SubjectPage law="RDPMMS" {...props} />;
};

export default RDPMMS;
