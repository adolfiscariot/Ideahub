/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AnalyticsService } from './analytics.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  MostVotedIdea,
  TopContributor,
  PromotedIdea,
  IdeaStats,
  GroupEngagement,
  PersonalStats,
} from '../Models/analytics.models';

interface RawMockResponse<T> {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T;
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  const baseUrl = `${'http://localhost:5065/api'}/analytics`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnalyticsService, { provide: AppConfigService, useValue: { apiUrl: 'http://localhost:5065/api' } }],
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // convertResponse normalization

  describe('convertResponse (via getMostVotedIdeas)', () => {
    it('should use response.status when success is absent', () => {
      const raw: RawMockResponse<MostVotedIdea[]> = {
        status: true,
        message: 'ok',
        data: [],
      };

      service.getMostVotedIdeas().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      httpMock.expectOne(`${baseUrl}/most-voted`).flush(raw);
    });

    it('should use response.success when status is absent', () => {
      const raw = { success: true, message: 'ok', data: [] } as ApiResponse<
        MostVotedIdea[]
      >;

      service.getMostVotedIdeas().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      httpMock.expectOne(`${baseUrl}/most-voted`).flush(raw);
    });

    it('should default success to false when both status and success are absent', () => {
      const raw: RawMockResponse<MostVotedIdea[]> = {
        message: 'fail',
        data: [],
      };

      service.getMostVotedIdeas().subscribe((res) => {
        expect(res.success).toBeFalse();
      });

      httpMock.expectOne(`${baseUrl}/most-voted`).flush(raw);
    });

    it('should default message to empty string when absent', () => {
      const raw: RawMockResponse<MostVotedIdea[]> = { success: true };

      service.getMostVotedIdeas().subscribe((res) => {
        expect(res.message).toBe('');
      });

      httpMock.expectOne(`${baseUrl}/most-voted`).flush(raw);
    });
  });

  // getMostVotedIdeas

  describe('getMostVotedIdeas()', () => {
    it('should GET /analytics/most-voted', () => {
      const mockIdeas: MostVotedIdea[] = [
        {
          id: 1,
          title: 'AI Pipeline',
          proposedSolution: 'Automate',
          author: 'Alice',
          groupName: 'Tech',
          voteCount: 42,
          groupId: 10,
          isMember: true,
        },
      ];
      const raw: ApiResponse<MostVotedIdea[]> = {
        success: true,
        message: 'ok',
        data: mockIdeas,
      };

      service.getMostVotedIdeas().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.length).toBe(1);
        expect(res.data?.[0].title).toBe('AI Pipeline');
      });

      const req = httpMock.expectOne(`${baseUrl}/most-voted`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should return empty data array when no ideas exist', () => {
      const raw: ApiResponse<MostVotedIdea[]> = {
        success: true,
        message: 'none',
        data: [],
      };

      service.getMostVotedIdeas().subscribe((res) => {
        expect(res.data).toEqual([]);
      });

      httpMock.expectOne(`${baseUrl}/most-voted`).flush(raw);
    });
  });

  // getTopContributors

  describe('getTopContributors()', () => {
    it('should GET /analytics/top-contributors', () => {
      const mockContributors: TopContributor[] = [
        { displayName: 'Bob', email: 'bob@example.com', ideaCount: 7 },
      ];
      const raw: ApiResponse<TopContributor[]> = {
        success: true,
        message: 'ok',
        data: mockContributors,
      };

      service.getTopContributors().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.[0].displayName).toBe('Bob');
        expect(res.data?.[0].ideaCount).toBe(7);
      });

      const req = httpMock.expectOne(`${baseUrl}/top-contributors`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should map multiple contributors correctly', () => {
      const mockContributors: TopContributor[] = [
        { displayName: 'Alice', email: 'alice@example.com', ideaCount: 10 },
        { displayName: 'Charlie', email: 'charlie@example.com', ideaCount: 5 },
      ];
      const raw: ApiResponse<TopContributor[]> = {
        success: true,
        message: 'ok',
        data: mockContributors,
      };

      service.getTopContributors().subscribe((res) => {
        expect(res.data?.length).toBe(2);
      });

      httpMock.expectOne(`${baseUrl}/top-contributors`).flush(raw);
    });
  });

  // getPromotedIdeas

  describe('getPromotedIdeas()', () => {
    it('should GET /analytics/promoted-ideas', () => {
      const mockIdeas: PromotedIdea[] = [
        {
          id: 1,
          title: 'Drone Delivery',
          proposedSolution: 'Drones',
          author: 'Dan',
          groupName: 'Logistics',
          promotedDate: '2024-01-01',
          projectId: 99,
        },
      ];
      const raw: ApiResponse<PromotedIdea[]> = {
        success: true,
        message: 'ok',
        data: mockIdeas,
      };

      service.getPromotedIdeas().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.[0].projectId).toBe(99);
      });

      const req = httpMock.expectOne(`${baseUrl}/promoted-ideas`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });
  });

  // getIdeaStatistics

  describe('getIdeaStatistics()', () => {
    it('should GET /analytics/idea-statistics and return stats', () => {
      const mockStats: IdeaStats = {
        total: 100,
        open: 60,
        promoted: 25,
        closed: 15,
      };
      const raw: ApiResponse<IdeaStats> = {
        success: true,
        message: 'ok',
        data: mockStats,
      };

      service.getIdeaStatistics().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.total).toBe(100);
        expect(res.data?.promoted).toBe(25);
      });

      const req = httpMock.expectOne(`${baseUrl}/idea-statistics`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should return zeros for an empty system', () => {
      const mockStats: IdeaStats = {
        total: 0,
        open: 0,
        promoted: 0,
        closed: 0,
      };
      const raw: ApiResponse<IdeaStats> = {
        success: true,
        message: 'ok',
        data: mockStats,
      };

      service.getIdeaStatistics().subscribe((res) => {
        expect(res.data?.total).toBe(0);
      });

      httpMock.expectOne(`${baseUrl}/idea-statistics`).flush(raw);
    });
  });

  // getGroupEngagement

  describe('getGroupEngagement()', () => {
    it('should GET /analytics/group-engagement', () => {
      const mockEngagement: GroupEngagement[] = [
        {
          id: 1,
          name: 'Innovation Lab',
          ideaCount: 30,
          voteCount: 150,
          isMember: true,
        },
      ];
      const raw: ApiResponse<GroupEngagement[]> = {
        success: true,
        message: 'ok',
        data: mockEngagement,
      };

      service.getGroupEngagement().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.[0].name).toBe('Innovation Lab');
        expect(res.data?.[0].voteCount).toBe(150);
      });

      const req = httpMock.expectOne(`${baseUrl}/group-engagement`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should handle non-member groups correctly', () => {
      const mockEngagement: GroupEngagement[] = [
        {
          id: 2,
          name: 'External Group',
          ideaCount: 5,
          voteCount: 10,
          isMember: false,
        },
      ];
      const raw: ApiResponse<GroupEngagement[]> = {
        success: true,
        message: 'ok',
        data: mockEngagement,
      };

      service.getGroupEngagement().subscribe((res) => {
        expect(res.data?.[0].isMember).toBeFalse();
      });

      httpMock.expectOne(`${baseUrl}/group-engagement`).flush(raw);
    });
  });

  // getPersonalStats

  describe('getPersonalStats()', () => {
    it('should GET /analytics/personal-stats', () => {
      const mockStats: PersonalStats = {
        ideasCreated: 5,
        votesCast: 20,
        projectsInvolved: 3,
        groupsCreated: 1,
      };
      const raw: ApiResponse<PersonalStats> = {
        success: true,
        message: 'ok',
        data: mockStats,
      };

      service.getPersonalStats().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.ideasCreated).toBe(5);
        expect(res.data?.votesCast).toBe(20);
      });

      const req = httpMock.expectOne(`${baseUrl}/personal-stats`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should return zero stats for a new user', () => {
      const mockStats: PersonalStats = {
        ideasCreated: 0,
        votesCast: 0,
        projectsInvolved: 0,
        groupsCreated: 0,
      };
      const raw: ApiResponse<PersonalStats> = {
        success: true,
        message: 'ok',
        data: mockStats,
      };

      service.getPersonalStats().subscribe((res) => {
        expect(res.data?.projectsInvolved).toBe(0);
        expect(res.data?.groupsCreated).toBe(0);
      });

      httpMock.expectOne(`${baseUrl}/personal-stats`).flush(raw);
    });
  });
});
