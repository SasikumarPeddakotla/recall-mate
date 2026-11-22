import { Injectable } from '@angular/core';
import { db } from '../../core/database/database';
import { Category } from '../../core/database/models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  async getAll(): Promise<Category[]> {
    return db.categories.orderBy('createdAt').reverse().toArray();
  }

  async create(name: string, description?: string): Promise<number> {
    const now = new Date();

    return db.categories.add({
      name: name.trim(),
      description: description?.trim(),
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(id: number, name: string, description?: string): Promise<void> {
    await db.categories.update(id, {
      name: name.trim(),
      description: description?.trim(),
      updatedAt: new Date(),
    });
  }

  async delete(id: number): Promise<void> {
    await db.transaction('rw', db.categories, db.questions, async () => {
      await db.questions.where('categoryId').equals(id).delete();

      await db.categories.delete(id);
    });
  }

  async getById(id: number): Promise<Category | undefined> {
    return db.categories.get(id);
  }
}
