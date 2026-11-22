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
    questions: { question: string; answer: string }[],
  ): Promise<number> {
    const now = new Date();

    const records = questions.map((item) => ({
      categoryId,
      question: item.question.trim(),
      answer: item.answer.trim(),
      acceptedAnswers: [],
      createdAt: now,
      updatedAt: now,
    }));

    return db.transaction('rw', db.questions, async () => {
      const ids = await db.questions.bulkAdd(records, {
        allKeys: true,
      });

      return ids.length;
    });
  }
}
