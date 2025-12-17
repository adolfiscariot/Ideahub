import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IdeasService } from '../../Services/ideas.services';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { Idea, CreateIdeaRequest, IdeaUpdate, PromoteRequest } from '../../Interfaces/Ideas/idea-interfaces';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ShareIdeaModalComponent } from '../../Components/modals/share-idea-modal/share-idea-modal.component';
import { VoteService } from '../../Services/vote.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MatDialog } from '@angular/material/dialog';
import { GroupMembersModalComponent } from '../../Components/modals/group-members-modal/group-members-modal.component';
import { ToastService } from '../../Services/toast.service';
import { ProjectService } from '../../Services/project.service';
import { Project, CreateProjectRequest, UpdateProjectRequest, ProjectDetails, ProjectSummary, ApiResponse} from '../../Interfaces/Projects/project-interface';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ShareIdeaModalComponent, ButtonsComponent, FormsModule],
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

  //showMembersModal = false;

  isGroupCreatorFromState: boolean | undefined = undefined; // set from route state
  groupCreatorIdFromState: string = ''; // set from route state

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

  showProjectModal = false;
  currentIdeaToPromote: Idea | null = null;
  projectData: CreateProjectRequest = {
    title: '',
    description: '',
    overseenByEmail: ''
  };

  private routeSub: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ideasService: IdeasService,
    private groupsService: GroupsService,
    private authService: AuthService,
    private voteService: VoteService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private projectService: ProjectService,
    private fb: FormBuilder
  ) {
  }

  ngOnInit(): void {
    console.log('=== INITIALIZING IDEAS COMPONENT ===');

    // Get current user ID from auth service
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('Current User ID:', this.currentUserId);

    // Check browser history state FIRST (in case of page refresh)
    console.log('Browser history state:', history.state);

    // Get router state (passed from Groups component)
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
      this.groupCreatorId = this.groupCreatorIdFromState; // Set main ID too

      console.log('RECEIVED ROUTE STATE:', {
        isGroupCreator: this.isGroupCreatorFromState,
        groupName: this.groupName,
        groupCreatorId: this.groupCreatorIdFromState,
        fullState: state
      });
    } else {
      console.log('NO ROUTE STATE from navigation');

      // Try to get from browser history (for page refreshes)
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

      // If we don't have creator ID, load from API
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

  selectIdea(idea: any): void {
    console.log('Selecting idea:', idea);
    this.selectedIdea = idea;
  }

  viewRequests(groupId: string) {
    console.log('Fetching pending requests for group:', groupId);
    this.showRequestsModal = true;
    this.loadingRequests = true;
    this.errorRequests = '';

    this.groupsService.viewRequests(groupId).subscribe({
      next: (res: any) => {
        console.log('Pending requests received:', res);
        this.pendingRequests = res.data.map((userId: string) => ({ userId })) // res should be an array of { userId, ... }
        this.loadingRequests = false;
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.errorRequests = 'Failed to load requests';
        this.loadingRequests = false;
      }
    });
  }

  // ideas.component.ts

  confirmLeaveGroup() {
    // optional: show a confirmation toast/modal
    const confirmLeave = confirm('Are you sure you want to leave this group?');
    if (confirmLeave) {
      this.leaveGroup();
    }
  }

  leaveGroup() {
    if (!this.groupId) return;

    this.groupsService.leaveGroup(this.groupId).subscribe({
      next: (res) => {
        console.log('Left group response:', res); // check backend response
        this.toastService.show('You have left the group', 'success');          // simple feedback for now
        this.router.navigate(['/groups']);         // redirect after leaving
      },
      error: (err) => {
        console.error('Failed to leave group:', err);
        this.toastService.show('Failed to leave the group', 'error');       // simple error feedback
      }
    });
  }



  acceptRequest(groupId: string, requestUserId: string) {
    console.log('Accept request:', requestUserId);
    this.groupsService.acceptRequest(groupId, requestUserId).subscribe({
      next: () => {
        console.log('Request accepted for user:', requestUserId);
        this.pendingRequests = this.pendingRequests.filter(r => r.userId !== requestUserId);
      },
      error: (err) => console.error('Error accepting request:', err)
    });
  }

  rejectRequest(groupId: string, requestUserId: string) {
    console.log('Reject request:', requestUserId);
    this.groupsService.rejectRequest(groupId, requestUserId).subscribe({
      next: () => {
        console.log('Request rejected for user:', requestUserId);
        this.pendingRequests = this.pendingRequests.filter(r => r.userId !== requestUserId);
      },
      error: (err) => console.error('Error rejecting request:', err)
    });



  }

  closeRequestsModal() {
    this.showRequestsModal = false;
  }



  onUpdateIdeaFromModal(event: { title: string, description: string }): void {
    if (!this.selectedIdea) {
      console.log('No idea selected for modal update');
      return;
    }

    console.log('Updating idea from modal:', event);

    // Create the update data according to your interface
    const updateData: IdeaUpdate = {
      title: event.title,
      description: event.description,
      status: this.selectedIdea.status ?? "open"
    };


    this.ideasService.updateIdea(this.selectedIdea.id, updateData).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Idea updated from modal successfully');

          // Update the idea in the local array
          const index = this.ideas.findIndex(i => i.id === this.selectedIdea.id);
          if (index !== -1) {
            this.ideas[index].title = event.title;
            this.ideas[index].description = event.description;
            this.ideas[index].updatedAt = new Date();

            // Update the ideas array reference
            this.ideas = [...this.ideas];
          }

          // Update selected idea
          this.selectedIdea.title = event.title;
          this.selectedIdea.description = event.description;
          this.selectedIdea.updatedAt = new Date();

          // Close modal and reset
          this.showShareModal = false;
          this.isEditMode = false;
          this.modalEditData = null;

          this.toastService.show('Idea updated successfully!', 'success');
        } else {
          this.toastService.show(`Failed to update idea: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        console.error('Error updating idea from modal:', error);
        this.toastService.show('An error occurred while updating the idea.', 'error');
      }
    });
  }

  loadGroupInfo(): void {
    // Skip if we already have the info from route state
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
            // Only set groupName if not already set from state
            if (!this.groupName) {
              this.groupName = group.name;
            }

            // Try different property names for creator ID
            // Only set if not already from state
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


  openMembersModal() {
    console.log('Opening members modal for group:', this.groupId);

    this.dialog.open(GroupMembersModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        group: {
          id: this.groupId,
          name: this.groupName,
          memberCount: this.membersCount
        }
      },
      panelClass: 'custom-modal'
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


  loadGroupMembers(): void {
    if (!this.groupId) {
      console.warn("Cannot load members: groupId is missing");
      return;
    }

    this.groupsService.getGroupMembers(this.groupId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log("Members fetched:", response.data);

          // Save full list
          this.groupMembers = response.data || [];

          // Save count as string
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
            console.log(`Mapping idea "${idea.title}":`, {
              id: idea.id,
              isPromotedToProject: idea.isPromotedToProject,
              isDeleted: idea.isDeleted
            });

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
              voteCount: 0, // Will be updated by fetchAndUpdateVoteCounts
              commentCount: 0,
              userVoted: false, // Will be updated by fetchAndUpdateVoteCounts
              userName: idea.userName || '',
              userVoteId: undefined, // Will be updated by fetchAndUpdateVoteCounts
              groupName: idea.name || '',
              name: idea.name || ''
            };

            return mappedIdea;
          });

          console.log(`Mapped ${this.ideas.length} ideas`);
          console.log('Promotion status:', this.ideas.map(i => ({
            title: i.title,
            promoted: i.isPromotedToProject
          })));

          // Then fetch vote counts for all ideas
          if (this.ideas.length > 0) {
            await this.fetchAndUpdateVoteCounts();
          } else {
            console.log('No ideas to fetch vote counts for');
          }

          this.sortIdeas();

          // Update selected idea if it exists
          if (this.selectedIdea) {
            const updatedSelectedIdea = this.ideas.find(i => i.id === this.selectedIdea?.id);
            if (updatedSelectedIdea) {
              this.selectedIdea = updatedSelectedIdea;
              console.log('Updated selected idea with promotion status:', this.selectedIdea.isPromotedToProject);
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

  // Check if current user is the owner of an idea
  isUserIdeaOwner(idea: any): boolean {
    if (!idea || !this.currentUserId) {
      console.log('Ownership check failed: missing data', {
        hasIdea: !!idea,
        hasCurrentUserId: !!this.currentUserId,
        ideaUserId: idea?.userId,
        currentUserId: this.currentUserId
      });
      return false;
    }

    const ideaUserId = idea.userId;

    if (!ideaUserId) {
      console.log('No userId found in idea:', idea);
      return false;
    }

    // Normalize both IDs (trim and lowercase) 
    const normalizedIdeaUserId = ideaUserId.toString().trim().toLowerCase();
    const normalizedCurrentUserId = this.currentUserId.toString().trim().toLowerCase();

    const isOwner = normalizedIdeaUserId === normalizedCurrentUserId;

    console.log(`Ownership check for "${idea.title}":`, {
      ideaUserId,
      currentUserId: this.currentUserId,
      normalizedIdeaUserId,
      normalizedCurrentUserId,
      isOwner
    });

    return isOwner;
  }

  isGroupCreator(): boolean {
    console.log('=== isGroupCreator() CALLED ===');

    // First check if we already have the value from route state
    if (this.isGroupCreatorFromState !== undefined) {
      console.log('Using pre-determined group creator status from route state:', this.isGroupCreatorFromState);
      console.log('Route state values:', {
        isGroupCreatorFromState: this.isGroupCreatorFromState,
        groupCreatorIdFromState: this.groupCreatorIdFromState,
        currentUserId: this.currentUserId
      });
      return this.isGroupCreatorFromState;
    }

    console.log('No route state, checking via IDs...');
    console.log('Current values:', {
      groupCreatorId: this.groupCreatorId,
      currentUserId: this.currentUserId,
      hasGroupCreatorId: !!this.groupCreatorId,
      hasCurrentUserId: !!this.currentUserId
    });

    // Fallback to checking IDs if no state was passed
    if (!this.groupCreatorId || !this.currentUserId) {
      console.log('Group creator check failed - missing IDs:', {
        hasGroupCreatorId: !!this.groupCreatorId,
        hasCurrentUserId: !!this.currentUserId,
        groupCreatorId: this.groupCreatorId,
        currentUserId: this.currentUserId
      });
      return false;
    }

    const normalizedGroupCreatorId = this.groupCreatorId.toString().trim().toLowerCase();
    const normalizedCurrentUserId = this.currentUserId.toString().trim().toLowerCase();

    const isCreator = normalizedGroupCreatorId === normalizedCurrentUserId;

    console.log('Group creator check (calculated):', {
      groupCreatorId: this.groupCreatorId,
      currentUserId: this.currentUserId,
      normalizedGroupCreatorId,
      normalizedCurrentUserId,
      isCreator
    });

    return isCreator;
  }

  openShareModal(): void {
    this.showShareModal = true;
  }
  closeShareModal(): void {
    this.showShareModal = false;
    this.isEditMode = false;
    this.modalEditData = null;
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
          this.loadIdeas(); // Refresh the list
          this.toastService.show('Idea created successfully!', 'success');
        } else {
          this.toastService.show(`Failed to create idea: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error creating idea:', error);
        this.toastService.show('An error occurred while creating the idea.', 'error');
      }
    });
  }

  openDescriptionModal(idea: any): void {
    alert(`Full Description:\n\n${idea.description}`);
  }

  onViewIdea(ideaId: string): void {
    this.ideasService.getIdea(this.groupId, ideaId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          alert(`Idea Details:\n\nTitle: ${response.data.title}\n\nDescription: ${response.data.description}\n\nCreated: ${new Date(response.data.createdAt).toLocaleDateString()}`);
        }
      },
      error: (error) => {
        console.error('Error loading idea:', error);
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

          // Update the idea in the list
          const idea = this.ideas.find(i => i.id === ideaId);
          if (idea) {
            idea.userVoted = true;
            idea.userVoteId = voteId?.toString();

            // Increment vote count locally

            idea.voteCount = (idea.voteCount || 0) + 1;
            idea.userVoted = true;
            idea.userVoteId = voteId?.toString();

            if (this.selectedIdea && this.selectedIdea.id === ideaId) {
              this.selectedIdea = { ...idea }
            }
          }

          console.log('✓ Vote successful!');
        } else {
          this.toastService.show(`Failed to vote: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        this.isVoting = false;
        console.error('Error voting:', error);
        this.toastService.show('An error occurred while voting.', 'error');
      }
    });
  }

  onUnvote(idea: Idea, event?: Event): void {
    if (event) event.stopPropagation();

    console.log(`=== UNVOTING FOR IDEA ${idea.id} ===`);

    if (!idea.userVoteId) {
      console.error('Cannot unvote: No vote ID found');
      this.toastService.show('Cannot unvote: No vote ID found. Please refresh the page.', 'error');
      return;
    }

    this.isUnvoting = true;
    this.ideasService.removeVote(idea.userVoteId).subscribe({
      next: (response) => {
        this.isUnvoting = false;
        console.log('Unvote response:', response);

        if (response.success) {
          // Update local state
          idea.userVoted = false;
          idea.voteCount = Math.max(0, (idea.voteCount || 1) - 1);
          idea.userVoteId = undefined;

          // If this idea is currently selected, update it too
          if (this.selectedIdea && this.selectedIdea.id === idea.id) {
            this.selectedIdea.userVoted = false;
            this.selectedIdea.voteCount = idea.voteCount;
            this.selectedIdea.userVoteId = undefined;
          }

          console.log('✓ Unvote successful!');
        } else {
          this.toastService.show(`Failed to unvote: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        this.isUnvoting = false;
        console.error('Error unvoting:', error);

        if (error.status === 404) {
          this.toastService.show('Vote not found. It may have already been removed.', 'warning');
          // Force refresh the idea
          idea.userVoted = false;
          idea.userVoteId = undefined;
        } else {
          this.toastService.show('An error occurred while unvoting.', 'error');
        }
      }
    });
  }

  // Viewing voters (admin only)
  onViewVoters(idea: Idea, event?: Event): void {
    if (event) event.stopPropagation();

    this.isViewingVoters = true;
    this.selectedIdeaForVoters = idea;

    this.ideasService.getVotesForIdea(idea.id).subscribe({
      next: (response) => {
        this.isViewingVoters = false;
        if (response.success && response.data) {
          this.votersList = response.data;

          // You can display this in a modal or alert
          this.showVotersModal(idea, response.data);
        } else {
          this.toastService.show(`Failed to get voters: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        this.isViewingVoters = false;
        console.error('Error fetching voters:', error);
      }
    });
  }

  /**
   * Check votes for all ideas in the list
   */
  async checkUserVotesForAllIdeas(): Promise<void> {
    console.log('=== CHECKING USER VOTES FOR ALL IDEAS ===');
    console.log('Current User ID:', this.currentUserId);

    if (!this.currentUserId) {
      console.warn('No current user ID, skipping vote check');
      return;
    }

    // Create an array of promises for parallel processing
    const voteChecks = this.ideas.map(async (idea, index) => {
      console.log(`[${index + 1}/${this.ideas.length}] Checking votes for idea "${idea.title}"...`);

      try {
        const voteInfo = await this.getUserVoteForIdea(idea.id);

        if (voteInfo.hasVoted) {
          idea.userVoted = true;
          idea.userVoteId = voteInfo.voteId;
          console.log(`✓ User has voted for "${idea.title}"`, {
            voteId: voteInfo.voteId,
            voteTime: voteInfo.voteTime
          });
        } else {
          idea.userVoted = false;
          idea.userVoteId = undefined;
          console.log(`✗ User has NOT voted for "${idea.title}"`);
        }
      } catch (error) {
        console.error(`Error checking votes for idea ${idea.id}:`, error);
        idea.userVoted = false;
        idea.userVoteId = undefined;
      }

      return idea;
    });

    // Wait for all checks to complete
    await Promise.all(voteChecks);

    // Update the UI
    this.ideas = [...this.ideas];
    console.log('=== VOTE CHECK COMPLETE ===');
    this.logVoteStatus();
  }

  /**
   * Get user's vote information for a specific idea
   */
  private getUserVoteForIdea(ideaId: string): Promise<{ hasVoted: boolean, voteId?: string, voteTime?: string }> {
    return new Promise((resolve, reject) => {
      this.ideasService.getVotesForIdea(ideaId).subscribe({
        next: (response) => {
          if (response.success && response.data && Array.isArray(response.data)) {
            console.log(`Votes for idea ${ideaId}:`, {
              count: response.data.length,
              voters: response.data.map((v: any) => ({
                userId: v.userId,
                userName: v.userName,
                voteId: v.voteId
              }))
            });

            // Find vote by current user that's not deleted
            const userVote = response.data.find((vote: any) => {
              const voteUserId = vote.userId || vote.UserId;
              const isCurrentUser = voteUserId?.toString() === this.currentUserId;
              const isNotDeleted = !vote.isDeleted;

              return isCurrentUser && isNotDeleted;
            });

            if (userVote) {
              console.log(`Found user vote for idea ${ideaId}:`, {
                voteId: userVote.voteId,
                time: userVote.time
              });

              resolve({
                hasVoted: true,
                voteId: userVote.voteId?.toString(),
                voteTime: userVote.time
              });
            } else {
              console.log(`No active vote found for current user on idea ${ideaId}`);
              resolve({ hasVoted: false });
            }
          } else {
            console.log(`No votes found for idea ${ideaId} or invalid response`);
            resolve({ hasVoted: false });
          }
        },
        error: (error) => {
          console.error(`Error fetching votes for idea ${ideaId}:`, error);
          reject(error);
        }
      });
    });
  }

  /**
   * Log current vote status for debugging
   */
  private logVoteStatus(): void {
    console.log('=== CURRENT VOTE STATUS ===');
    this.ideas.forEach((idea, index) => {
      console.log(`${index + 1}. "${idea.title}":`, {
        voted: idea.userVoted,
        voteId: idea.userVoteId,
        totalVotes: idea.voteCount
      });
    });

    const votedCount = this.ideas.filter(i => i.userVoted).length;
    console.log(`Summary: ${votedCount}/${this.ideas.length} ideas voted`);
  }

  // Add this helper method for displaying voters
  private showVotersModal(idea: Idea, voters: any[]): void {
    let message = `Voters for "${idea.title}":\n\n`;

    if (voters.length === 0) {
      message += 'No votes yet';
    } else {
      voters.forEach((voter, index) => {
        const time = new Date(voter.time).toLocaleString();
        message += `${index + 1}. ${voter.userName} (${voter.userEmail})\n`;
        message += `   Voted: ${time}\n\n`;
      });
    }

    // You could use a proper modal component here instead
    alert(message);
  }

  // Add this method to close the voters view
  closeVotersView(): void {
    this.selectedIdeaForVoters = null;
    this.votersList = [];
  }

  // EDIT IDEA METHODS
  startEditing(): void {
    this.showShareModal = true;
    this.isEditMode = true;

    this.modalEditData = {
      title: this.selectedIdea.title,
      description: this.selectedIdea.description
    };
  }

  // Method to fetch and update vote counts for all ideas
  async fetchAndUpdateVoteCounts(): Promise<void> {
    console.log('=== FETCHING VOTE COUNTS ===');

    // Create an array of promises to fetch votes for each idea
    const voteCountPromises = this.ideas.map(async (idea) => {
      try {
        const response = await this.ideasService.getVotesForIdea(idea.id).toPromise();

        if (response?.success && response.data) {
          // Count only active (non-deleted) votes
          const activeVotes = response.data.filter((vote: any) => !vote.isDeleted);
          idea.voteCount = activeVotes.length;

          console.log(`Idea "${idea.title}": ${activeVotes.length} votes`);

          // Also check if current user has voted
          const userVote = activeVotes.find((vote: any) =>
            vote.userId?.toString() === this.currentUserId
          );

          if (userVote) {
            idea.userVoted = true;
            idea.userVoteId = userVote.voteId?.toString();
            console.log(`  - User has voted (voteId: ${userVote.voteId})`);
          }
        } else {
          idea.voteCount = 0;
          console.log(`Idea "${idea.title}": 0 votes (no data or error)`);
        }
      } catch (error) {
        console.error(`Error fetching votes for idea ${idea.id}:`, error);
        idea.voteCount = 0;
      }

      return idea;
    });

    // Wait for all vote counts to be fetched
    await Promise.all(voteCountPromises);

    console.log('=== VOTE COUNTS UPDATED ===');

    // Update the array reference to trigger change detection
    this.ideas = [...this.ideas];

    // Log final vote counts
    console.log('Final vote counts:');
    this.ideas.forEach((idea, index) => {
      console.log(`${index + 1}. "${idea.title}": ${idea.voteCount} votes, userVoted: ${idea.userVoted}`);
    });
  }

  //Promote Idea to project and create project
  onPromoteIdea(idea: Idea, event?: Event): void {
  event?.stopPropagation();
  
  if (idea.isPromotedToProject) {
    alert('Already promoted!');
    return;
  }

  this.currentIdeaToPromote = idea;
  this.projectData = {
    title: idea.title,
    description: idea.description,
    overseenByEmail: ''
  };
  this.showProjectModal = true;
}

createProjectFromIdea(): void {
  if (!this.currentIdeaToPromote || !this.groupId) return;
  if (!this.projectData.overseenByEmail) {
    alert('Enter overseer email');
    return;
  }

  this.isPromoting = true;
  const idea = this.currentIdeaToPromote;

  this.ideasService.promoteIdea({
    ideaId: idea.id,
    groupId: this.groupId
  }).subscribe({
    next: (promoteRes) => {
      if (promoteRes.success) {
        this.projectService.createProject(
          this.groupId, 
          idea.id, 
          this.projectData
        ).subscribe({
          next: (projectRes) => this.handleSuccess(idea, projectRes),
          error: (err) => this.handleProjectError(err)
        });
      } else {
        this.isPromoting = false;
        alert('Promotion failed');
      }
    },
    error: (err) => {
      this.isPromoting = false;
      alert('Error promoting');
    }
  });
}

private handleSuccess(idea: Idea, response: any): void {
  this.isPromoting = false;
  this.showProjectModal = false;

  if (response.success) {
    idea.isPromotedToProject = true;
    idea.status = 'Promoted';
    
    if (this.selectedIdea?.id === idea.id) {
      this.selectedIdea.isPromotedToProject = true;
      this.selectedIdea.status = 'Promoted';
    }
    
    this.ideas = [...this.ideas];
    alert('Project created');
    
    this.currentIdeaToPromote = null;
    this.projectData = { title: '', description: '', overseenByEmail: '' };
  } else {
    alert('Project creation failed');
  }
}

private handleProjectError(error: any): void {
  this.isPromoting = false;
  
  if (error.status === 404) {
    alert(`User not found: ${this.projectData.overseenByEmail}`);
  } else {
    alert('Failed to create project');
  }
}

closeProjectModal(): void {
  if (!this.isPromoting) {
    this.showProjectModal = false;
    this.currentIdeaToPromote = null;
  }
}
  // DELETE IDEA METHOD
  onDeleteIdea(ideaId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      console.log('Delete button clicked for idea ID:', ideaId);
    }

    console.log('==== DELETE ACTION STARTED ====');
    console.log('Idea ID to delete:', ideaId);
    console.log('Idea ID type:', typeof ideaId);
    console.log('Idea ID value:', ideaId);

    // Use confirmation dialog
    if (confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
      console.log('Deleting idea ID:', ideaId);

      this.ideasService.deleteIdea(ideaId).subscribe({
        next: (response) => {
          console.log('Delete response:', response);

          if (response.success) {
            console.log('Delete successful');

            // 1. Remove from local ideas array (immediate UI update)
            const index = this.ideas.findIndex(idea => idea.id === ideaId);
            if (index !== -1) {
              this.ideas.splice(index, 1);
              this.ideas = [...this.ideas]; // Create new reference for change detection
            }

            // 2. If we're viewing this idea in details panel, close it
            if (this.selectedIdea && this.selectedIdea.id === ideaId) {
              this.selectedIdea = null;
              this.isEditMode = false; // Exit edit mode if open
              console.log('Closed details panel for deleted idea');
            }

            // No ideas left?
            if (this.ideas.length === 0) {
              console.log('All ideas deleted, showing empty state');
            }
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
  }
}