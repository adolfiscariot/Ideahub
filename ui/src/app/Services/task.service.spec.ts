/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  TaskDetails,
  TaskDto,
  SubTaskDetails,
  SubTaskDto,
} from '../Interfaces/Tasks/task-interface';

describe('TaskService', () => {
  let service: TaskService;
  let http_mock: HttpTestingController;

  const api_url = `${'http://localhost:5065/api'}/task`;

  // Shared test data
  const mock_task: TaskDetails = {
    id: 1,
    title: 'Design UI',
    description: 'Create mockups',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-02T00:00:00Z',
    labels: 'UI,Design',
    isCompleted: false,
    taskAssignees: [],
    projectId: 101,
    mediaCount: 0,
    subTasks: [],
  };

  const mock_subtask: SubTaskDetails = {
    id: 10,
    projectTaskId: 1,
    title: 'Typography',
    description: 'Choose fonts',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-02T00:00:00Z',
    isCompleted: false,
    subTaskAssignees: [],
    mediaCount: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TaskService,
        {
          provide: AppConfigService,
          useValue: { apiUrl: 'http://localhost:5065/api' },
        },
      ],
    });
    service = TestBed.inject(TaskService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Task CRUD
  describe('Primary Tasks', () => {
    it('should GET /get-tasks/{projectId}', () => {
      const mock_response: ApiResponse<TaskDetails[]> = {
        success: true,
        message: 'ok',
        data: [mock_task],
      };

      service.getProjectTasks(101).subscribe((res) => {
        expect(res.data?.length).toBe(1);
        expect(res.data?.[0].title).toBe('Design UI');
      });

      const req = http_mock.expectOne(`${api_url}/get-tasks/101`);
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });

    it('should POST /create/{projectId}', () => {
      const dto: TaskDto = {
        title: 'New Task',
        description: 'Desc',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        labels: 'Dev',
        taskAssignees: [],
      };
      const mock_response: ApiResponse<TaskDetails> = {
        success: true,
        message: 'ok',
        data: { ...mock_task, title: 'New Task' },
      };

      service.createTask(101, dto).subscribe();

      const req = http_mock.expectOne(`${api_url}/create/101`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mock_response);
    });

    it('should PUT /update-task/{taskId}', () => {
      const mock_response: ApiResponse<void> = {
        success: true,
        message: 'updated',
      };

      service.updateTask(1, { isCompleted: true }).subscribe();

      const req = http_mock.expectOne(`${api_url}/update-task/1`);
      expect(req.request.method).toBe('PUT');
      req.flush(mock_response);
    });

    it('should DELETE /delete-task/{taskId}', () => {
      const mock_response: ApiResponse<void> = {
        success: true,
        message: 'deleted',
      };

      service.deleteTask(1).subscribe();

      const req = http_mock.expectOne(`${api_url}/delete-task/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mock_response);
    });
  });

  // Subtask CRUD
  describe('Subtasks', () => {
    it('should POST /create-subtask/{taskId}', () => {
      const dto: SubTaskDto = {
        title: 'New Subtask',
        description: 'Sub desc',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        subTaskAssignees: [],
      };
      const mock_response: ApiResponse<SubTaskDetails> = {
        success: true,
        message: 'ok',
        data: mock_subtask,
      };

      service.createSubTask(1, dto).subscribe();

      const req = http_mock.expectOne(`${api_url}/create-subtask/1`);
      expect(req.request.method).toBe('POST');
      req.flush(mock_response);
    });

    it('should PUT /update-subtask/{subTaskId}', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.updateSubTask(10, { isCompleted: true }).subscribe();

      const req = http_mock.expectOne(`${api_url}/update-subtask/10`);
      expect(req.request.method).toBe('PUT');
      req.flush(mock_response);
    });

    it('should DELETE /delete-subtask/{subTaskId}', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.deleteSubTask(10).subscribe();

      const req = http_mock.expectOne(`${api_url}/delete-subtask/10`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mock_response);
    });
  });
});
