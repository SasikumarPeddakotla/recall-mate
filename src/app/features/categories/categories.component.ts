import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Category } from '../../core/database/models/category.model';
import { CategoryService } from './category.service';

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

  constructor(
    private categoryService: CategoryService,
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
}
