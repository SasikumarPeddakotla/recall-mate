export interface Question {
  id?: number;
  categoryId: number;
  question: string;
  answer: string;
  acceptedAnswers?: string[];
  createdAt: Date;
  updatedAt: Date;
}
