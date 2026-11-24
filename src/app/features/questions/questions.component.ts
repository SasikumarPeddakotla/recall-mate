import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Category } from '../../core/database/models/category.model';
import { Question } from '../../core/database/models/question.model';

import { CategoryService } from '../categories/category.service';
import { QuestionService } from './question.service';

import {
  QuestionImportService,
  ImportQuestion,
} from '../../core/services/question-import.service';

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

  // Question search
  searchTerm = '';

  // Question filter
  showBookmarkedOnly = false;
  showFilterMenu = false;

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

  // Import questions
  showImportForm = false;
  importQuestions: ImportQuestion[] = [];
  importFileName = '';
  isImporting = false;
  importMessage = '';
  importError = '';

  showHeaderMenu = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.menu-wrapper')) {
      this.showHeaderMenu = false;
    }

    if (!target.closest('.filter-menu-wrapper')) {
      this.showFilterMenu = false;
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private questionService: QuestionService,
    private questionImportService: QuestionImportService,
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

  // Toggles the bookmark status of a question.
  async toggleBookmark(question: Question): Promise<void> {
    if (!question.id) {
      return;
    }

    await this.questionService.toggleBookmark(question.id);

    // Update the displayed icon immediately.
    question.isBookmarked = !question.isBookmarked;
  }

  // Returns questions matching the selected filter and search term.
  get filteredQuestions(): Question[] {
    let filtered = this.questions;

    // Apply bookmark filter.
    if (this.showBookmarkedOnly) {
      filtered = filtered.filter((item) => item.isBookmarked === true);
    }

    // Apply search filter.
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return filtered;
    }

    return filtered.filter((item) => {
      const question = item.question.toLowerCase();
      const answer = item.answer.toLowerCase();

      const acceptedAnswers = (item.acceptedAnswers ?? []).some(
        (acceptedAnswer) => acceptedAnswer.toLowerCase().includes(term),
      );

      return (
        question.includes(term) || answer.includes(term) || acceptedAnswers
      );
    });
  }

  // Selects whether to show all or bookmarked questions.
  setBookmarkFilter(bookmarkedOnly: boolean): void {
    this.showBookmarkedOnly = bookmarkedOnly;
    this.showFilterMenu = false;
  }

  // Returns the number of questions currently displayed.
  get filteredQuestionCount(): number {
    return this.filteredQuestions.length;
  }

  // Clears the question search.
  clearSearch(): void {
    this.searchTerm = '';
  }

  async exportQuestions(): Promise<void> {
    if (this.questions.length === 0) {
      window.alert('There are no questions to export.');
      return;
    }

    const exportData = {
      format: 'RecallMate',
      version: 1,
      questions: this.questions.map((item) => ({
        question: item.question,
        answer: item.answer,
        acceptedAnswers: item.acceptedAnswers ?? [],
      })),
    };

    const json = JSON.stringify(exportData, null, 2);

    const blob = new Blob([json], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.category?.name || 'questions'}-questions.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
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

  // Starts a practice session with bookmarked questions only.
  startBookmarkedPractice(): void {
    const bookmarkedCount = this.questions.filter(
      (question) => question.isBookmarked,
    ).length;

    if (bookmarkedCount === 0) {
      return;
    }

    this.router.navigate(['/categories', this.categoryId, 'practice'], {
      queryParams: { bookmarks: true },
    });
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
        acceptedAnswers: (item.acceptedAnswers ?? '')
          .split(',')
          .map((answer) => answer.trim())
          .filter(Boolean),
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
    if (this.isImporting || this.importQuestions.length === 0) {
      return;
    }

    if (!this.category?.id) {
      this.importError = 'Unable to identify the current category.';
      return;
    }

    this.importError = '';
    this.importMessage = '';
    this.isImporting = true;

    try {
      const categoryId = this.category.id;

      const existingQuestions =
        await this.questionService.getByCategory(categoryId);

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
        categoryId,
        uniqueQuestions,
      );

      await this.loadQuestions();

      this.importMessage =
        `${importedCount} questions imported successfully. ` +
        (skippedCount > 0
          ? `${skippedCount} duplicate questions skipped.`
          : '');

      this.showImportForm = false;
      this.importQuestions = [];
      this.importFileName = '';
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

  // Returns the number of bookmarked questions.
  get bookmarkedCount(): number {
    return this.questions.filter((item) => item.isBookmarked === true).length;
  }

  // Checks whether the category has bookmarked questions.
  get hasBookmarkedQuestions(): boolean {
    return this.bookmarkedCount > 0;
  }
}
