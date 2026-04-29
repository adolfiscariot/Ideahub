/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  NotificationService,
  CommentNotification,
} from './notification.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { environment } from '../../environments/environment';

interface RawMockResponse<T> {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T;
}

describe('NotificationService', () => {
  let service: NotificationService;
  let http_mock: HttpTestingController;

  const api_url = `${environment.apiUrl}/notification`;

  // Shared test data
  const mock_notification: CommentNotification = {
    id: 101,
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z',
    comment: {
      id: 501,
      content: 'Great idea!',
      createdAt: '2024-01-01T00:00:00Z',
      commenterName: 'Alice',
      ideaTitle: 'Processor Project',
      ideaId: 10,
      groupId: 1,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // unread count triggers
  describe('Unread Count Management', () => {
    it('should GET /unread-count when fetchUnreadCount is called', () => {
      const mock_response: ApiResponse<{ count: number }> = {
        success: true,
        message: 'ok',
        data: { count: 5 },
      };

      service.fetchUnreadCount();

      const req = http_mock.expectOne(`${api_url}/unread-count`);
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);

      service.unreadCount$.subscribe((count) => {
        expect(count).toBe(5);
      });
    });

    it('should increment unread count locally', () => {
      service.setUnreadCount(10);
      service.incrementUnread();
      service.unreadCount$.subscribe((count) => expect(count).toBe(11));
    });
  });

  // getNotifications
  describe('getNotifications()', () => {
    it('should GET /my-notifications', () => {
      const mock_response: ApiResponse<CommentNotification[]> = {
        success: true,
        message: 'ok',
        data: [mock_notification],
      };

      service.getNotifications().subscribe((res) => {
        expect(res.data?.length).toBe(1);
        expect(res.data?.[0].comment.commenterName).toBe('Alice');
      });

      const req = http_mock.expectOne(`${api_url}/my-notifications`);
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });

  // Read Actions
  describe('Reading Notifications', () => {
    it('should PATCH /mark-read/{id} and decrement count', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };
      service.setUnreadCount(5);

      service.markAsRead(101).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = http_mock.expectOne(`${api_url}/mark-read/101`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mock_response);

      service.unreadCount$.subscribe((count) => expect(count).toBe(4));
    });

    it('should PATCH /mark-all-read and reset count to 0', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };
      service.setUnreadCount(99);

      service.markAllAsRead().subscribe();

      const req = http_mock.expectOne(`${api_url}/mark-all-read`);
      req.flush(mock_response);

      service.unreadCount$.subscribe((count) => expect(count).toBe(0));
    });
  });

  // convertResponse stability
  describe('convertResponse', () => {
    it('should handle raw status as success', () => {
      const raw: RawMockResponse<null> = { status: true, message: 'done' };

      service.markAllAsRead().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      http_mock.expectOne(`${api_url}/mark-all-read`).flush(raw);
    });
  });
});
