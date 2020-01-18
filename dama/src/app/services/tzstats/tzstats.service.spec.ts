import { TestBed } from '@angular/core/testing';

import { TzstatsService } from './tzstats.service';

describe('TzstatsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TzstatsService = TestBed.get(TzstatsService);
    expect(service).toBeTruthy();
  });
});
