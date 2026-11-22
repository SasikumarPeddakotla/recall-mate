import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Category } from '../../core/database/models/category.model';
import { Question } from '../../core/database/models/question.model';

import { CategoryService } from '../categories/category.service';
import { QuestionService } from './question.service';

interface BulkQuestion {
  question: string;
  answer: string;
  acceptedAnswers?: string;
}

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.scss',
})
export class QuestionsComponent implements OnInit {
  categoryId!: number;
  category: Category | undefined;

  questions: Question[] = [];

  showForm = false;
  editingId: number | null = null;

  questionText = '';
  answerText = '';
  acceptedAnswersText = '';

  showBulkForm = false;

  bulkQuestions: BulkQuestion[] = [
    { question: '', answer: '', acceptedAnswers: '' },
  ];

  isBulkSaving = false;
  bulkMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private questionService: QuestionService,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('categoryId'));

    if (!Number.isSafeInteger(id) || id <= 0) {
      await this.router.navigate(['/categories']);
      return;
    }

    this.categoryId = id;
    this.category = await this.categoryService.getById(id);

    if (!this.category) {
      await this.router.navigate(['/categories']);
      return;
    }

    await this.loadQuestions();
  }

  async loadQuestions(): Promise<void> {
    this.questions = await this.questionService.getByCategory(this.categoryId);
  }

  openCreateForm(): void {
    this.resetForm();
    this.showForm = true;
  }

  openEditForm(question: Question): void {
    this.editingId = question.id!;
    this.questionText = question.question;
    this.answerText = question.answer;
    this.acceptedAnswersText = (question.acceptedAnswers ?? []).join(', ');
    this.showForm = true;
  }

  async saveQuestion(): Promise<void> {
    const question = this.questionText.trim();
    const answer = this.answerText.trim();

    if (!question || !answer) return;

    const acceptedAnswers = this.acceptedAnswersText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (this.editingId !== null) {
      await this.questionService.update(
        this.editingId,
        question,
        answer,
        acceptedAnswers,
      );
    } else {
      await this.questionService.create(
        this.categoryId,
        question,
        answer,
        acceptedAnswers,
      );
    }

    await this.loadQuestions();
    this.resetForm();
  }

  async deleteQuestion(question: Question): Promise<void> {
    if (!question.id) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this question?',
    );

    if (!confirmed) return;

    await this.questionService.delete(question.id);
    await this.loadQuestions();
  }

  resetForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.questionText = '';
    this.answerText = '';
    this.acceptedAnswersText = '';
    this.showBulkForm = false;
  }

  goBack(): void {
    this.router.navigate(['/categories']);
  }

  startPractice(): void {
    this.router.navigate(['/categories', this.categoryId, 'practice']);
  }

  openBulkForm(): void {
    this.resetForm();
    this.showBulkForm = true;

    this.bulkQuestions = [
      { question: '', answer: '', acceptedAnswers: '' },
      { question: '', answer: '', acceptedAnswers: '' },
      { question: '', answer: '', acceptedAnswers: '' },
    ];
  }

  addBulkQuestion(): void {
    this.bulkQuestions.push({
      question: '',
      answer: '',
      acceptedAnswers: '',
    });
  }

  removeBulkQuestion(index: number): void {
    if (this.bulkQuestions.length <= 1) return;

    this.bulkQuestions.splice(index, 1);
  }

  closeBulkForm(): void {
    this.showBulkForm = false;

    this.bulkQuestions = [{ question: '', answer: '', acceptedAnswers: '' }];
  }

  async saveBulkQuestions(): Promise<void> {
    if (this.isBulkSaving) return;

    const validQuestions = this.bulkQuestions
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
        acceptedAnswers: item.acceptedAnswers?.trim(),
      }))
      .filter((item) => item.question && item.answer);

    if (validQuestions.length === 0) {
      this.bulkMessage =
        'Please enter at least one complete question and answer.';
      return;
    }

    this.isBulkSaving = true;
    this.bulkMessage = '';

    try {
      const savedCount = await this.questionService.createMany(
        this.categoryId,
        validQuestions,
      );

      await this.loadQuestions();

      this.closeBulkForm();

      this.bulkMessage = `${savedCount} questions added successfully.`;
    } catch (error) {
      console.error('Failed to save bulk questions:', error);
      this.bulkMessage = 'Unable to save questions. Please try again.';
    } finally {
      this.isBulkSaving = false;
    }
  }
}
