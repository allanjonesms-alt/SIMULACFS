export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  isActive: boolean;
  isUpgraded: boolean;
  anonymousName: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  category?: string;
  law?: string;
  justification?: string;
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
}
