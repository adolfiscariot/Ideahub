/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { MediaService } from './media.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { Media, MediaType } from '../Interfaces/Media/media-interface';
import { environment } from '../../environments/environment';

interface RawMockResponse<T> {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T;
}

describe('MediaService', () => {
  let service: MediaService;
  let http_mock: HttpTestingController;

  const api_url = `${environment.apiUrl}/media`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MediaService],
    });
    service = TestBed.inject(MediaService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // validateFileSize
  describe('validateFileSize()', () => {
    it('should return valid:true for files under 20MB', () => {
      const small_blob = new Blob(['a'.repeat(1024)], { type: 'text/plain' });
      const small_file = new File([small_blob], 'test.txt');

      const result = service.validateFileSize(small_file);
      expect(result.valid).toBeTrue();
    });

    it('should return valid:false for files over 20MB', () => {
      // Create a mock File object with a manually defined large size
      const large_file = { size: 21 * 1024 * 1024 } as File;

      const result = service.validateFileSize(large_file);
      expect(result.valid).toBeFalse();
      expect(result.message).toContain('exceeds 20MB limit');
    });
  });

  // detectMediaType
  describe('detectMediaType()', () => {
    it('should detect Image types', () => {
      const file = { name: 'photo.JPG' } as File;
      expect(service.detectMediaType(file)).toBe(MediaType.Image);
    });

    it('should detect Video types', () => {
      const file = { name: 'movie.mp4' } as File;
      expect(service.detectMediaType(file)).toBe(MediaType.Video);
    });

    it('should default to Document for unknown extensions', () => {
      const file = { name: 'data.csv' } as File;
      expect(service.detectMediaType(file)).toBe(MediaType.Document);
    });
  });

  // convertResponse
  describe('convertResponse', () => {
    it('should map status to success', () => {
      const raw: RawMockResponse<Media> = { status: true, message: 'ok' };

      service.deleteMedia(1).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      http_mock.expectOne(`${api_url}/1`).flush(raw);
    });
  });

  // uploadMedia
  describe('uploadMedia()', () => {
    it('should POST to /media/upload-media with FormData and params', () => {
      const blob = new Blob(['data'], { type: 'image/png' });
      const file = new File([blob], 'icon.png');
      const mock_media: Media = {
        id: 1,
        filePath: '/path/icon.png',
        mediaType: MediaType.Image,
        createdAt: '',
      };
      const mock_response: ApiResponse<Media> = {
        success: true,
        message: 'ok',
        data: mock_media,
      };

      service
        .uploadMedia(file, MediaType.Image, 'idea-123', undefined, 42)
        .subscribe((res) => {
          expect(res.data?.id).toBe(1);
        });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/upload-media` &&
          r.params.get('ideaId') === 'idea-123' &&
          r.params.get('projectId') === '42',
      );

      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();

      const form_data = req.request.body as FormData;
      expect(form_data.get('File')).toBeTruthy();
      expect(form_data.get('MediaType')).toBe(MediaType.Image);

      req.flush(mock_response);
    });
  });

  // viewMedia
  describe('viewMedia()', () => {
    it('should GET /media/view-media with complex params', () => {
      const mock_response: ApiResponse<Media[]> = {
        success: true,
        message: 'ok',
        data: [],
      };

      service.viewMedia('idea-1', 10, 20, 30, 40, 50).subscribe();

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/view-media` &&
          r.params.get('ideaId') === 'idea-1' &&
          r.params.get('commentId') === '10' &&
          r.params.get('projectId') === '20' &&
          r.params.get('projectTaskId') === '30' &&
          r.params.get('subTaskId') === '40' &&
          r.params.get('timesheetId') === '50',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });

  // deleteMedia
  describe('deleteMedia()', () => {
    it('should DELETE at /media/{id}', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.deleteMedia(501).subscribe();

      const req = http_mock.expectOne(`${api_url}/501`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mock_response);
    });
  });
});
