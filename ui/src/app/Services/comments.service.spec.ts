/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CommentsService } from './comments.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  viewComment,
  createComment,
} from '../Interfaces/Ideas/idea-interfaces';

interface RawMockResponse<T> {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T;
}

describe('CommentsService', () => {
  let service: CommentsService;
  let httpMock: HttpTestingController;

  const apiUrl = `${'http://localhost:5065/api'}/comment`;

  // Shared test data

  const mockComment: viewComment = {
    id: 1,
    content: 'Great idea!',
    createdAt: '2024-06-01T10:00:00Z',
    userId: 'user-abc',
    ideaId: 42,
  };

  const mockCommentPayload: createComment = {
    content: 'This could be improved with AI.',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CommentsService, { provide: AppConfigService, useValue: { apiUrl: 'http://localhost:5065/api' } }],
    });
    service = TestBed.inject(CommentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // convertResponse normalization

  describe('convertResponse (via getComments)', () => {
    it('should prefer response.status over response.success', () => {
      const raw: RawMockResponse<viewComment[]> = {
        status: true,
        success: false,
        message: 'ok',
        data: [],
      };

      service.getComments(1).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      httpMock.expectOne(`${apiUrl}/view-comments?ideaId=1`).flush(raw);
    });

    it('should fall back to response.success when status is absent', () => {
      const raw: ApiResponse<viewComment[]> = {
        success: true,
        message: 'ok',
        data: [],
      };

      service.getComments(1).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      httpMock.expectOne(`${apiUrl}/view-comments?ideaId=1`).flush(raw);
    });

    it('should default success to false when both status and success are falsy', () => {
      const raw: RawMockResponse<viewComment[]> = {
        message: 'unauthorized',
        data: [],
      };

      service.getComments(1).subscribe((res) => {
        expect(res.success).toBeFalse();
      });

      httpMock.expectOne(`${apiUrl}/view-comments?ideaId=1`).flush(raw);
    });

    it('should default message to empty string when absent', () => {
      const raw: RawMockResponse<viewComment[]> = { success: true };

      service.getComments(1).subscribe((res) => {
        expect(res.message).toBe('');
      });

      httpMock.expectOne(`${apiUrl}/view-comments?ideaId=1`).flush(raw);
    });
  });

  // getComments

  describe('getComments(ideaId)', () => {
    it('should GET /comment/view-comments?ideaId={id}', () => {
      const raw: ApiResponse<viewComment[]> = {
        success: true,
        message: 'ok',
        data: [mockComment],
      };

      service.getComments(42).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.length).toBe(1);
        expect(res.data?.[0].content).toBe('Great idea!');
      });

      const req = httpMock.expectOne(`${apiUrl}/view-comments?ideaId=42`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should correctly embed the ideaId in the query string', () => {
      const raw: ApiResponse<viewComment[]> = {
        success: true,
        message: 'ok',
        data: [],
      };

      service.getComments(99).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/view-comments?ideaId=99`);
      expect(req.request.url).toContain('ideaId=99');
      req.flush(raw);
    });

    it('should return an empty array when the idea has no comments', () => {
      const raw: ApiResponse<viewComment[]> = {
        success: true,
        message: 'no comments',
        data: [],
      };

      service.getComments(10).subscribe((res) => {
        expect(res.data).toEqual([]);
      });

      httpMock.expectOne(`${apiUrl}/view-comments?ideaId=10`).flush(raw);
    });

    it('should return multiple comments', () => {
      const comments: viewComment[] = [
        { id: 1, content: 'First', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, content: 'Second', createdAt: '2024-01-02T00:00:00Z' },
      ];
      const raw: ApiResponse<viewComment[]> = {
        success: true,
        message: 'ok',
        data: comments,
      };

      service.getComments(5).subscribe((res) => {
        expect(res.data?.length).toBe(2);
        expect(res.data?.[1].content).toBe('Second');
      });

      httpMock.expectOne(`${apiUrl}/view-comments?ideaId=5`).flush(raw);
    });
  });

  // postComment

  describe('postComment(ideaId, payload)', () => {
    it('should POST to /comment/create-comment?ideaId={id}', () => {
      const raw: ApiResponse<viewComment> = {
        success: true,
        message: 'created',
        data: mockComment,
      };

      service.postComment(42, mockCommentPayload).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.id).toBe(1);
        expect(res.data?.content).toBe('Great idea!');
      });

      const req = httpMock.expectOne(`${apiUrl}/create-comment?ideaId=42`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCommentPayload);
      req.flush(raw);
    });

    it('should send the comment content in the request body', () => {
      const raw: ApiResponse<viewComment> = {
        success: true,
        message: 'ok',
        data: mockComment,
      };
      const payload: createComment = { content: 'Custom content' };

      service.postComment(7, payload).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/create-comment?ideaId=7`);
      expect(req.request.body.content).toBe('Custom content');
      req.flush(raw);
    });

    it('should embed ideaId correctly in the URL query string', () => {
      const raw: ApiResponse<viewComment> = {
        success: true,
        message: 'ok',
        data: mockComment,
      };

      service.postComment(123, mockCommentPayload).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/create-comment?ideaId=123`);
      expect(req.request.url).toContain('ideaId=123');
      req.flush(raw);
    });

    it('should handle an unsuccessful post response', () => {
      const raw: ApiResponse<viewComment> = {
        success: false,
        message: 'Unauthorized',
      };

      service.postComment(42, mockCommentPayload).subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toBe('Unauthorized');
      });

      httpMock.expectOne(`${apiUrl}/create-comment?ideaId=42`).flush(raw);
    });
  });

  // deleteComment

  describe('deleteComment(commentId)', () => {
    it('should DELETE /comment/{commentId}', () => {
      const raw: ApiResponse<void> = { success: true, message: 'deleted' };

      service.deleteComment(1).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.message).toBe('deleted');
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(raw);
    });

    it('should embed the commentId in the URL path', () => {
      const raw: ApiResponse<void> = { success: true, message: 'ok' };

      service.deleteComment(55).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/55`);
      expect(req.request.url).toContain('/55');
      req.flush(raw);
    });

    it('should handle a failed delete (e.g. comment not found)', () => {
      const raw: ApiResponse<void> = {
        success: false,
        message: 'Comment not found',
      };

      service.deleteComment(999).subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toBe('Comment not found');
      });

      httpMock.expectOne(`${apiUrl}/999`).flush(raw);
    });
  });
});
