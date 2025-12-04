import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AddGroup } from '../../Interfaces/Groups/groups-interfaces';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { GroupDetailsModalComponent } from '../../Components/modals/group-details-modal/group-details-modal.component';
import { GroupMembersModalComponent } from '../../Components/modals/group-members-modal/group-members-modal.component';

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
  // Group data
  groups: any[] = [];
  
  // Page content
  title = 'Groups';
  subtitle = 'Explore and join groups to collaborate on ideas and projects.';
  
  // Form state
  showCreateForm = false;
  createGroupForm: FormGroup;
  isSubmitting = false;
  isLoading: boolean = true;
  
  // Store pending requests for each group
  pendingRequests: Map<number, boolean> = new Map();
  
  // Store pending request counts for each group (for admins)
  pendingRequestCounts: Map<number, number> = new Map();

  constructor(
    private groupsService: GroupsService,
    private authService: AuthService,
    private dialog: MatDialog,
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
          this.groups = response.data.map((group: any) => ({
            ...group,
            id: group.id || 0,
            name: group.name || group.Name,
            description: group.description || group.Description,
            isJoined: group.isMember || group.IsMember || false,
            hasPendingRequest: group.hasPendingRequest || group.HasPendingRequest || false,
            memberCount: group.memberCount || group.MemberCount || 0,
            ideaCount: group.ideaCount || group.IdeaCount || 0,
            isActive: group.isActive || group.IsActive !== false,
            isDeleted: group.isDeleted || group.IsDeleted || false,
            createdAt: group.createdAt || group.CreatedAt || new Date().toISOString(),
            createdByUserId: group.createdByUserId || group.CreatedByUserId || 'unknown',
            createdByUser: group.createdByUser || group.CreatedByUser || {
              displayName: 'Unknown',
              email: ''
            }
          }));
          
          // Check pending requests for each group
          this.groups.forEach(group => {
            if (group.hasPendingRequest) {
              this.pendingRequests.set(group.id, true);
            }
          });
        } else {
          console.error('Failed to load groups:', response.message);
          this.groups = [];
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error loading groups:', error);
        this.groups = [];
      }
    });
  }

  // ===== MODAL METHODS =====

  openDetailsModal(group: any): void {
    this.dialog.open(GroupDetailsModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { group: group },
      panelClass: 'custom-modal'
    });
  }

  openMembersModal(group: any): void {
    this.dialog.open(GroupMembersModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { group: group },
      panelClass: 'custom-modal'
    });
  }

  openConfigureModal(group: any): void {
    // TODO: Create a configure modal component
    alert(`Configure group: ${group.name}\n\nGroup Settings:\n- Edit group info\n- Manage members\n- Change privacy settings\n- Delete group\n\nFeature coming soon!`);
  }

  openPendingRequestsModal(group: any): void {
    // TODO: Create a pending requests modal component
    this.viewPendingRequests(group.id);
  }

  // ===== GROUP JOIN/LEAVE METHODS =====

  onJoinGroup(groupId: number): void {
    // Check if user has pending request for this group
    if (this.hasPendingRequest(groupId)) {
      // Cancel pending request
      if (confirm('Cancel your join request?')) {
        this.cancelJoinRequest(groupId);
      }
      return;
    }

    // Check if user is already a member
    const group = this.groups.find(g => g.id === groupId);
    if (group?.isJoined) {
      // Leave group
      if (confirm('Are you sure you want to leave this group?')) {
        this.leaveGroup(groupId);
      }
      return;
    }

    // Join group (request to join)
    this.groupsService.joinGroup(groupId).subscribe({
      next: (response: any) => {
        const isSuccess = response.success || response.status;
        if (isSuccess) {
          alert('Join request sent! Awaiting admin approval.');
          this.pendingRequests.set(groupId, true);
          
          // Update the group's hasPendingRequest status
          const index = this.groups.findIndex(g => g.id === groupId);
          if (index !== -1) {
            this.groups[index].hasPendingRequest = true;
          }
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

  cancelJoinRequest(groupId: number): void {
    // TODO: Implement cancel join request endpoint
    // For now, just remove from local state
    this.pendingRequests.delete(groupId);
    
    // Update the group's hasPendingRequest status
    const index = this.groups.findIndex(g => g.id === groupId);
    if (index !== -1) {
      this.groups[index].hasPendingRequest = false;
    }
    
    alert('Join request cancelled.');
  }

  leaveGroup(groupId: number): void {
    this.groupsService.leaveGroup(groupId).subscribe({
      next: (response: any) => {
        const isSuccess = response.success || response.status;
        if (isSuccess) {
          alert('You have left the group.');
          
          // Update local state
          const index = this.groups.findIndex(g => g.id === groupId);
          if (index !== -1) {
            this.groups[index].isJoined = false;
          }
        } else {
          alert(response.message || 'Failed to leave group.');
        }
      },
      error: (error: any) => {
        console.error('Error leaving group:', error);
        alert('Failed to leave group. Please try again.');
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
          
          // Add the new group to the list with isJoined: true
          const newGroupData = {
            ...newGroup,
            id: response.data?.id || Date.now(),
            isJoined: true,
            isAdmin: true,
            memberCount: 1,
            ideaCount: 0,
            isActive: true,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            createdByUserId: this.authService.getCurrentUserId() || 'unknown',
            createdByUser: {
              displayName: 'You',
              email: ''
            },
            hasPendingRequest: false
          };

          this.groups.unshift(newGroupData);
          
          this.createGroupForm.reset();
          this.showCreateForm = false;
          
          // Refresh after a short delay to get full data from server
          setTimeout(() => {
            this.loadGroups();
          }, 1500);
          
        } else {
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
    return true; // Everyone can view members for now
  }

  canConfigureGroup(group: any): boolean {
    return this.authService.isGroupAdmin() || this.authService.isSuperAdmin();
  }

  canViewIdeas(group: any): boolean {
    return true; // Will implement later
  }

  // ===== PENDING REQUEST METHODS =====

  hasPendingRequest(groupId: number): boolean {
    return this.pendingRequests.get(groupId) || false;
  }

  getPendingRequestCount(groupId: number): number {
    return this.pendingRequestCounts.get(groupId) || 0;
  }

  // ===== LEGACY METHODS (for backward compatibility) =====

  viewDetails(group: any): void {
    // Legacy method - redirects to modal
    this.openDetailsModal(group);
  }

  viewMembers(groupId: number): void {
    // Legacy method - find group and open modal
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      this.openMembersModal(group);
    }
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
        alert('Failed to load pending requests.');
      }
    });
  }

  viewIdeas(groupId: number): void {
    // Will implement later
    console.log('View ideas for group:', groupId);
  }

  // ===== FORM GETTER METHODS =====

  get name() { 
    return this.createGroupForm.get('name'); 
  }
  
  get description() { 
    return this.createGroupForm.get('description'); 
  }
}