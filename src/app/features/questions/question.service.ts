import { Injectable } from '@angular/core';

import { db } from '../../core/database/database';
import { Question } from '../../core/database/models/question.model';

@Injectable({
  providedIn: 'root',
})
export class QuestionService {
  async getByCategory(categoryId: number): Promise<Question[]> {
    const questions = await db.questions
      .where('categoryId')
      .equals(categoryId)
      .toArray();

    return questions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async create(
    categoryId: number,
    question: string,
    answer: string,
    acceptedAnswers: string[] = [],
  ): Promise<number> {
    const now = new Date();

    return db.questions.add({
      categoryId,
      question: question.trim(),
      answer: answer.trim(),
      acceptedAnswers: acceptedAnswers
        .map((item) => item.trim())
        .filter(Boolean),
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(
    id: number,
    question: string,
    answer: string,
    acceptedAnswers: string[] = [],
  ): Promise<void> {
    await db.questions.update(id, {
      question: question.trim(),
      answer: answer.trim(),
      acceptedAnswers: acceptedAnswers
        .map((item) => item.trim())
        .filter(Boolean),
      updatedAt: new Date(),
    });
  }

  async delete(id: number): Promise<void> {
    await db.questions.delete(id);
  }

  async getCount(categoryId: number): Promise<number> {
    return db.questions.where('categoryId').equals(categoryId).count();
  }

  async deleteByCategory(categoryId: number): Promise<void> {
    await db.questions.where('categoryId').equals(categoryId).delete();
  }

  async createMany(
    categoryId: number,
    questions: {
      question: string;
      answer: string;
      acceptedAnswers?: string[];
    }[],
  ): Promise<number> {
    const now = new Date();

    const records = questions.map((item) => ({
      categoryId,
      question: item.question.trim(),
      answer: item.answer.trim(),
      acceptedAnswers: (item.acceptedAnswers ?? [])
        .map((answer) => answer.trim())
        .filter(Boolean),
      createdAt: now,
      updatedAt: now,
    }));

    return db.transaction('rw', db.questions, async () => {
      await db.questions.bulkAdd(records);
      return records.length;
    });
  }

  // Toggles the bookmark status of a question.
  async toggleBookmark(questionId: number): Promise<void> {
    const question = await db.questions.get(questionId);

    if (!question) {
      return;
    }

    await db.questions.update(questionId, {
      isBookmarked: !question.isBookmarked,
      updatedAt: new Date(),
    });
  }

  // Returns bookmarked questions from a category.
  async getBookmarkedByCategory(categoryId: number): Promise<Question[]> {
    const questions = await db.questions
      .where('categoryId')
      .equals(categoryId)
      .toArray();

    return questions.filter((question) => question.isBookmarked === true);
  }
}
