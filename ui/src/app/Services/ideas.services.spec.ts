/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { IdeasService } from './ideas.services';
import { VoteService } from './vote.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  Idea,
  CreateIdeaRequest,
  IdeaUpdate,
  PromoteRequest,
  VoteDetails,
} from '../Interfaces/Ideas/idea-interfaces';
import { of } from 'rxjs';

interface RawMockResponse<T> {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T;
}

describe('IdeasService', () => {
  let service: IdeasService;
  let http_mock: HttpTestingController;
  let vote_service_spy: jasmine.SpyObj<VoteService>;

  const api_url = `${'http://localhost:5065/api'}/idea`;

  // Shared test data
  const mock_idea: Idea = {
    id: 'idea-1',
    Title: 'New AI Processor',
    ProblemStatement: 'Slow processing',
    ProposedSolution: 'Use FPGA',
    UseCase: 'Datacenters',
    InnovationCategory: 'Hardware',
    isPromotedToProject: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'Open',
    UserId: 'user-001',
    groupId: 'group-101',
    mediaCount: 0,
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('VoteService', [
      'castVote',
      'unvote',
      'seeVotes',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IdeasService, { provide: VoteService, useValue: spy }, { provide: AppConfigService, useValue: { apiUrl: 'http://localhost:5065/api' } }],
    });
    service = TestBed.inject(IdeasService);
    http_mock = TestBed.inject(HttpTestingController);
    vote_service_spy = TestBed.inject(
      VoteService,
    ) as jasmine.SpyObj<VoteService>;
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // convertResponse normalization
  describe('convertResponse', () => {
    it('should use status as success if present', () => {
      const raw: RawMockResponse<Idea[]> = { status: true, data: [mock_idea] };

      service.getIdeasByGroup('group-101').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      http_mock.expectOne((r) => r.url === `${api_url}/view-ideas`).flush(raw);
    });
  });

  // getIdeasByGroup
  describe('getIdeasByGroup()', () => {
    it('should GET ideas with groupId and optional filters', () => {
      const mock_response: ApiResponse<Idea[]> = {
        success: true,
        message: 'ok',
        data: [mock_idea],
      };

      service
        .getIdeasByGroup('group-101', 'High', 'Tech', 'HighImpact')
        .subscribe((res) => {
          expect(res.data?.length).toBe(1);
        });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/view-ideas` &&
          r.params.get('groupId') === 'group-101' &&
          r.params.get('type') === 'High' &&
          r.params.get('domain') === 'Tech' &&
          r.params.get('impact') === 'HighImpact',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });

  // getIdea
  describe('getIdea()', () => {
    it('should GET a single idea using open-idea endpoint', () => {
      const mock_response: ApiResponse<Idea> = {
        success: true,
        message: 'ok',
        data: mock_idea,
      };

      service.getIdea('group-101', 'idea-1').subscribe((res) => {
        expect(res.data?.Title).toBe('New AI Processor');
      });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/open-idea` &&
          r.params.get('groupId') === 'group-101' &&
          r.params.get('ideaId') === 'idea-1',
      );
      req.flush(mock_response);
    });
  });

  // createIdea
  describe('createIdea()', () => {
    it('should POST new idea and include groupId in params', () => {
      const request: CreateIdeaRequest = {
        Title: 'T',
        ProblemStatement: 'P',
        ProposedSolution: 'S',
        StrategicAlignment: 'A',
        UseCase: 'U',
        InnovationCategory: 'C',
        groupId: 'group-101',
      };
      const mock_response: ApiResponse<Idea> = {
        success: true,
        message: 'ok',
        data: mock_idea,
      };

      service.createIdea(request).subscribe();

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/create-idea` &&
          r.params.get('groupId') === 'group-101',
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.Title).toBe('T');
      req.flush(mock_response);
    });
  });

  // Logic Actions
  describe('Idea State Actions', () => {
    it('should PUT to update an idea', () => {
      const update: IdeaUpdate = { Title: 'Updated' };
      const mock_response: ApiResponse<Idea> = {
        success: true,
        message: 'ok',
        data: mock_idea,
      };

      service.updateIdea('idea-1', update).subscribe();

      const req = http_mock.expectOne(`${api_url}/idea-1`);
      expect(req.request.method).toBe('PUT');
      req.flush(mock_response);
    });

    it('should PATCH to close an idea', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.closeIdea('idea-1').subscribe();

      const req = http_mock.expectOne(`${api_url}/close-idea?ideaId=idea-1`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mock_response);
    });

    it('should DELETE an idea', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.deleteIdea('idea-1').subscribe();

      const req = http_mock.expectOne(`${api_url}/idea-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mock_response);
    });

    it('should POST to promote an idea', () => {
      const request: PromoteRequest = { groupId: 'g1', ideaId: 'i1' };
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.promoteIdea(request).subscribe();

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/promote-idea` &&
          r.params.get('groupId') === 'g1' &&
          r.params.get('ideaId') === 'i1',
      );
      req.flush(mock_response);
    });
  });

  // VoteService Delegation
  describe('Vote Service Integration', () => {
    it('should delegate voteForIdea to VoteService', () => {
      vote_service_spy.castVote.and.returnValue(
        of({ success: true, message: '' } as ApiResponse<void>),
      );

      service.voteForIdea('group-1', 'idea-1');

      expect(vote_service_spy.castVote).toHaveBeenCalledWith({
        groupId: 'group-1',
        ideaId: 'idea-1',
      });
    });

    it('should delegate removeVote to VoteService', () => {
      vote_service_spy.unvote.and.returnValue(
        of({ success: true, message: '' } as ApiResponse<void>),
      );

      service.removeVote('vote-99');

      expect(vote_service_spy.unvote).toHaveBeenCalledWith({
        voteId: 'vote-99',
      });
    });

    it('should delegate getVotesForIdea to VoteService', () => {
      vote_service_spy.seeVotes.and.returnValue(
        of({ success: true, message: '', data: [] } as ApiResponse<
          VoteDetails[]
        >),
      );

      service.getVotesForIdea('idea-1');

      expect(vote_service_spy.seeVotes).toHaveBeenCalledWith({
        ideaId: 'idea-1',
      });
    });
  });
});
