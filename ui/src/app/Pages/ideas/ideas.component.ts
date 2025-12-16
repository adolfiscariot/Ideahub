import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { IdeasService } from '../../Services/ideas.services';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { Idea, CreateIdeaRequest, IdeaUpdate, PromoteRequest } from '../../Interfaces/Ideas/idea-interfaces';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { VoteService } from '../../Services/vote.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MatDialog } from '@angular/material/dialog';
import { ModalComponent } from '../../Components/modal/modal.component';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,ButtonsComponent, FormsModule, ModalComponent],
  templateUrl: './ideas.component.html',
  styleUrls: ['./ideas.component.scss']
})
export class IdeasComponent implements OnInit, OnDestroy {
  groupId: string = '';
  groupName: string = '';
  ideas: Idea[] = [];
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  showShareModal: boolean = false;
  currentUserId: string = '';
  
  selectedIdea: any = null;
  membersCount: string = '0';

  isVoting: boolean = false;
  isUnvoting: boolean = false;
  isViewingVoters: boolean = false;
  selectedIdeaForVoters: Idea | null = null;
  votersList: any[] = [];

  groupCreatorId: string = '';

  isGroupCreatorFromState: boolean | undefined = undefined;
  groupCreatorIdFromState: string = '';

  isPromoting: boolean = false;
  currentlyPromotingIdeaId: string | null = null;

  groupMembers: any[] = [];

  isEditMode: boolean = false;

  modalEditData: any = {
  id: '',
  title: '',
  description: ''
  };

  sortMode: 'top' | 'newest' = 'top';

  showRequestsModal = false;
  pendingRequests: any[] = [];
  loadingRequests = false;
  errorRequests = '';
  showMembersModal = false;
  showLeaveGroupModal = false;
  showDeleteIdeaModal = false;
  selectedIdeaForDelete: any = null;
  showVotersListModal = false;

