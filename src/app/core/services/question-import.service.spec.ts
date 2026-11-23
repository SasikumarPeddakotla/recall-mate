import { TestBed } from '@angular/core/testing';

import { QuestionImportService } from './question-import.service';

describe('QuestionImportService', () => {
  let service: QuestionImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuestionImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
