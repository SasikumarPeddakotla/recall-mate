import { Routes } from '@angular/router';

import { HomeComponent } from './features/home/home.component';
import { CategoriesComponent } from './features/categories/categories.component';
import { QuestionsComponent } from './features/questions/questions.component';
import { PracticeComponent } from './features/practice/practice.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'categories', component: CategoriesComponent },
  { path: 'categories/:categoryId/questions', component: QuestionsComponent },
  { path: 'categories/:categoryId/practice', component: PracticeComponent },
  { path: '**', redirectTo: '' },
];
