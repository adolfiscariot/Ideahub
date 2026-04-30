/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TimesheetService } from './timesheet.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  TimesheetDto,
  RelevantTask,
} from '../Interfaces/Timesheet/timesheet-interface';

describe('TimesheetService', () => {
  let service: TimesheetService;
  let http_mock: HttpTestingController;

  const api_url = `${'http://localhost:5065/api'}/timesheet`;

  // Shared test data
  const mock_log: TimesheetDto = {
    id: 1,
    taskId: 10,
    taskTitle: 'Design',
    userId: 'user-1',
    userName: 'Alice',
    hoursSpent: 4,
    workDate: '2024-01-01',
    description: 'UI Work',
    hasBlocker: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TimesheetService, { provide: AppConfigService, useValue: { apiUrl: 'http://localhost:5065/api' } }],
    });
    service = TestBed.inject(TimesheetService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Bulk Logging
  describe('bulkLogWork()', () => {
    it('should POST /bulk-timesheets with projectId query param', () => {
      const logs: TimesheetDto[] = [mock_log];
      const mock_response: ApiResponse<{
        createdIds: number[];
        invalidRows: unknown[];
      }> = {
        success: true,
        message: 'ok',
        data: { createdIds: [1], invalidRows: [] },
      };

      service.bulkLogWork(101, logs).subscribe((res) => {
        expect(res.data?.createdIds).toEqual([1]);
      });

      const req = http_mock.expectOne(
        `${api_url}/bulk-timesheets?projectId=101`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ logs });
      req.flush(mock_response);
    });
  });

  // Queries
  describe('Timesheet Queries', () => {
    it('should GET /relevant-tasks?projectId={id}', () => {
      const mock_response: ApiResponse<RelevantTask[]> = {
        success: true,
        message: 'ok',
        data: [{ id: 10, title: 'Task 1' } as RelevantTask],
      };

      service.getRelevantTasks(101).subscribe();

      const req = http_mock.expectOne(
        `${api_url}/relevant-tasks?projectId=101`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });

    it('should GET /my-timesheets with optional projectId', () => {
      const mock_response: ApiResponse<TimesheetDto[]> = {
        success: true,
        message: 'ok',
        data: [],
      };

      // Case 1: No project ID
      service.getMyLogs().subscribe();
      http_mock.expectOne(`${api_url}/my-timesheets`).flush(mock_response);

      // Case 2: With project ID
      service.getMyLogs(101).subscribe();
      http_mock
        .expectOne(`${api_url}/my-timesheets?projectId=101`)
        .flush(mock_response);
    });

    it('should GET /project-team?projectId={id}', () => {
      const mock_response: ApiResponse<{ id: string; name: string }[]> = {
        success: true,
        message: 'ok',
        data: [],
      };
      service.getProjectTeam(101).subscribe();
      http_mock
        .expectOne(`${api_url}/project-team?projectId=101`)
        .flush(mock_response);
    });
  });

  // REST actions
  describe('REST Lifecycle', () => {
    it('should DELETE /delete-timesheet/{id}', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };
      service.deleteLog(1).subscribe();
      const req = http_mock.expectOne(`${api_url}/delete-timesheet/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mock_response);
    });

    it('should PUT /update-timesheet/{id}', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };
      service.updateLog(1, mock_log).subscribe();
      const req = http_mock.expectOne(`${api_url}/update-timesheet/1`);
      expect(req.request.method).toBe('PUT');
      req.flush(mock_response);
    });
  });
});
