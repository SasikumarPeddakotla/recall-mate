import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Category } from '../../core/database/models/category.model';
import { Question } from '../../core/database/models/question.model';

import { CategoryService } from '../categories/category.service';
import { QuestionService } from '../questions/question.service';

import { PracticeResult } from './practice-result.model';

type ResultFilter = 'all' | 'correct' | 'incorrect' | 'skipped';

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

  @ViewChild('answerInput')
  answerInput?: ElementRef<HTMLTextAreaElement>;

  resultFilter: ResultFilter = 'all';

  isBookmarkPractice = false;

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

    this.isBookmarkPractice =
      this.route.snapshot.queryParamMap.get('bookmarks') === 'true';

    const savedQuestions = await this.questionService.getByCategory(id);

    const practiceQuestions = this.isBookmarkPractice
      ? savedQuestions.filter((question) => question.isBookmarked === true)
      : savedQuestions;

    this.questions = this.shuffleQuestions(practiceQuestions);
    this.isLoading = false;
  }

  // Returns the currently displayed question.
  get currentQuestion(): Question | undefined {
    return this.questions[this.currentIndex];
  }

  // Calculates progress through the practice session.
  get progress(): number {
    if (this.questions.length === 0) {
      return 0;
    }

    return ((this.currentIndex + 1) / this.questions.length) * 100;
  }

  // Checks the user's answer against the correct and accepted answers.
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

    // Close the mobile keyboard after checking the answer.
    this.answerInput?.nativeElement.blur();

    this.results.push({
      question: this.currentQuestion!,
      userAnswer: this.userAnswer.trim(),
      status: this.isCorrect ? 'correct' : 'incorrect',
    });

    if (this.isCorrect) {
      this.score++;
    }
  }

  // Reveals the correct answer and records the question as skipped.
  revealAnswer(): void {
    if (this.hasChecked || this.hasSkipped) {
      return;
    }

    this.answerRevealed = true;
    this.skipQuestion();
  }

  // Moves to the next question or completes the session.
  nextQuestion(): void {
    if (!this.hasChecked && !this.hasSkipped) {
      return;
    }

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.resetCurrentQuestion();

      // Focus the answer field for the next question.
      setTimeout(() => {
        this.answerInput?.nativeElement.focus();
      }, 0);
    } else {
      this.isCompleted = true;
    }
  }

  // Resets the state for the next question.
  resetCurrentQuestion(): void {
    this.userAnswer = '';
    this.hasChecked = false;
    this.hasSkipped = false;
    this.answerRevealed = false;
    this.isCorrect = false;
  }

  // Restarts the practice session with shuffled questions.
  restartPractice(): void {
    this.questions = this.shuffleQuestions(this.questions);

    this.currentIndex = 0;
    this.score = 0;
    this.results = [];
    this.isCompleted = false;

    this.resetCurrentQuestion();
  }

  // Navigates back to the category's question list.
  goBack(): void {
    this.router.navigate(['/categories', this.categoryId, 'questions']);
  }

  // Normalizes answers before comparing them.
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  // Randomizes the question order using Fisher-Yates shuffle.
  private shuffleQuestions(questions: Question[]): Question[] {
    const shuffled = [...questions];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  // Result counts.
  get correctCount(): number {
    return this.results.filter((item) => item.status === 'correct').length;
  }

  get incorrectCount(): number {
    return this.results.filter((item) => item.status === 'incorrect').length;
  }

  get skippedCount(): number {
    return this.results.filter((item) => item.status === 'skipped').length;
  }

  // Skips the current question and records it in the results.
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

  // Handles the Enter key on the mobile or physical keyboard.
  onAnswerEnter(event: KeyboardEvent): void {
    // Allow Shift + Enter to insert a new line.
    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.checkAnswer();
  }

  // Changes the result filter.
  setResultFilter(filter: ResultFilter): void {
    this.resultFilter = filter;
  }

  // Returns results matching the selected filter.
  get filteredResults(): PracticeResult[] {
    if (this.resultFilter === 'all') {
      return this.results;
    }

    return this.results.filter((item) => item.status === this.resultFilter);
  }

  // Toggles the bookmark for an individual reviewed question.
  async toggleResultBookmark(result: PracticeResult): Promise<void> {
    const questionId = result.question.id;

    if (!questionId) {
      return;
    }

    await this.questionService.toggleBookmark(questionId);
    result.question.isBookmarked = !result.question.isBookmarked;
  }

  // Checks whether all questions in the selected filter are bookmarked.
  get areAllFilteredResultsBookmarked(): boolean {
    return (
      this.filteredResults.length > 0 &&
      this.filteredResults.every((item) => item.question.isBookmarked === true)
    );
  }

  // Returns the appropriate bulk toggle button label.
  get bulkBookmarkLabel(): string {
    const action = this.areAllFilteredResultsBookmarked ? 'Remove' : 'Bookmark';

    switch (this.resultFilter) {
      case 'correct':
        return `${action} Correct Questions`;

      case 'incorrect':
        return `${action} Wrong Questions`;

      case 'skipped':
        return `${action} Skipped Questions`;

      default:
        return `${action} All Questions`;
    }
  }

  // Toggles bookmarks for all questions in the selected filter.
  async toggleFilteredBookmarks(): Promise<void> {
    const shouldBookmark = !this.areAllFilteredResultsBookmarked;

    for (const result of this.filteredResults) {
      const question = result.question;

      if (!question.id || question.isBookmarked === shouldBookmark) {
        continue;
      }

      await this.questionService.toggleBookmark(question.id);
      question.isBookmarked = shouldBookmark;
    }
  }

  // Toggles the bookmark for the currently displayed question.
  async toggleCurrentBookmark(): Promise<void> {
    const questionId = this.currentQuestion?.id;

    if (!questionId) {
      return;
    }

    await this.questionService.toggleBookmark(questionId);

    this.currentQuestion!.isBookmarked = !this.currentQuestion!.isBookmarked;
  }

  // Returns accepted answers other than the answer the user submitted.
  get remainingAcceptedAnswers(): string[] {
    const submittedAnswer = this.normalize(this.userAnswer);

    const allAnswers = [
      this.currentQuestion?.answer,
      ...(this.currentQuestion?.acceptedAnswers ?? []),
    ].filter((answer): answer is string => !!answer);

    if (this.answerRevealed || this.hasSkipped || !this.isCorrect) {
      allAnswers.shift();
    }

    return allAnswers.filter(
      (answer) => this.normalize(answer) !== submittedAnswer,
    );
  }
}
