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
  pendingRequests: Map<string, boolean> = new Map(); // Changed to string for GUID

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
      
      // DEBUG: Check what backend is returning
      console.log('=== GROUPS DEBUG INFO ===');
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((group: any, index: number) => {
          console.log(`Group ${index + 1}: ${group.name || group.Name}`);
          console.log('  isMember:', group.isMember, 'or', group.IsMember);
          console.log('  hasPendingRequest:', group.hasPendingRequest, 'or', group.HasPendingRequest);
          console.log('  ---');
        });
      }
      
      if (response.success && response.data) {
        this.groups = response.data.map((group: any) => ({
          ...group,
          id: group.id,
          name: group.name || group.Name,
          description: group.description || group.Description,
          // CRITICAL: Get membership status from backend
          isMember: group.isMember || group.IsMember || false,
          // Ignore pending requests for now
          hasPendingRequest: false,
          memberCount: group.memberCount || group.MemberCount || 0,
          ideaCount: group.ideaCount || group.IdeaCount || 0,
          isActive: group.isActive || group.IsActive !== false,
          isDeleted: group.isDeleted || group.IsDeleted || false,
          createdAt: group.createdAt || group.CreatedAt || new Date().toISOString(),
          createdByUserId: group.createdByUserId || group.CreatedByUserId,
          createdByUser: group.createdByUser || group.CreatedByUser || {
            displayName: 'Unknown',
            email: ''
          }
        }));
        
        console.log('=== FINAL GROUPS STATE ===');
        this.groups.forEach((group, index) => {
          console.log(`${index + 1}. ${group.name}: isMember = ${group.isMember}`);
        });
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
    alert(`Pending requests for ${group.name}:\n\nFeature coming soon!`);
  }

  // ===== GROUP JOIN/LEAVE METHODS =====

 onJoinGroup(groupId: string): void {
  const group = this.groups.find(g => g.id === groupId);
  
  // Double-check conditions (shouldn't happen due to *ngIf)
  if (group?.isMember) {
    alert('You are already a member of this group!');
    return;
  }
  
  if (group?.hasPendingRequest) {
    alert('You already have a pending request for this group!');
    return;
  }

  this.groupsService.joinGroup(groupId).subscribe({
    next: (response: any) => {
      const isSuccess = response.success || response.status;
      if (isSuccess) {
        alert('Join request sent! Waiting for admin approval.');
        
        // Update local state - user now has pending request
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
          this.groups[index].hasPendingRequest = true;
          this.groups[index].isMember = false; // Still not a member yet
        }
      } else {
        // Handle specific error messages
        if (response.message?.includes('already a member')) {
          alert('You are already a member of this group!');
          
          // Update UI
          const index = this.groups.findIndex(g => g.id === groupId);
          if (index !== -1) {
            this.groups[index].isMember = true;
            this.groups[index].hasPendingRequest = false;
          }
        } else if (response.message?.includes('pending request')) {
          alert('You already have a pending request for this group!');
          
          // Update UI
          const index = this.groups.findIndex(g => g.id === groupId);
          if (index !== -1) {
            this.groups[index].hasPendingRequest = true;
          }
        } else if (response.message?.includes('authenticated')) {
          alert('Please login to join groups.');
        } else {
          alert(response.message || 'Failed to send join request.');
        }
      }
    },
    error: (error: any) => {
      console.error('Error joining group:', error);
      
      if (error.status === 401) {
        alert('Please login to join groups.');
      } else if (error.status === 400) {
        // Check error message from backend
        if (error.error?.message?.includes('already a member')) {
          alert('You are already a member of this group!');
        } else if (error.error?.message?.includes('pending request')) {
          alert('You already have a pending request for this group!');
        } else {
          alert(error.error?.message || 'Failed to send join request.');
        }
      } else {
        alert('Failed to send join request. Please try again.');
      }
    }
  });
}

  cancelJoinRequest(groupId: string): void { // Changed to string
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
          
          // Reload groups to get fresh data with proper IDs
          this.loadGroups();
          
          this.createGroupForm.reset();
          this.showCreateForm = false;
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

  trackById(index: number, item: any): string {
    return item.id || index.toString();
  }

  // ===== PERMISSION METHODS =====

  canViewMembers(group: any): boolean {
    return true; // Everyone can view members for now
  }

  canConfigureGroup(group: any): boolean {
    const currentUserId = this.authService.getCurrentUserId();
    return group.createdByUserId === currentUserId || 
           this.authService.isGroupAdmin() || 
           this.authService.isSuperAdmin();
  }

  // ===== PENDING REQUEST METHODS =====

  hasPendingRequest(groupId: string): boolean {
    return this.pendingRequests.get(groupId) || false;
  }

  // ===== FORM GETTER METHODS =====

  get name() { 
    return this.createGroupForm.get('name'); 
  }
  
  get description() { 
    return this.createGroupForm.get('description'); 
  }
}