import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Category } from '../../core/database/models/category.model';
import { CategoryService } from './category.service';

import { QuestionService } from '../questions/question.service';

import {
  QuestionImportService,
  ImportQuestion,
} from '../../core/services/question-import.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];

  showForm = false;
  editingId: number | null = null;

  categoryName = '';
  categoryDescription = '';

  // Import questions
  showImportForm = false;

  importQuestions: ImportQuestion[] = [];
  importFileName = '';

  importTargetCategoryId: number | null = null;
  createNewImportCategory = false;
  newImportCategoryName = '';
  newImportCategoryDescription = '';

  isImporting = false;
  importMessage = '';
  importError = '';

  constructor(
    private categoryService: CategoryService,
    private questionService: QuestionService,
    private questionImportService: QuestionImportService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    this.categories = await this.categoryService.getAll();
  }

  openCreateForm(): void {
    this.resetForm();
    this.showForm = true;
  }

  openEditForm(category: Category): void {
    this.editingId = category.id!;
    this.categoryName = category.name;
    this.categoryDescription = category.description ?? '';
    this.showForm = true;
  }

  async saveCategory(): Promise<void> {
    const name = this.categoryName.trim();

    if (!name) return;

    if (this.editingId !== null) {
      await this.categoryService.update(
        this.editingId,
        name,
        this.categoryDescription,
      );
    } else {
      await this.categoryService.create(name, this.categoryDescription);
    }

    await this.loadCategories();
    this.resetForm();
  }

  async deleteCategory(category: Category): Promise<void> {
    if (!category.id) return;

    const confirmed = window.confirm(`Delete "${category.name}"?`);

    if (!confirmed) return;

    await this.categoryService.delete(category.id);
    await this.loadCategories();
  }

  resetForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.categoryName = '';
    this.categoryDescription = '';
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  openCategory(category: Category): void {
    this.router.navigate(['/categories', category.id, 'questions']);
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.importQuestions = [];
    this.importFileName = '';
    this.importError = '';
    this.importMessage = '';

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      this.importError = 'Please select a JSON file.';
      input.value = '';
      return;
    }

    try {
      const content = await file.text();

      this.importQuestions =
        this.questionImportService.validateImportFile(content);

      this.importFileName = file.name;
    } catch (error) {
      console.error('Import file validation failed:', error);

      this.importError =
        error instanceof Error
          ? error.message
          : 'Unable to read the selected file.';
    } finally {
      input.value = '';
    }
  }

  async importQuestionsNow(): Promise<void> {
    if (this.isImporting || this.importQuestions.length === 0) return;

    this.importError = '';
    this.importMessage = '';

    const categoryName = this.newImportCategoryName.trim();
    const categoryDescription = this.newImportCategoryDescription.trim();

    if (this.createNewImportCategory && !categoryName) {
      this.importError = 'Please enter a name for the new category.';
      return;
    }

    if (!this.createNewImportCategory && this.importTargetCategoryId === null) {
      this.importError = 'Please select a destination category.';
      return;
    }

    this.isImporting = true;

    try {
      let targetCategoryId: number;
      let targetCategoryName: string;

      if (this.createNewImportCategory) {
        targetCategoryId = await this.categoryService.create(
          categoryName,
          categoryDescription,
        );
        targetCategoryName = categoryName;
      } else {
        targetCategoryId = this.importTargetCategoryId!;

        const category = await this.categoryService.getById(targetCategoryId);

        if (!category) {
          throw new Error('The selected category no longer exists.');
        }

        targetCategoryName = category.name;
      }

      const existingQuestions =
        await this.questionService.getByCategory(targetCategoryId);

      const { uniqueQuestions, skippedCount } =
        this.questionImportService.filterDuplicates(
          this.importQuestions,
          existingQuestions,
        );

      if (uniqueQuestions.length === 0) {
        this.importMessage = `No new questions to import. All ${skippedCount} questions were duplicates.`;

        return;
      }

      const importedCount = await this.questionService.createMany(
        targetCategoryId,
        uniqueQuestions,
      );

      await this.loadCategories();

      this.importMessage =
        `${importedCount} questions imported into "${targetCategoryName}". ` +
        (skippedCount > 0
          ? `${skippedCount} duplicate questions skipped.`
          : '');

      this.showImportForm = false;
      this.importQuestions = [];
      this.importFileName = '';
      this.importTargetCategoryId = null;
      this.createNewImportCategory = false;
      this.newImportCategoryName = '';
      this.newImportCategoryDescription = '';
    } catch (error) {
      console.error('Failed to import questions:', error);

      this.importError =
        error instanceof Error
          ? error.message
          : 'Unable to import questions. Please try again.';
    } finally {
      this.isImporting = false;
    }
  }
}
