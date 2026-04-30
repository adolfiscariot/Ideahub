/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { VoteService } from './vote.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  VoteRequest,
  UnvoteRequest,
  SeeVotesRequest,
  VoteDetails,
} from '../Interfaces/Ideas/idea-interfaces';

describe('VoteService', () => {
  let service: VoteService;
  let http_mock: HttpTestingController;

  const api_url = `${'http://localhost:5065/api'}/vote`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [VoteService, { provide: AppConfigService, useValue: { apiUrl: 'http://localhost:5065/api' } }],
    });
    service = TestBed.inject(VoteService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('castVote()', () => {
    it('should POST /cast-vote with groupId and ideaId as query params', () => {
      const request: VoteRequest = { groupId: 'g1', ideaId: 'i1' };
      const mock_response: ApiResponse<void> = {
        success: true,
        message: 'Voted',
      };

      service.castVote(request).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/cast-vote` &&
          r.params.get('groupId') === 'g1' &&
          r.params.get('ideaId') === 'i1',
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mock_response);
    });
  });

  describe('unvote()', () => {
    it('should POST /unvote with voteId as query param', () => {
      const request: UnvoteRequest = { voteId: '500' };
      const mock_response: ApiResponse<void> = {
        success: true,
        message: 'Removed',
      };

      service.unvote(request).subscribe();

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/unvote` && r.params.get('voteId') === '500',
      );
      expect(req.request.method).toBe('POST');
      req.flush(mock_response);
    });
  });

  describe('seeVotes()', () => {
    it('should GET /see-votes with ideaId as query param', () => {
      const request: SeeVotesRequest = { ideaId: 'i1' };
      const mock_details: VoteDetails[] = [
        {
          voteId: 1,
          userId: 'u1',
          userName: 'User 1',
          userEmail: 'u1@test.com',
          ideaId: 10,
          isDeleted: false,
          time: '2024-01-01',
        } as VoteDetails,
      ];
      const mock_response: ApiResponse<VoteDetails[]> = {
        success: true,
        message: 'ok',
        data: mock_details,
      };

      service.seeVotes(request).subscribe((res) => {
        expect(res.data?.length).toBe(1);
      });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/see-votes` && r.params.get('ideaId') === 'i1',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });
});
