import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  Subject,
  switchMap,
  tap,
  map,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';

export interface CommentNotification {
  id: number;
  isRead: boolean;
  createdAt: string;
  comment: {
    id: number;
    content: string;
    createdAt: string;
    commenterName: string;
    ideaTitle: string | null;
    ideaId: number;
    groupId: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly baseUrl = `${environment.apiUrl}/notification`;

  private _unreadCount = new BehaviorSubject<number>(0);
  unreadCount$ = this._unreadCount.asObservable();

  private _fetchTrigger = new Subject<void>();

  private http = inject(HttpClient);

  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  constructor() {
    this._fetchTrigger
      .pipe(
        switchMap(() =>
          this.http
            .get<ApiResponse<{ count: number }>>(`${this.baseUrl}/unread-count`)
            .pipe(
              map((res: ApiResponse<{ count: number }>) =>
                this.convertResponse<{ count: number }>(res),
              ),
            ),
        ),
      )
      .subscribe({
        next: (res: ApiResponse<{ count: number }>) =>
          this._unreadCount.next(res.data?.count ?? 0),
        error: () => this._unreadCount.next(0),
      });
  }

  getNotifications(): Observable<ApiResponse<CommentNotification[]>> {
    return this.http
      .get<
        ApiResponse<CommentNotification[]>
      >(`${this.baseUrl}/my-notifications`)
      .pipe(
        map((res: ApiResponse<CommentNotification[]>) =>
          this.convertResponse<CommentNotification[]>(res),
        ),
      );
  }

  fetchUnreadCount(): void {
    this._fetchTrigger.next();
  }

  markAsRead(id: number): Observable<ApiResponse<void>> {
    return this.http
      .patch<ApiResponse<void>>(`${this.baseUrl}/mark-read/${id}`, {})
      .pipe(
        map((res: ApiResponse<void>) => this.convertResponse<void>(res)),
        tap(() => {
          const current = this._unreadCount.value;
          if (current > 0) this._unreadCount.next(current - 1);
        }),
      );
  }

  markAllAsRead(): Observable<ApiResponse<void>> {
    return this.http
      .patch<ApiResponse<void>>(`${this.baseUrl}/mark-all-read`, {})
      .pipe(
        map((res: ApiResponse<void>) => this.convertResponse<void>(res)),
        tap(() => this._unreadCount.next(0)),
      );
  }

  incrementUnread(): void {
    this._unreadCount.next(this._unreadCount.value + 1);
  }

  setUnreadCount(count: number): void {
    this._unreadCount.next(count);
  }
}
