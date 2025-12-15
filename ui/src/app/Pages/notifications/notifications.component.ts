import { Component, OnInit } from '@angular/core';
import { GroupsService } from '../../Services/groups.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {

  requests: string[] = [];
  loading = false;
  errorMessage = '';

  constructor(private groupsService: GroupsService) {}

  ngOnInit(): void {
    //this.loadRequests();
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


  acceptRequest(groupId: string, userId: string): void {
    this.groupsService.acceptRequest(groupId, userId).subscribe({
      next: () => {
        // Remove UI instantly
        this.requests = this.requests.filter(r => r !== userId);
      },
      error: () => {
        alert("Failed to accept request");
      }
    });
  }

  rejectRequest(groupId: string, userId: string): void {
    this.groupsService.rejectRequest(groupId, userId).subscribe({
      next: () => {
        // Remove UI instantly
        this.requests = this.requests.filter(r => r !== userId);
      },
      error: () => {
        alert("Failed to reject request");
      }
    });
  }
}
