import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroupsService } from '../../../Services/groups.service';
import { ToastService } from '../../../Services/toast.service';
import { AuthService } from '../../../Services/auth/auth.service';

@Component({
  selector: 'app-group-members-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './group-members-modal.component.html',
  styleUrls: ['./group-members-modal.component.scss']
})
export class GroupMembersModalComponent implements OnInit {
  members: any[] = [];
  isLoading = true;
  joining = false;
  isOwner = false;
  currentUserEmail = '';

  public dialogRef = inject(MatDialogRef<GroupMembersModalComponent>);
  public data: { group: any } = inject(MAT_DIALOG_DATA);
  private groupsService = inject(GroupsService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  ngOnInit() {
    this.checkOwnership();
    this.loadMembers();
  }

  checkOwnership() {
    this.currentUserEmail = this.authService.getEmail() || '';
    // Assuming backend data.group has createdByUserId or createdByUser.email. 
    // We might need to check against userId or email depending on what data we have.
    // Ideally we check ID. But let's check what we have.

    // For now, let's try to determine if current user is owner.
    // We can use AuthService to get current user ID/Email.
    // IMPORTANT: The group object might need to have 'createdByUserId' passed in.

    const currentUserId = this.authService.getUserId();
    if (this.data.group.createdByUserId === currentUserId) {
      this.isOwner = true;
    }
  }

  loadMembers() {
    this.isLoading = true;
    this.groupsService.getGroupMembers(this.data.group.id).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const isSuccess = response.success || response.status;
        if (isSuccess && response.data) {
          this.members = response.data;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastService.show('Failed to load group members.', 'error');
      }
    });
  }

  joinGroup() {
    this.joining = true;
    this.groupsService.joinGroup(this.data.group.id).subscribe({
      next: (response: any) => {
        this.joining = false;
        const isSuccess = response.success || response.status;
        if (isSuccess) {
          this.toastService.show('Join request sent! Awaiting admin approval.', 'success');
          this.dialogRef.close({ joined: true });
        }
      },
      error: () => {
        this.joining = false;
        this.toastService.show('Failed to join group.', 'error');
      }
    });
  }

  transferOwnership(member: any) {
    const memberEmail = member.email || member.userEmail; // Adjust based on API response
    if (!memberEmail) {
      this.toastService.show('Cannot transfer to user without email.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to transfer ownership of this group to ${member.displayName || memberEmail}? You will lose admin privileges.`)) {
      return;
    }

    this.groupsService.transferOwnership(this.data.group.id, memberEmail).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastService.show('Ownership transferred successfully.', 'success');
          this.dialogRef.close({ ownershipTransferred: true });
        } else {
          this.toastService.show(response.message || 'Failed to transfer ownership.', 'error');
        }
      },
      error: () => {
        this.toastService.show('Failed to transfer ownership.', 'error');
      }
    });
  }

  getInitials(name: string) {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  close() {
    this.dialogRef.close();
  }
}