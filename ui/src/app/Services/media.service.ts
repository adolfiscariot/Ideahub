import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Media, MediaType, ApiResponse } from '../Interfaces/Media/media-interface';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private apiUrl = `${environment.apiUrl}/media`;

  constructor(private http: HttpClient) { }

  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
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
    ideaId?: number,
    commentId?: number,
    projectId?: number
  ): Observable<ApiResponse<Media>> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('MediaType', mediaType);

    let params = new HttpParams();
    if (ideaId) params = params.set('ideaId', ideaId.toString());
    if (commentId) params = params.set('commentId', commentId.toString());
    if (projectId) params = params.set('projectId', projectId.toString());

    return this.http.post<any>(`${this.apiUrl}/upload-media`, formData, { params })
      .pipe(map(response => this.convertResponse<Media>(response)));
  }

  viewMedia(
    ideaId?: number,
    commentId?: number,
    projectId?: number
  ): Observable<ApiResponse<Media[]>> {
    let params = new HttpParams();

    if (ideaId) params = params.set('ideaId', ideaId.toString());
    if (commentId) params = params.set('commentId', commentId.toString());
    if (projectId) params = params.set('projectId', projectId.toString());

    return this.http.get<any>(`${this.apiUrl}/view-media`, { params })
      .pipe(map(response => this.convertResponse<Media[]>(response)));
  }

  deleteMedia(mediaId: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/${mediaId}`)
      .pipe(map(response => this.convertResponse<any>(response)));
  }
}