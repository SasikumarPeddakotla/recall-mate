import Dexie, { Table } from 'dexie';

import { Category } from './models/category.model';
import { Question } from './models/question.model';

export class RecallMateDatabase extends Dexie {
  categories!: Table<Category, number>;
  questions!: Table<Question, number>;

  constructor() {
    super('RecallMateDB');

    this.version(1).stores({
      categories: '++id, name, createdAt',
    });

    this.version(2).stores({
      categories: '++id, name, createdAt',
      questions: '++id, categoryId, createdAt',
    });

    this.version(3).stores({
      categories: '++id, name, createdAt',
      questions: '++id, categoryId, createdAt, isBookmarked',
    });
  }
}

export const db = new RecallMateDatabase();
