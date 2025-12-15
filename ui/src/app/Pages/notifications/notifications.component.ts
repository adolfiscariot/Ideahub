import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { GroupsService } from '../../Services/groups.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnChanges {

  @Input() groupId: string = '';  // <-- dynamic groupId from parent
  requests: string[] = [];
  loading = false;
  errorMessage = '';

  constructor(private groupsService: GroupsService) {}

  ngOnInit(): void {
    if (this.groupId) {
      this.loadRequests(this.groupId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['groupId'] && this.groupId) {
      this.loadRequests(this.groupId);
    }
  }

  loadRequests(groupId: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.groupsService.viewRequests(groupId).subscribe({
      next: (response) => {
        this.requests = response.data || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = "Could not load requests";
        this.loading = false;
      }
    });
  }

  acceptRequest(userId: string): void {
    if (!this.groupId) return;

    this.groupsService.acceptRequest(this.groupId, userId).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r !== userId);
      },
      error: () => alert("Failed to accept request")
    });
  }

  rejectRequest(userId: string): void {
    if (!this.groupId) return;

    this.groupsService.rejectRequest(this.groupId, userId).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r !== userId);
      },
      error: () => alert("Failed to reject request")
    });
  }
}
