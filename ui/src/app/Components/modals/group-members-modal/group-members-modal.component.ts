import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroupsService } from '../../../Services/groups.service';

@Component({
  selector: 'app-group-members-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './group-members-modal.component.html',
  styleUrls: ['./group-members-modal.component.scss']
})
export class GroupMembersModalComponent implements OnInit {
  members: any[] = [];
  isLoading: boolean = true;
  joining: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<GroupMembersModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { group: any },
    private groupsService: GroupsService
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.isLoading = true;
    this.groupsService.getGroupMembers(this.data.group.id).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const isSuccess = response.success || response.status;
        if (isSuccess && response.data) {
          this.members = response.data;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error loading members:', error);
      }
    });
  }

  joinGroup(): void {
    this.joining = true;
    this.groupsService.joinGroup(this.data.group.id).subscribe({
      next: (response: any) => {
        this.joining = false;
        const isSuccess = response.success || response.status;
        if (isSuccess) {
          alert('Join request sent! Awaiting admin approval.');
          this.dialogRef.close({ joined: true });
        }
      },
      error: (error: any) => {
        this.joining = false;
        console.error('Error joining group:', error);
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  close(): void {
    this.dialogRef.close();
  }
}