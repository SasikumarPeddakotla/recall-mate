import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Category } from '../../core/database/models/category.model';
import { Question } from '../../core/database/models/question.model';

import { CategoryService } from '../categories/category.service';
import { QuestionService } from '../questions/question.service';

import { PracticeResult } from './practice-result.model';

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './practice.component.html',
  styleUrl: './practice.component.scss',
})
export class PracticeComponent implements OnInit {
  categoryId!: number;
  category: Category | undefined;

  questions: Question[] = [];
  currentIndex = 0;

  userAnswer = '';
  hasChecked = false;
  answerRevealed = false;
  isCorrect = false;

  score = 0;
  isCompleted = false;
  isLoading = true;

  results: PracticeResult[] = [];
  hasSkipped = false;

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

    const savedQuestions = await this.questionService.getByCategory(id);
    this.questions = this.shuffleQuestions(savedQuestions);
    this.isLoading = false;

    if (this.questions.length === 0) {
      return;
    }
  }

  get currentQuestion(): Question | undefined {
    return this.questions[this.currentIndex];
  }

  get progress(): number {
    if (this.questions.length === 0) return 0;

    return ((this.currentIndex + 1) / this.questions.length) * 100;
  }

  checkAnswer(): void {
    if (!this.userAnswer.trim() || this.hasChecked || this.hasSkipped) {
      return;
    }

    const submittedAnswer = this.normalize(this.userAnswer);

    const acceptableAnswers = [
      this.currentQuestion?.answer ?? '',
      ...(this.currentQuestion?.acceptedAnswers ?? []),
    ];

    this.isCorrect = acceptableAnswers.some(
      (answer) => this.normalize(answer) === submittedAnswer,
    );

    this.hasChecked = true;

    this.results.push({
      question: this.currentQuestion!,
      userAnswer: this.userAnswer.trim(),
      status: this.isCorrect ? 'correct' : 'incorrect',
    });

    if (this.isCorrect) {
      this.score++;
    }
  }

  revealAnswer(): void {
    this.answerRevealed = true;
  }

  nextQuestion(): void {
    if (!this.hasChecked && !this.hasSkipped) {
      return;
    }

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.resetCurrentQuestion();
    } else {
      this.isCompleted = true;
    }
  }

  resetCurrentQuestion(): void {
    this.userAnswer = '';
    this.hasChecked = false;
    this.hasSkipped = false;
    this.answerRevealed = false;
    this.isCorrect = false;
  }

  restartPractice(): void {
    this.questions = this.shuffleQuestions(this.questions);

    this.currentIndex = 0;
    this.score = 0;
    this.results = [];
    this.isCompleted = false;

    this.resetCurrentQuestion();
  }

  goBack(): void {
    this.router.navigate(['/categories', this.categoryId, 'questions']);
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private shuffleQuestions(questions: Question[]): Question[] {
    const shuffled = [...questions];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  get correctCount(): number {
    return this.results.filter((item) => item.status === 'correct').length;
  }

  get incorrectCount(): number {
    return this.results.filter((item) => item.status === 'incorrect').length;
  }

  get skippedCount(): number {
    return this.results.filter((item) => item.status === 'skipped').length;
  }

  skipQuestion(): void {
    if (this.hasChecked || this.hasSkipped) {
      return;
    }

    this.hasSkipped = true;

    this.results.push({
      question: this.currentQuestion!,
      userAnswer: '',
      status: 'skipped',
    });
  }
}
