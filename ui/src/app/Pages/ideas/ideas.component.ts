import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IdeasService } from '../../Services/ideas.services';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { Idea, CreateIdeaRequest } from '../../Interfaces/Ideas/idea-interfaces';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ShareIdeaModalComponent } from '../../Components/modals/share-idea-modal/share-idea-modal.component';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ShareIdeaModalComponent],
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
  
  private routeSub: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ideasService: IdeasService,
    private groupsService: GroupsService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    // Get current user ID from auth service
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('=== INITIALIZATION ===');
    console.log('Current User ID:', this.currentUserId);
    console.log('Current User ID type:', typeof this.currentUserId);
    
    this.routeSub = this.route.params.subscribe(params => {
      this.groupId = params['groupId'];
      console.log('Group ID from route:', this.groupId);
      this.loadGroupInfo();
      this.loadIdeas();
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
  }

  loadGroupInfo(): void {
    this.groupsService.getGroups().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const group = response.data.find((g: any) => g.id === this.groupId);
          if (group) {
            this.groupName = group.name;
          }
        }
      },
      error: (error) => {
        console.error('Error loading group info:', error);
      }
    });
  }

  selectedIdea: any = null;
  membersCount: string = '';

  selectIdea(idea: any): void {
    this.selectedIdea = idea;
  }

  closeSidebar() {
    this.selectedIdea = null;
  }

  openMembersModal() {
    console.log('Open members modal - to be implemented')
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

  
  loadIdeas(): void {
  this.isLoading = true;
  this.ideasService.getIdeasByGroup(this.groupId).subscribe({
    next: (response) => {
      this.isLoading = false;
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        this.ideas = response.data.map((idea: any) => {
          console.log('Processing idea:', idea);
          
          // Create object with ALL required properties from Idea interface
          const mappedIdea: Idea = {
            // Required string properties
            id: idea.id?.toString() || '',
            title: idea.title || '',
            description: idea.description || '',
            UserId: idea.userId || idea.UserId || '', // UPPERCASE - required!
            userId: idea.userId || idea.UserId || '', // lowercase - optional
            groupId: this.groupId, // REQUIRED - use component's groupId
            
            // Required boolean properties
            isPromotedToProject: idea.isPromotedToProject || false,
            isDeleted: idea.isDeleted || false, // REQUIRED
            
            // Required Date properties
            createdAt: new Date(idea.createdAt || new Date()),
            updatedAt: new Date(idea.updatedAt || new Date()), // REQUIRED
            
            // Required string property
            status: idea.status || 'Open',
            
            // properties to be added later
            deletedAt: idea.deletedAt ? new Date(idea.deletedAt) : undefined,
            voteCount: idea.voteCount || 0,
            commentCount: idea.commentCount || 0,
            userVoted: idea.userVoted || false,
            userName: idea.userName || '',
            groupName: idea.name || '',
            name: idea.name || ''
          };
          
          return mappedIdea;
        });
        
        console.log('Processed ideas:', this.ideas);
      }
    },
    error: (error) => {
      this.isLoading = false;
      console.error('Error loading ideas:', error);
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
    
    // Get userId from idea (should be available now from API)
    const ideaUserId = idea.userId;
    
    if (!ideaUserId) {
      console.log('No userId found in idea:', idea);
      return false;
    }
    
    // Normalize both IDs (trim and lowercase) - same as groups component
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

  openShareModal(): void {
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
  }

  onShareIdea(ideaData: {title: string, description: string}): void {
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
    this.ideasService.voteForIdea({ ideaId, groupId: this.groupId }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadIdeas(); // Refresh to update vote count
        } else {
          alert(`Failed to vote: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error voting:', error);
      }
    });
  }

  onDeleteIdea(ideaId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      console.log('Delete button clicked for idea ID:', ideaId);
    }

    console.log('====DELETE ACTION STARTED');
    console.log('Idea ID to delete:', ideaId);
    console.log('Idea ID type:', typeof ideaId);
    console.log('Idea ID value:', ideaId);
    
    // Use confirmation dialog
    if (confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
      console.log('Deleting idea ID:', ideaId);
      
      this.ideasService.deleteIdea(ideaId).subscribe({
        next: (response) => {
          console.log('Closed sidebar for deleted idea');
          if (response.success) {
            console.log('Delete successful:', response);
            
            // If we're viewing this idea in sidebar, close it
            if (this.selectedIdea && this.selectedIdea.id === ideaId) {
              this.selectedIdea = null;
            }
            
            // Refresh the list
            this.loadIdeas();
            
            // Show success message
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