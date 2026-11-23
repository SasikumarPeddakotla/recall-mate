import { Injectable } from '@angular/core';

export interface ImportQuestion {
  question: string;
  answer: string;
  acceptedAnswers: string[];
}

@Injectable({
  providedIn: 'root',
})
export class QuestionImportService {
  validateImportFile(content: string): ImportQuestion[] {
    const data = JSON.parse(content);

    if (
      data?.format !== 'RecallMate' ||
      data?.version !== 1 ||
      !Array.isArray(data.questions)
    ) {
      throw new Error('This is not a valid RecallMate export file.');
    }

    if (data.questions.length === 0) {
      throw new Error('The selected file contains no questions.');
    }

    const parsedQuestions: ImportQuestion[] = [];

    for (let i = 0; i < data.questions.length; i++) {
      const item = data.questions[i];

      if (
        typeof item?.question !== 'string' ||
        !item.question.trim() ||
        typeof item?.answer !== 'string' ||
        !item.answer.trim()
      ) {
        throw new Error(
          `Question ${i + 1} has invalid question or answer text.`,
        );
      }

      const acceptedAnswers = item.acceptedAnswers ?? [];

      if (
        !Array.isArray(acceptedAnswers) ||
        !acceptedAnswers.every((answer: unknown) => typeof answer === 'string')
      ) {
        throw new Error(`Question ${i + 1} has invalid alternative answers.`);
      }

      parsedQuestions.push({
        question: item.question.trim(),
        answer: item.answer.trim(),
        acceptedAnswers: acceptedAnswers
          .map((answer: string) => answer.trim())
          .filter(Boolean),
      });
    }

    return parsedQuestions;
  }

  filterDuplicates(
    importedQuestions: ImportQuestion[],
    existingQuestions: { question: string }[],
  ): {
    uniqueQuestions: ImportQuestion[];
    skippedCount: number;
  } {
    const normalizeQuestion = (question: string): string =>
      question.trim().replace(/\s+/g, ' ').toLowerCase();

    const existingQuestionTexts = new Set(
      existingQuestions.map((item) => normalizeQuestion(item.question)),
    );

    const uniqueQuestions: ImportQuestion[] = [];
    let skippedCount = 0;

    for (const item of importedQuestions) {
      const normalizedQuestion = normalizeQuestion(item.question);

      if (existingQuestionTexts.has(normalizedQuestion)) {
        skippedCount++;
        continue;
      }

      uniqueQuestions.push(item);
      existingQuestionTexts.add(normalizedQuestion);
    }

    return { uniqueQuestions, skippedCount };
  }
}
