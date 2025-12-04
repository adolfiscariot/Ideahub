import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AddGroup } from '../../Interfaces/Groups/groups-interfaces';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-groups',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class GroupsComponent implements OnInit {
  groups: any[] = [];
  title = 'Groups';
  subtitle = 'Explore and join groups to collaborate on ideas and projects.';
  showCreateForm = false;
  createGroupForm: FormGroup;
  isSubmitting = false;
  isLoading: boolean = true;

  constructor(
    private groupsService: GroupsService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  // ===== GROUP LOADING METHODS =====

  loadGroups(): void {
  this.isLoading = true;
  this.groupsService.getGroups().subscribe({
    next: (response: any) => {
      this.isLoading = false;
      const isSuccess = response.success || response.status;
      if (isSuccess && response.data) {
        // Backend should return IsMember field
        this.groups = response.data.map((group: any) => ({
          id: group.Id || group.id,
          name: group.Name || group.name,
          description: group.Description || group.description,
          isActive: group.IsActive !== false, // default to true
          createdAt: group.CreatedAt || group.createdAt,
          createdByUserId: group.CreatedByUserId || group.createdByUserId,
          createdByUser: group.CreatedByUser || group.createdByUser,
          
          // THE KEY FIELD - check all possible property names
          isJoined: group.IsMember || group.isMember || group.IsJoined || group.isJoined || false,
          
          // Optional fields
          hasPendingRequest: group.HasPendingRequest || group.hasPendingRequest || false,
          memberCount: group.MemberCount || group.memberCount || 0,
          ideaCount: group.IdeaCount || group.ideaCount || 0
        }));
        
        console.log('Loaded groups:', this.groups); // Debug log
      }
    },
    error: (error: any) => {
      this.isLoading = false;
      console.error('Error loading groups:', error);
    }
  });
}

  // ===== GROUP JOIN/LEAVE METHODS =====

  onJoinGroup(groupId: number): void {
    this.groupsService.joinGroup(groupId).subscribe({
      next: (response: any) => {
        const isSuccess = response.success || response.status;
        if (isSuccess) {
          alert('Join request sent! Awaiting admin approval.');
        } else {
          if (response.message?.includes('authenticated') || 
              response.message?.includes('login') || 
              response.message?.includes('User ID')) {
            alert('Please login to join groups.');
          } else if (response.message?.includes('already joined')) {
            alert('You have already requested to join this group.');
          } else {
            alert(response.message || 'Failed to join group.');
          }
        }
      },
      error: (error: any) => {
        console.error('Error joining group:', error);
        
        if (error.status === 401) {
          alert('Please login to join groups.');
        } else if (error.status === 400) {
          alert('Bad request. Please check your input.');
        } else {
          alert('Failed to join group. Please try again.');
        }
      }
    });
  }

  // ===== GROUP CREATION METHODS =====

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createGroupForm.reset();
    }
  }

  onCreateGroup(): void {
  if (this.createGroupForm.invalid) {
    this.createGroupForm.markAllAsTouched();
    return;
  }

  this.isSubmitting = true;
  const newGroup: AddGroup = this.createGroupForm.value;

  this.groupsService.createGroup(newGroup).subscribe({
    next: (response: any) => {
      this.isSubmitting = false;
      const isSuccess = response.success || response.status;
      if (isSuccess) {
        alert('Group created successfully!');
        
        // Create temporary group object with isJoined: true
        const tempGroup = {
          ...newGroup,
          id: response.data?.id || Date.now(), // Temporary ID
          name: newGroup.name,
          description: newGroup.description,
          isJoined: true, // ← THIS IS THE KEY FIX
          memberCount: 1,
          ideaCount: 0,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        // Add to beginning of list immediately
        this.groups.unshift(tempGroup);
        
        // Reset form
        this.createGroupForm.reset();
        this.showCreateForm = false;
        
        // Refresh from server after 1 second to get real data
        setTimeout(() => {
          this.loadGroups();
        }, 1000);
        
      } else {
        // Error handling...
        if (response.message?.includes('authenticated') || 
            response.message?.includes('User ID') || 
            response.message?.includes('login')) {
          alert('Please login to create a group.');
        } else {
          alert(response.message || 'Failed to create group.');
        }
      }
    },
    error: (error: any) => {
      this.isSubmitting = false;
      console.error('Error creating group:', error);
      
      if (error.status === 401) {
        alert('Please login to create a group.');
      } else if (error.status === 400) {
        alert('Invalid group data. Please check your input.');
      } else {
        alert('Failed to create group. Please try again.');
      }
    }
  });
}

  onCancelCreate(): void {
    this.showCreateForm = false;
    this.createGroupForm.reset();
  }

  // ===== GROUP VIEWING METHODS =====

  viewMembers(groupId: number): void {
    if (groupId === 0) return;
    
    this.groupsService.getGroupMembers(groupId).subscribe({
      next: (response: any) => {
        const isSuccess = response.success || response.status;
        if (isSuccess && response.data) {
          if (response.data.length === 0) {
            alert('This group has no members yet.');
            return;
          }
          
          const memberList = response.data.map((member: any) => 
            `${member.UserName || member.displayName || 'Unknown Member'} (${member.Email || member.email || 'No email'})`
          ).join('\n');
          
          alert(`Group Members:\n\n${memberList}`);
        } else {
          alert(response.message || 'Failed to load members.');
        }
      },
      error: (error: any) => {
        console.error('Error loading members:', error);
        alert('Failed to load members. Please try again.');
      }
    });
  }

  viewDetails(group: any): void {
    const details = `
Group Details:
===============
Name: ${group.name || group.Name}
Description: ${group.description || group.Description}
Created By: ${group.createdByUser?.DisplayName || group.DisplayName || 'Unknown'}
Created: ${this.formatDate(group.createdAt)}
${group.isJoined ? '✓ You are a member' : '○ You are not a member'}
${group.isDeleted ? '⚠️ This group has been deleted' : ''}
    `;
    alert(details);
  }

  viewPendingRequests(groupId: number): void {
    this.groupsService.getPendingRequests(groupId).subscribe({
      next: (response: any) => {
        const isSuccess = response.success || response.status;
        if (isSuccess && response.data) {
          if (response.data.length === 0) {
            alert('No pending requests for this group.');
            return;
          }
          
          const requestList = response.data.map((req: any, index: number) => 
            `Request ${index + 1}: User ID: ${req}`
          ).join('\n\n');
          
          alert(`Pending Join Requests:\n\n${requestList}\n\nTotal: ${response.data.length} request(s)`);
        } else {
          alert(response.message || 'Failed to load pending requests.');
        }
      },
      error: (error: any) => {
        console.error('Error loading pending requests:', error);
        alert('Failed to load pending requests. Please try again.');
      }
    });
  }

  // ===== HELPER METHODS =====

  formatDate(date: any): string {
    if (!date) return 'Unknown date';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  }

  trackById(index: number, item: any): number {
    return item.id || index;
  }

  // ===== PERMISSION METHODS =====

  canViewMembers(group: any): boolean {
    return true;
  }

  canConfigureGroup(group: any): boolean {
    return this.authService.isGroupAdmin() || this.authService.isSuperAdmin();
  }

  canViewIdeas(group: any): boolean {
    return true;
  }

  isUserLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // ===== FORM GETTER METHODS =====

  get name() { 
    return this.createGroupForm.get('name'); 
  }
  
  get description() { 
    return this.createGroupForm.get('description'); 
  }

  // ===== STUB METHODS =====

  viewIdeas(groupId: number): void {
    alert(`Viewing ideas for group ID: ${groupId}\n\nFeature coming soon!`);
  }

  onConfigureGroup(group: any): void {
    alert(`Configure group: ${group.name || group.Name}\n\nGroup Settings:\n- Edit group info\n- Manage members\n- Change privacy settings\n- Delete group\n\nFeature coming soon!`);
  }

  hasPendingRequest(groupId: number): boolean {
    return false;
  }

  getPendingRequestCount(groupId: number): number {
    return 0;
  }
}