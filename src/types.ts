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

export const calculateDifficulty = (q: any): number => {
  const totalResponses = q.totalResponses || 0;
  if (totalResponses === 0) return q.difficulty || 0;

  const c = (q.totalCorrects || 0) / totalResponses;
  const aa = 5 - (c * 5);
  
  const totalRatings = (q.totalRatings || 0) + 1; // +1 for the automatic assessment
  const sumOfRatings = (q.sumOfRatings || 0) + aa;
  
  return Math.round(sumOfRatings / totalRatings);
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
  createdAt: any;
  updatedAt?: any;
}
