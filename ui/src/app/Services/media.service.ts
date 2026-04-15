import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Media, MediaType } from '../Interfaces/Media/media-interface';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private readonly apiUrl = `${environment.apiUrl}/media`;
  private http = inject(HttpClient);

  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data
    };
  }

  validateFileSize(file: File): { valid: boolean; message?: string } {
    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      return {
        valid: false,
        message: `File size exceeds 20MB limit`
      };
    }
    return { valid: true };
  }

  detectMediaType(file: File): MediaType {
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(extension)) {
      return MediaType.Image;
    }
    if (['.mp4', '.mov', '.avi', '.wmv'].includes(extension)) {
      return MediaType.Video;
    }
    return MediaType.Document;
  }

  uploadMedia(
    file: File,
    mediaType: MediaType,
    ideaId?: string | number,
    commentId?: string | number,
    projectId?: number,
    projectTaskId?: number,
    subTaskId?: number,
    timesheetId?: number
  ): Observable<ApiResponse<Media>> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('MediaType', mediaType);

    let params = new HttpParams();
    if (ideaId) params = params.set('ideaId', ideaId.toString());
    if (commentId) params = params.set('commentId', commentId.toString());
    if (projectId) params = params.set('projectId', projectId.toString());
    if (projectTaskId) params = params.set('projectTaskId', projectTaskId.toString());
    if (subTaskId) params = params.set('subTaskId', subTaskId.toString());
    if (timesheetId) params = params.set('timesheetId', timesheetId.toString());

    return this.http.post<ApiResponse<Media>>(`${this.apiUrl}/upload-media`, formData, { params })
      .pipe(map(response => this.convertResponse<Media>(response)));
  }

  viewMedia(
    ideaId?: string | number,
    commentId?: string | number,
    projectId?: number,
    projectTaskId?: number,
    subTaskId?: number,
    timesheetId?: number
  ): Observable<ApiResponse<Media[]>> {
    let params = new HttpParams();

    if (ideaId) params = params.set('ideaId', ideaId.toString());
    if (commentId) params = params.set('commentId', commentId.toString());
    if (projectId) params = params.set('projectId', projectId.toString());
    if (projectTaskId) params = params.set('projectTaskId', projectTaskId.toString());
    if (subTaskId) params = params.set('subTaskId', subTaskId.toString());
    if (timesheetId) params = params.set('timesheetId', timesheetId.toString());

    return this.http.get<ApiResponse<Media[]>>(`${this.apiUrl}/view-media`, { params })
      .pipe(map(response => this.convertResponse<Media[]>(response)));
  }

  deleteMedia(mediaId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${mediaId}`)
      .pipe(map(response => this.convertResponse<void>(response)));
  }
}