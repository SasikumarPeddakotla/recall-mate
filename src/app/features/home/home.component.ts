import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Category } from '../../core/database/models/category.model';
import { CategoryService } from '../categories/category.service';
import { QuestionService } from '../questions/question.service';

interface CategoryWithCount {
  category: Category;
  questionCount: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  categories: CategoryWithCount[] = [];

  totalCategories = 0;
  totalQuestions = 0;
  isLoading = true;

  constructor(
    private categoryService: CategoryService,
    private questionService: QuestionService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.isLoading = true;

    try {
      const categories = await this.categoryService.getAll();

      this.categories = await Promise.all(
        categories.map(async (category) => ({
          category,
          questionCount: await this.questionService.getCount(category.id!),
        })),
      );

      this.totalCategories = this.categories.length;

      this.totalQuestions = this.categories.reduce(
        (total, item) => total + item.questionCount,
        0,
      );
    } catch (error) {
      console.error('Unable to load dashboard:', error);
    } finally {
      this.isLoading = false;
    }
  }

  createCategory(): void {
    this.router.navigate(['/categories']);
  }

  openCategory(category: Category): void {
    this.router.navigate(['/categories', category.id, 'questions']);
  }
}
