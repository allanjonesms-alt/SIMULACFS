export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  isActive: boolean;
  isUpgraded: boolean;
  upgradedAt?: any;
  anonymousName: string;
  phone?: string;
}

export interface Question {
  id: string;
  text: string;
  options: (string | null)[];
  correctOption: number;
  category?: string;
  law?: string;
  justification?: string;
  difficulty?: number;
  totalRatings?: number;
  sumOfRatings?: number;
  totalResponses?: number;
  totalCorrects?: number;
  createdAt: any;
}

export interface QuestionError {
  id: string;
  questionId: string;
  questionText: string;
  userId: string;
  userEmail: string;
  description: string;
  status: 'pending' | 'resolved';
  solution?: string;
  createdAt: any;
}

export interface SimulationResult {
  id: string;
  userId: string;
  score: number;
  totalQuestions: number;
  date: any;
  anonymousName: string;
  elapsedTime: number;
  subjectScores?: Record<string, { correct: number; total: number }>;
  diff?: number;
  isMiniSimulado?: boolean;
  questions?: any[]; // Array of questions
  answers?: number[]; // Array of user answers
}

export const calculateDifficulty = (q: any, currentUserRating?: number): number => {
  const initial = q.difficulty || 0;
  const totalResponses = q.totalResponses || 0;
  
  // Se não houver dados de desempenho nem avaliações, retorna a dificuldade inicial
  if (totalResponses === 0 && currentUserRating === undefined && (q.totalRatings || 0) === 0) {
    return initial;
  }

  const c = totalResponses > 0 ? (q.totalCorrects || 0) / totalResponses : 0;
  const aa = 5 - (c * 5);
  
  let userRating = currentUserRating;
  if (userRating === undefined) {
    userRating = (q.totalRatings || 0) > 0 ? (q.sumOfRatings || 0) / q.totalRatings : 0;
  }
  
  return (initial + aa + userRating) / 3;
};

export interface UpgradeRequest {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  createdAt: any;
  isNew: boolean;
}

export interface MindMap {
  id: string;
  subject: string;
  content: string; // HTML content
  questionNumber?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface CutoffPollData {
  id: string;
  userId: string;
  score: number;
  createdAt: any;
}
