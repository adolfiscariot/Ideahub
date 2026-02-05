import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project, ProjectStatus } from '../../Interfaces/Projects/Project';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditProjectModalComponent } from '../../Components/modals/edit-project-modal/edit-project-modal.component';
import { ProjectsService } from '../../Services/projects/projects.service';
import { AuthService } from '../../Services/auth/auth.service';
import { Toast, ToastService } from '../../Services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { ModalComponent } from '../../Components/modal/modal.component';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';

type EditProjectForm = {
  title: string;
  description: string;
  status: ProjectStatus | string;
  endedAt: string | null;
};

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, ModalComponent, ButtonsComponent],
    templateUrl: './projects.component.html',
    styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
    projects: Project[] = [];
    ProjectStatus = ProjectStatus;

    
    private projectsService = inject(ProjectsService);
    private dialog = inject(MatDialog);
    private authService = inject(AuthService);
    private route = inject(ActivatedRoute);
    currentUserId: string = '';
    selectedProject: Project | null = null;
    isEditModalOpen = false;
    isViewModalOpen = false;
    
    editForm: EditProjectForm = {
        title: '',
        description: '',
        status: '',
        endedAt: null
    };


    constructor(
        private toastService: ToastService
    ) {}

    ngOnInit(): void {
        this.currentUserId = this.authService.getUserId();

        this.route.queryParams.subscribe((params: any) => {
            const projectId = params['openProject'];
            if (projectId) {
                this.loadProjects(() => {
                    this.openProjectFromQuery(projectId);
                });
            } else {
                this.loadProjects();
            }
        });
    }

    canEdit(project: Project): boolean {
        // Strict check: Only overseer can edit
        return this.currentUserId === project.overseenById;
    }

    loadProjects(callback?: () => void): void {
        this.projectsService.getMyProjects().subscribe({
            next: (data) => {
                this.projects = data;
                if (callback) callback();
            },
            error: (err) => {
                console.error('Failed to load projects', err);
                // Optionally show error toast
            }
        });
    }

    getStatusLabel(status: ProjectStatus): string {
        return ProjectStatus[status];
    }

    getStatusClass(status: ProjectStatus): string {
        switch (status) {
            case ProjectStatus.Planning: return 'status-planning';
            case ProjectStatus.Active: return 'status-active';
            case ProjectStatus.Completed: return 'status-completed';
            case ProjectStatus.Shelved: return 'status-shelved';
            case ProjectStatus.Cancelled: return 'status-cancelled';
            default: return '';
        }
    }


       openEditModal(project: Project) {
        this.selectedProject = project;
        this.editForm = {
            title: project.title,
            description: project.description,
            status: project.status,
            endedAt: project.endedAt ?? null
        };
        this.isEditModalOpen = true;
       }

       openViewModal(project: Project) {
        this.selectedProject = project;
        this.isViewModalOpen = true;
       }

       saveProject() {
        const updateDto = {
            title: this.editForm.title,
            description: this.editForm.description,
            status: this.editForm.status,
            endedAt: this.editForm.endedAt
            ? new Date(this.editForm.endedAt).toISOString()
            : null
        };

        this.projectsService.updateProject(this.selectedProject!.id, updateDto)
            .subscribe({
            next: () => {
                this.toastService.show('Project updated successfully', 'success');
                this.loadProjects();
                this.closeModals();
            },
            error: () => {
                this.toastService.show('Failed to update project', 'error');
            }
            });
}


       closeModals() {
        this.isEditModalOpen = false;
        this.isViewModalOpen = false;
        this.selectedProject = null;
       }

       openProjectFromQuery(projectId: string) {
            const project = this.projects.find(p => p.id === Number(projectId));
            if (!project) return;

            this.selectedProject = project;

            if (this.canEdit(project)) {
                this.openEditModal(project);
            } else {
                this.openViewModal(project);
            }
        }



    // openEditModal(project: Project): void {
    //     const dialogRef = this.dialog.open(EditProjectModalComponent, {
    //         width: '500px',
    //         data: { project }
    //     });

    //     dialogRef.afterClosed().subscribe(result => {
    //         if (result) {
    //             // Prepare update DTO
    //             const updateDto = {
    //                 title: result.title,
    //                 description: result.description,
    //                 // Convert numeric enum to string key for backend
    //                 status: ProjectStatus[result.status],
    //                 endedAt: result.endedAt ? new Date(result.endedAt).toISOString() : null
    //             };

    //             this.projectsService.updateProject(project.id, updateDto).subscribe({
    //                 next: (updatedProject) => {
    //                     console.log('Project updated successfully');
    //                     this.toastService.show('Project updated successfuly', 'success');
    //                     this.loadProjects(); // Reload to get fresh data
    //                 },
    //                 error: (err) => {
    //                     console.error('Failed to update project', err);
    //                     this.toastService.show('Failed to update project', 'error');
    //                 }
    //             });
    //         }
    //     });
    // }
     
    }

