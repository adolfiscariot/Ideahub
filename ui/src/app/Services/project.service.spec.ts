/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProjectService } from './project.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  Project,
  ProjectStatus,
  ProjectBackendDto,
  CreateProjectRequest,
} from '../Interfaces/Projects/project-interface';

describe('ProjectService', () => {
  let service: ProjectService;
  let http_mock: HttpTestingController;

  const api_url = `${'http://localhost:5065/api'}/project`;

  // Shared test data
  const mock_dto: ProjectBackendDto = {
    id: 1,
    title: 'Solar Energy Phase 1',
    description: 'First phase of deployment',
    status: 'Active',
    createdAt: '2024-01-01T00:00:00Z',
    overseenByUserName: 'Manager X',
    overseenByUserId: 'user-002',
    groupName: 'Engineering',
    ideaName: 'Solar Expansion',
    progress: 45,
  };

  const mock_project: Project = {
    id: 1,
    title: 'Solar Energy Phase 1',
    description: 'First phase of deployment',
    status: ProjectStatus.Active,
    createdAt: '2024-01-01T00:00:00Z',
    overseenBy: 'Manager X',
    overseenById: 'user-002',
    groupName: 'Engineering',
    ideaTitle: 'Solar Expansion',
    progress: 45,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ProjectService,
        {
          provide: AppConfigService,
          useValue: { apiUrl: 'http://localhost:5065/api' },
        },
      ],
    });
    service = TestBed.inject(ProjectService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // mapDtoToProject
  describe('Mapping Logic', () => {
    it('should correctly map ProjectBackendDto to Project interface', () => {
      // Testing the private method via a public call or by checking the results of getMyProjects
      // Since mapDtoToProject is private, we verify its result through getMyProjects()
      const mock_response: ApiResponse<ProjectBackendDto[]> = {
        success: true,
        message: 'ok',
        data: [mock_dto],
      };

      service.getMyProjects().subscribe((projects) => {
        const mapped = projects[0];
        expect(mapped.id).toBe(1);
        expect(mapped.overseenBy).toBe('Manager X');
        expect(mapped.overseenById).toBe('user-002');
        expect(mapped.progress).toBe(45);
      });

      http_mock.expectOne(`${api_url}/all`).flush(mock_response);
    });
  });

  // createProject
  describe('createProject()', () => {
    it('should POST with groupId and ideaId as query params', () => {
      const request: CreateProjectRequest = {
        title: 'T',
        description: 'D',
        overseenByEmail: 'e@e.com',
      };
      const mock_response: ApiResponse<{ projectId: number }> = {
        success: true,
        message: 'ok',
        data: { projectId: 123 },
      };

      service.createProject('g-1', 'i-1', request).subscribe((res) => {
        expect(res.data?.projectId).toBe(123);
      });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/create-project` &&
          r.params.get('groupId') === 'g-1' &&
          r.params.get('ideaId') === 'i-1',
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mock_response);
    });

    it('should propagate backend error messages', () => {
      const request: CreateProjectRequest = {
        title: 'T',
        description: 'D',
        overseenByEmail: 'e@e.com',
      };
      const error_response = { message: 'Quota exceeded' };

      service.createProject('g-1', 'i-1', request).subscribe({
        error: (err: Error) => expect(err.message).toBe('Quota exceeded'),
      });

      http_mock
        .expectOne((r) => r.url === `${api_url}/create-project`)
        .flush(error_response, { status: 400, statusText: 'Bad Request' });
    });
  });

  // REST actions
  describe('REST Lifecycle', () => {
    it('should GET project details by ID', () => {
      const mock_response: ApiResponse<Project> = {
        success: true,
        message: 'ok',
        data: mock_project,
      };

      service.getProjectById(1).subscribe((res) => {
        expect(res.data?.title).toBe('Solar Energy Phase 1');
      });

      http_mock.expectOne(`${api_url}/1`).flush(mock_response);
    });

    it('should PUT to update project', () => {
      const update = { title: 'Renewable energy' };
      const mock_response: ApiResponse<Project> = {
        success: true,
        message: 'ok',
        data: { ...mock_project, title: 'Renewable energy' },
      };

      service.updateProject(1, update).subscribe((res) => {
        expect(res.data?.title).toBe('Renewable energy');
      });

      const req = http_mock.expectOne(`${api_url}/1`);
      expect(req.request.method).toBe('PUT');
      req.flush(mock_response);
    });

    it('should DELETE project', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.deleteProject(1).subscribe();

      const req = http_mock.expectOne(`${api_url}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mock_response);
    });
  });

  // Permission Logic
  describe('Permission Helpers', () => {
    it('should allow update if user is creator or overseer', () => {
      const project: Project = { ...mock_project, createdByUserId: 'me' };
      expect(service.canUserUpdateProject(project, 'me')).toBeTrue();
      expect(service.canUserUpdateProject(project, 'user-002')).toBeTrue(); // oversawById
      expect(service.canUserUpdateProject(project, 'someone-else')).toBeFalse();
    });

    it('should only allow delete if user is creator', () => {
      const project: Project = { ...mock_project, createdByUserId: 'me' };
      expect(service.canUserDeleteProject(project, 'me')).toBeTrue();
      expect(service.canUserDeleteProject(project, 'user-002')).toBeFalse();
    });
  });

  // Formatting
  describe('Utility Methods', () => {
    it('should format PascalCase status to spaced text', () => {
      expect(service.formatStatus('InDevelopment')).toBe('In Development');
      expect(service.formatStatus('Active')).toBe('Active');
    });

    it('should return all possible statuses', () => {
      const statuses = service.getAllStatuses();
      expect(statuses).toContain('Active');
      expect(statuses.length).toBe(5);
    });
  });
});
