import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GroupsService } from './groups.service';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private pendingRequestsSubject = new BehaviorSubject<number>(0);
  pendingRequests$ = this.pendingRequestsSubject.asObservable();

  private groupsService = inject(GroupsService);

  constructor() {
    this.refreshPendingRequests();
  }

  refreshPendingRequests() {
    this.groupsService.viewGlobalRequests().subscribe({
      next: (res: any) => {
        const count = res.data?.length ?? 0;
        this.pendingRequestsSubject.next(count);
      },
      error: () => this.pendingRequestsSubject.next(0)
    });
  }

  increment(count = 1) {
    this.pendingRequestsSubject.next(this.pendingRequestsSubject.value + count);
  }

  decrement(count = 1) {
    this.pendingRequestsSubject.next(Math.max(this.pendingRequestsSubject.value - count, 0));
  }

  set(count: number) {
    this.pendingRequestsSubject.next(count);
  }
}
