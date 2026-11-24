export interface Question {
  id?: number;
  categoryId: number;
  question: string;
  answer: string;
  acceptedAnswers?: string[];
  isBookmarked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
