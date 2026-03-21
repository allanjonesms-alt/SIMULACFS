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
  options: string[];
  correctOption: number;
  category?: string;
  law?: string;
  justification?: string;
  difficulty?: number;
  totalRatings?: number;
  sumOfRatings?: number;
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
}
