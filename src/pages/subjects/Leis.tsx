import React from 'react';
import SubjectPage from '../../components/SubjectPage';
import { Question, UserProfile } from '../../types';

interface LeisProps {
  questions?: Question[];
  onBack: () => void;
  onDownloadPDF: (law: string) => void;
  onPreview: (q: Question) => void;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
  onAdd: () => void;
  isAdmin?: boolean;
  profile: UserProfile | null;
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: { title: string; message: React.ReactNode; onConfirm: () => void } | null) => void;
}

const Leis: React.FC<LeisProps> = (props) => {
  return <SubjectPage law="Provas Anteriores" {...props} />;
};

export default Leis;
