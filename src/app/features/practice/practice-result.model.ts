import { Question } from '../../core/database/models/question.model';

export type PracticeResultStatus = 'correct' | 'incorrect' | 'skipped';

export interface PracticeResult {
  question: Question;
  userAnswer: string;
  status: PracticeResultStatus;
}
