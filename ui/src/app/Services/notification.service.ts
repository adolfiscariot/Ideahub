import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, switchMap, tap } from 'rxjs';
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
    providedIn: 'root'
})
export class NotificationService {
    private readonly baseUrl = `${environment.apiUrl}/notification`;

    private _unreadCount = new BehaviorSubject<number>(0);
    unreadCount$ = this._unreadCount.asObservable();

    private _fetchTrigger = new Subject<void>();

    private http = inject(HttpClient);
    constructor() {
        this._fetchTrigger.pipe(
            switchMap(() =>
                this.http.get<ApiResponse<{ count: number }>>(`${this.baseUrl}/unread-count`)
            )
        ).subscribe({
            next: (res) => this._unreadCount.next(res.data?.count ?? 0),
            error: () => this._unreadCount.next(0)
        });
    }

    getNotifications(): Observable<ApiResponse<CommentNotification[]>> {
        return this.http.get<ApiResponse<CommentNotification[]>>(`${this.baseUrl}/my-notifications`);
    }

    fetchUnreadCount(): void {
        this._fetchTrigger.next();
    }

    markAsRead(id: number): Observable<any> {
        return this.http.patch(`${this.baseUrl}/mark-read/${id}`, {}).pipe(
            tap(() => {
                const current = this._unreadCount.value;
                if (current > 0) this._unreadCount.next(current - 1);
            })
        );
    }

    markAllAsRead(): Observable<any> {
        return this.http.patch(`${this.baseUrl}/mark-all-read`, {}).pipe(
            tap(() => this._unreadCount.next(0))
        );
    }

    incrementUnread(): void {
        this._unreadCount.next(this._unreadCount.value + 1);
    }

    setUnreadCount(count: number): void {
        this._unreadCount.next(count);
    }
}