  private routeSub: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ideasService: IdeasService,
    private groupsService: GroupsService,
    private authService: AuthService,
    private voteService: VoteService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
  }

  ngOnInit(): void {
    console.log('=== INITIALIZING IDEAS COMPONENT ===');
    
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('Current User ID:', this.currentUserId);
    
    console.log('Browser history state:', history.state);
    
    const navigation = this.router.getCurrentNavigation();
    console.log('=== NAVIGATION DEBUG ===');
    console.log('Navigation exists:', !!navigation);
    console.log('Navigation extras:', navigation?.extras);
    console.log('Navigation state:', navigation?.extras?.state);
    
    if (navigation?.extras?.state) {
      const state = navigation.extras.state as any;
      this.isGroupCreatorFromState = state.isGroupCreator || false;
      this.groupName = state.groupName || this.groupName;
      this.groupCreatorIdFromState = state.groupCreatorId || '';
      this.groupCreatorId = this.groupCreatorIdFromState;
      
      console.log('RECEIVED ROUTE STATE:', {
        isGroupCreator: this.isGroupCreatorFromState,
        groupName: this.groupName,
        groupCreatorId: this.groupCreatorIdFromState,
        fullState: state
      });
    } else {
      console.log('NO ROUTE STATE from navigation');
      
      if (history.state && history.state.groupCreatorId) {
        console.log('Found state in browser history:', history.state);
        this.isGroupCreatorFromState = history.state.isGroupCreator;
        this.groupName = history.state.groupName || this.groupName;
        this.groupCreatorIdFromState = history.state.groupCreatorId;
        this.groupCreatorId = this.groupCreatorIdFromState;
      }
    }
    
    this.routeSub = this.route.params.subscribe(params => {
      this.groupId = params['groupId'];
      console.log('Group ID from route:', this.groupId);

      console.log('=== CURRENT STATE ===', {
        groupCreatorId: this.groupCreatorId,
        groupCreatorIdFromState: this.groupCreatorIdFromState,
        isGroupCreatorFromState: this.isGroupCreatorFromState,
        groupName: this.groupName
      });

      if (!this.groupCreatorId) {
        console.log('No groupCreatorId, loading from API...');
        this.loadGroupInfo();
      } else {
        console.log('Using existing groupCreatorId:', this.groupCreatorId);
      }
      this.loadGroupMembers();

      this.loadIdeas();
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
  }

  openEditModal(idea: any) {
    this.isEditMode = true;
    this.modalEditData = { ...idea };
  }

  setSortMode(mode: 'top' | 'newest'): void {
    this.sortMode = mode;
    this.sortIdeas();
  }

  sortIdeas(): void {
    if (!this.ideas) return;

    if (this.sortMode === 'top') {
      this.ideas.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    } else if (this.sortMode === 'newest') {
      this.ideas.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
  }

  // Share Idea Modal
  openShareModal(editMode = false, editData: any = null): void {
  console.log('Opening share modal in edit mode:', editMode);
  console.log('Edit data:', editData);
  
  this.isEditMode = editMode;
  
  // Always reset modalEditData to a valid object
  this.modalEditData = {
    id: '',
    title: '',
    description: ''
  };
  
  // If in edit mode, populate with the idea data
  if (editMode && editData) {
    this.modalEditData = {
      id: editData.id || '',
      title: editData.title || '',
      description: editData.description || ''
    };
  }
  
  this.showShareModal = true;
  console.log('Modal edit data set to:', this.modalEditData);
}

  closeShareModal(): void {
    this.showShareModal = false;
    this.isEditMode = false;
  }

  // Members Modal
  openMembersModal(): void {
    console.log('Opening members modal for group:', this.groupId);
    this.showMembersModal = true;
  }

  closeMembersModal(): void {
    this.showMembersModal = false;
  }

  // Requests Modal
  viewRequests(): void {
    console.log('Fetching pending requests for group:', this.groupId);
    this.showRequestsModal = true;
    this.loadingRequests = true;
    this.errorRequests = '';

    this.groupsService.viewRequests(this.groupId).subscribe({
      next: (res: any) => {
        console.log('Pending requests received:', res);
        this.pendingRequests = res.data?.map((userId: string) => ({ userId })) || [];
        this.loadingRequests = false;
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.errorRequests = 'Failed to load requests';
        this.loadingRequests = false;
      }
    });
  }

  closeRequestsModal(): void {
    this.showRequestsModal = false;
    this.pendingRequests = [];
  }

  // Leave Group Modal
  confirmLeaveGroup(): void {
    this.showLeaveGroupModal = true;
  }

  closeLeaveGroupModal(): void {
    this.showLeaveGroupModal = false;
  }

  leaveGroup(): void {
    if (!this.groupId) return;

    this.groupsService.leaveGroup(this.groupId).subscribe({
      next: (res) => {
        console.log('Left group response:', res);
        alert('You have left the group');
        this.closeLeaveGroupModal();
        this.router.navigate(['/groups']);
      },
      error: (err) => {
        console.error('Failed to leave group:', err);
        alert('Failed to leave the group');
      }
    });
  }

  // Delete Idea Modal
  openDeleteIdeaModal(idea: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedIdeaForDelete = idea;
    this.showDeleteIdeaModal = true;
  }

  closeDeleteIdeaModal(): void {
    this.showDeleteIdeaModal = false;
    this.selectedIdeaForDelete = null;
  }

  deleteIdea(): void {
    if (!this.selectedIdeaForDelete?.id) return;

    const ideaId = this.selectedIdeaForDelete.id;
    console.log('Deleting idea ID:', ideaId);

    this.ideasService.deleteIdea(ideaId).subscribe({
      next: (response) => {
        console.log('Delete response:', response);
        
        if (response.success) {
          const index = this.ideas.findIndex(idea => idea.id === ideaId);
          if (index !== -1) {
            this.ideas.splice(index, 1);
            this.ideas = [...this.ideas];
          }
          
          if (this.selectedIdea && this.selectedIdea.id === ideaId) {
            this.selectedIdea = null;
            this.isEditMode = false;
          }
          
          this.closeDeleteIdeaModal();
          alert('Idea deleted successfully!');
        } else {
          alert(`Failed to delete idea: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error deleting idea:', error);
        alert('An error occurred while deleting the idea.');
      }
    });
  }

  // View Voters Modal
  openVotersModal(idea: Idea): void {
    this.isViewingVoters = true;
    this.selectedIdeaForVoters = idea;
    
    this.ideasService.getVotesForIdea(idea.id).subscribe({
      next: (response) => {
        this.isViewingVoters = false;
        if (response.success && response.data) {
          this.votersList = response.data;
          this.showVotersListModal = true;
        } else {
          alert(`Failed to get voters: ${response.message}`);
        }
      },
      error: (error) => {
        this.isViewingVoters = false;
        console.error('Error fetching voters:', error);
      }
    });
  }

  closeVotersModal(): void {
    this.showVotersListModal = false;
    this.selectedIdeaForVoters = null;
    this.votersList = [];
  }

  // Accept/Reject Requests
  acceptRequest(requestUserId: string): void {
    console.log('Accept request:', requestUserId);
    this.groupsService.acceptRequest(this.groupId, requestUserId).subscribe({
      next: () => {
        console.log('Request accepted for user:', requestUserId);
        this.pendingRequests = this.pendingRequests.filter(r => r.userId !== requestUserId);
      },
      error: (err) => console.error('Error accepting request:', err)
    });
  }

  rejectRequest(requestUserId: string): void {
    console.log('Reject request:', requestUserId);
    this.groupsService.rejectRequest(this.groupId, requestUserId).subscribe({
      next: () => {
        console.log('Request rejected for user:', requestUserId);
        this.pendingRequests = this.pendingRequests.filter(r => r.userId !== requestUserId);
      },
      error: (err) => console.error('Error rejecting request:', err)
    });
  }

  selectIdea(idea: any): void {
    console.log('Selecting idea:', idea);
    this.selectedIdea = idea;
  }

  onUpdateIdeaFromModal(event: { title: string, description: string }): void {
    if (!this.selectedIdea) {
      console.log('No idea selected for modal update');
      return;
    }
    
    console.log('Updating idea from modal:', event);
    
    const updateData: IdeaUpdate = {
      title: event.title,
      description: event.description,
      status: this.selectedIdea.status ?? "open"
    };
    
    this.ideasService.updateIdea(this.selectedIdea.id, updateData).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Idea updated from modal successfully');
          
          const index = this.ideas.findIndex(i => i.id === this.selectedIdea.id);
          if (index !== -1) {
            this.ideas[index].title = event.title;
            this.ideas[index].description = event.description;
            this.ideas[index].updatedAt = new Date();
            this.ideas = [...this.ideas];
          }
          
          this.selectedIdea.title = event.title;
          this.selectedIdea.description = event.description;
          this.selectedIdea.updatedAt = new Date();
          
          this.showShareModal = false;
          this.isEditMode = false;
          this.modalEditData = null;
          
          alert('Idea updated successfully!');
        } else {
          alert(`Failed to update idea: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error updating idea from modal:', error);
        alert('An error occurred while updating the idea.');
      }
    });
  }

  loadGroupInfo(): void {
    if (this.groupCreatorIdFromState && this.groupName) {
      console.log('Skipping loadGroupInfo - already have data from route state');
      this.groupCreatorId = this.groupCreatorIdFromState;
      return;
    }
    
    this.groupsService.getGroups().subscribe({
      next: (response) => {
        console.log('=== GROUP INFO RESPONSE ===');
        
        if (response.success && response.data) {
          const group = response.data.find((g: any) => g.id === this.groupId);
          
          if (group) {
            if (!this.groupName) {
              this.groupName = group.name;
            }
            
            if (!this.groupCreatorId) {
              this.groupCreatorId = group.createdByUserId || group.userId || group.createdBy || group.ownerId || '';
            }
            
            console.log('Group info loaded:', {
              groupName: this.groupName,
              groupCreatorId: this.groupCreatorId,
              fromState: !!this.groupCreatorIdFromState
            });
          }
        }
      },
      error: (error) => {
        console.error('Error loading group info:', error);
      }
    });
  }

  formatIdeaDate(date: any): string {
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

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  loadGroupMembers(): void {
    if (!this.groupId) {
      console.warn("Cannot load members: groupId is missing");
      return;
    }

    this.groupsService.getGroupMembers(this.groupId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log("Members fetched:", response.data);
          this.groupMembers = response.data || [];
          this.membersCount = `${this.groupMembers.length}`;
        } else {
          console.warn("Failed to fetch members:", response.message);
          this.groupMembers = [];
          this.membersCount = "0";
        }
      },
      error: (error) => {
        console.error("Error fetching members:", error);
        this.groupMembers = [];
        this.membersCount = "0";
      }
    });
  }

  loadIdeas(): void {
    this.isLoading = true;
    this.ideasService.getIdeasByGroup(this.groupId).subscribe({
      next: async (response) => {
        this.isLoading = false;
        console.log('=== LOADING IDEAS ===');
        console.log('API Response:', response);
        
        if (response.success && response.data) {
          this.ideas = response.data.map((idea: any) => {
            const mappedIdea: Idea = {
              id: idea.id?.toString() || '',
              title: idea.title || '',
              description: idea.description || '',
              UserId: idea.userId || idea.UserId || '',
              userId: idea.userId || idea.UserId || '',
              groupId: this.groupId,
              isPromotedToProject: idea.isPromotedToProject || false,
              isDeleted: idea.isDeleted || false,
              createdAt: new Date(idea.createdAt || new Date()),
              updatedAt: new Date(idea.updatedAt || new Date()),
              status: idea.status || 'Open',
              deletedAt: idea.deletedAt ? new Date(idea.deletedAt) : undefined,
              voteCount: 0,
              commentCount: 0,
              userVoted: false,
              userName: idea.userName || '',
              userVoteId: undefined,
              groupName: idea.name || '',
              name: idea.name || ''
            };
            
            return mappedIdea;
          });
          
          console.log(`Mapped ${this.ideas.length} ideas`);
          
          if (this.ideas.length > 0) {
            await this.fetchAndUpdateVoteCounts();
          } else {
            console.log('No ideas to fetch vote counts for');
          }

          this.sortIdeas();
          
          if (this.selectedIdea) {
            const updatedSelectedIdea = this.ideas.find(i => i.id === this.selectedIdea?.id);
            if (updatedSelectedIdea) {
              this.selectedIdea = updatedSelectedIdea;
            }
          }
          
          console.log('=== IDEAS LOADING COMPLETE ===');
        } else {
          console.warn('Failed to load ideas:', response.message);
          this.ideas = [];
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading ideas:', error);
        this.ideas = [];
      }
    });
  }

  isUserIdeaOwner(idea: any): boolean {
    if (!idea || !this.currentUserId) {
      return false;
    }
    
    const ideaUserId = idea.userId;
    
    if (!ideaUserId) {
      return false;
    }
    
    const normalizedIdeaUserId = ideaUserId.toString().trim().toLowerCase();
    const normalizedCurrentUserId = this.currentUserId.toString().trim().toLowerCase();
    
    return normalizedIdeaUserId === normalizedCurrentUserId;
  }

  isGroupCreator(): boolean {
    console.log('=== isGroupCreator() CALLED ===');
    
    if (this.isGroupCreatorFromState !== undefined) {
      console.log('Using pre-determined group creator status from route state:', this.isGroupCreatorFromState);
      return this.isGroupCreatorFromState;
    }
    
    console.log('No route state, checking via IDs...');
    
    if (!this.groupCreatorId || !this.currentUserId) {
      console.log('Group creator check failed - missing IDs');
      return false;
    }
    
    const normalizedGroupCreatorId = this.groupCreatorId.toString().trim().toLowerCase();
    const normalizedCurrentUserId = this.currentUserId.toString().trim().toLowerCase();
    
    const isCreator = normalizedGroupCreatorId === normalizedCurrentUserId;
    
    console.log('Group creator check (calculated):', isCreator);
    
    return isCreator;
  }

  onShareIdea(ideaData: { title: string, description: string }): void {
    this.isSubmitting = true;
    
    const request: CreateIdeaRequest = {
      ...ideaData,
      groupId: this.groupId
    };

    this.ideasService.createIdea(request).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.closeShareModal();
          this.loadIdeas();
          console.log('Idea created successfully!');
        } else {
          alert(`Failed to create idea: ${response.message}`);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error creating idea:', error);
        alert('An error occurred while creating the idea.');
      }
    });
  }

  trackById(index: number, idea: Idea): string {
    return idea.id;
  }

  onVote(ideaId: string): void {
    console.log(`=== VOTING FOR IDEA ${ideaId} ===`);
    this.isVoting = true;
    
    this.ideasService.voteForIdea(this.groupId, ideaId).subscribe({
      next: (response) => {
        this.isVoting = false;
        console.log('Vote response:', response);
        
        if (response.success && response.data) {
          const voteId = response.data?.id;
          
          const idea = this.ideas.find(i => i.id === ideaId);
          if (idea) {
            idea.userVoted = true;
            idea.userVoteId = voteId?.toString();
            idea.voteCount = (idea.voteCount || 0) + 1;
            idea.userVoted = true;
            idea.userVoteId = voteId?.toString();

            if (this.selectedIdea && this.selectedIdea.id === ideaId) {
              this.selectedIdea = { ...idea };
            }
          }
          
          console.log('✓ Vote successful!');
        } else {
          alert(`Failed to vote: ${response.message}`);
        }
      },
      error: (error) => {
        this.isVoting = false;
        console.error('Error voting:', error);
        alert('An error occurred while voting.');
      }
    });
  }

  onUnvote(idea: Idea, event?: Event): void {
    if (event) event.stopPropagation();
    
    console.log(`=== UNVOTING FOR IDEA ${idea.id} ===`);
    
    if (!idea.userVoteId) {
      console.error('Cannot unvote: No vote ID found');
      alert('Cannot unvote: No vote ID found. Please refresh the page.');
      return;
    }
    
    this.isUnvoting = true;
    this.ideasService.removeVote(idea.userVoteId).subscribe({
      next: (response) => {
        this.isUnvoting = false;
        console.log('Unvote response:', response);
        
        if (response.success) {
          idea.userVoted = false;
          idea.voteCount = Math.max(0, (idea.voteCount || 1) - 1);
          idea.userVoteId = undefined;
          
          if (this.selectedIdea && this.selectedIdea.id === idea.id) {
            this.selectedIdea.userVoted = false;
            this.selectedIdea.voteCount = idea.voteCount;
            this.selectedIdea.userVoteId = undefined;
          }
          
          console.log('✓ Unvote successful!');
        } else {
          alert(`Failed to unvote: ${response.message}`);
        }
      },
      error: (error) => {
        this.isUnvoting = false;
        console.error('Error unvoting:', error);
        
        if (error.status === 404) {
          alert('Vote not found. It may have already been removed.');
          idea.userVoted = false;
          idea.userVoteId = undefined;
        } else {
          alert('An error occurred while unvoting.');
        }
      }
    });
  }

  async fetchAndUpdateVoteCounts(): Promise<void> {
    console.log('=== FETCHING VOTE COUNTS ===');
    
    const voteCountPromises = this.ideas.map(async (idea) => {
      try {
        const response = await this.ideasService.getVotesForIdea(idea.id).toPromise();
        
        if (response?.success && response.data) {
          const activeVotes = response.data.filter((vote: any) => !vote.isDeleted);
          idea.voteCount = activeVotes.length;
          
          const userVote = activeVotes.find((vote: any) =>
            vote.userId?.toString() === this.currentUserId
          );
          
          if (userVote) {
            idea.userVoted = true;
            idea.userVoteId = userVote.voteId?.toString();
          }
        } else {
          idea.voteCount = 0;
        }
      } catch (error) {
        console.error(`Error fetching votes for idea ${idea.id}:`, error);
        idea.voteCount = 0;
      }
      
      return idea;
    });
    
    await Promise.all(voteCountPromises);
    
    console.log('=== VOTE COUNTS UPDATED ===');
    this.ideas = [...this.ideas];
  }

  onPromoteIdea(idea: Idea, event?: Event): void {
    if (event) event.stopPropagation();
    
    console.log(`=== PROMOTING IDEA TO PROJECT ===`);
    console.log('Current promotion status:', idea.isPromotedToProject);
    
    if (idea.isPromotedToProject) {
      console.log('Idea already promoted, skipping');
      alert('This idea is already promoted to a project!');
      return;
    }
    
    if (!confirm(`Are you sure you want to promote "${idea.title}" to a project?\n\nThis will move the idea to the projects section.`)) {
      return;
    }
    
    this.isPromoting = true;
    this.currentlyPromotingIdeaId = idea.id;
    
    const request: PromoteRequest = {
      ideaId: idea.id,
      groupId: this.groupId
    };
    
    console.log('Calling backend with:', request);
    
    this.ideasService.promoteIdea(request).subscribe({
      next: (response) => {
        this.isPromoting = false;
        this.currentlyPromotingIdeaId = null;
        
        console.log('Promote response from backend:', response);
        
        if (response.success) {
          idea.isPromotedToProject = true;
          idea.status = 'Promoted';
          
          if (this.selectedIdea && this.selectedIdea.id === idea.id) {
            this.selectedIdea.isPromotedToProject = true;
            this.selectedIdea.status = 'Promoted';
          }
          
          this.ideas = [...this.ideas];
          
          alert(`Idea "${idea.title}" has been promoted to a project!\n\nIt will now appear in the projects section.`);
          
          console.log(`Idea "${idea.title}" promoted successfully`);
        } else {
          alert(`Failed to promote idea: ${response.message}`);
        }
      },
      error: (error) => {
        this.isPromoting = false;
        this.currentlyPromotingIdeaId = null;
        
        console.error('Error promoting idea:', error);
        
        if (error.status === 401) {
          alert('Please login to promote ideas.');
        } else if (error.status === 403) {
          alert('You do not have permission to promote ideas. Only group creators can promote ideas.');
        } else if (error.status === 404) {
          alert('Idea not found.');
        } else {
          alert('An error occurred while promoting the idea.');
        }
      }
    });
  }

  startEditing(): void {
    this.showShareModal = true;
    this.isEditMode = true;

    this.modalEditData = {
      title: this.selectedIdea.title,
      description: this.selectedIdea.description
    };
  }
}