import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project, ProjectStatus } from '../../Interfaces/Projects/Project';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ProjectsService } from '../../Services/projects/projects.service';
import { AuthService } from '../../Services/auth/auth.service';
import { ToastService } from '../../Services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalComponent } from '../../Components/modal/modal.component';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { formatFileSize, detectMediaType, removeFileAtIndex, processSelectedFiles } from '../../Components/utils/media.utils';
import { firstValueFrom } from 'rxjs';

type EditProjectForm = {
    title: string;
    description: string;
    status: ProjectStatus | string;
    endedAt: string | null;
};
import { MediaService } from '../../Services/media.service';
import { forkJoin, Observable, EMPTY, catchError, map, tap, switchMap } from 'rxjs';
import { Media } from '../../Interfaces/Media/media-interface';
import { MediaComponent } from '../media/media.component';

type ProjectWithMedia = Project & { media?: Media[] };

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, ModalComponent, ButtonsComponent, MediaComponent],
    templateUrl: './projects.component.html',
    styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
    projects: ProjectWithMedia[] = [];
    ProjectStatus = ProjectStatus;


    private projectsService = inject(ProjectsService);
    private mediaService = inject(MediaService);
    private dialog = inject(MatDialog);
    private authService = inject(AuthService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    currentUserId: string = '';
    selectedProject: Project | null = null;
    isEditModalOpen = false;
    isViewModalOpen = false;
    selectedProjectFiles: File[] = [];
    allowedFileTypes = '.jpg,.jpeg,.png,.gif,.bmp,.webp,.mp4,.mov,.avi,.wmv,.pdf,.doc,.docx,.txt,.xls,.xlsx';
    isUploadingIdeaMedia = false;
    ideaUploadStatus = '';

    editForm: EditProjectForm = {
        title: '',
        description: '',
        status: '',
        endedAt: null
    };

    isReloading = false;

    activeActionMenuId: number | null = null;
    activeMediaProjectId: number | null = null;

    // Deletion Modal State
    isDeleteModalOpen = false;
    projectToDelete: Project | null = null;
    deleteConfirmName = '';
    isDeletingProject = false;

    private toastService = inject(ToastService);

    ngOnInit(): void {
        this.currentUserId = this.authService.getUserId();

        this.route.queryParams.subscribe((params: any) => {
            const projectId = params['openProject'];
            this.loadProjects().subscribe(() => {
                if (projectId) {
                    this.openProjectFromQuery(projectId);
                }
            });
        });

    }


    calculateProgress(status: ProjectStatus): number {
        switch (status) {
            case ProjectStatus.Planning: return 0;
            case ProjectStatus.Active: return 50;
            case ProjectStatus.Completed: return 100;
            case ProjectStatus.Shelved: return 25;
            case ProjectStatus.Cancelled: return 0;
            default: return 0;
        }
    }

    toggleActionMenu(event: Event, projectId: number): void {
        event.stopPropagation();
        this.activeActionMenuId = this.activeActionMenuId === projectId ? null : projectId;
        this.activeMediaProjectId = null;
    }

    toggleMediaPopup(event: Event, projectId: number): void {
        event.stopPropagation();
        this.activeMediaProjectId = this.activeMediaProjectId === projectId ? null : projectId;
        this.activeActionMenuId = null;
    }

    @HostListener('document:click')
    closeMenus(): void {
        this.activeActionMenuId = null;
        this.activeMediaProjectId = null;
    }


    canEdit(project: Project): boolean {
        // Strict check: Only overseer can edit
        return this.currentUserId === project.overseenById;
    }

    loadProjects(): Observable<void> {
        return this.projectsService.getMyProjects().pipe(
            switchMap((projectsData) => {
                this.projects = projectsData as ProjectWithMedia[];
                const mediaRequests = this.projects.map(project =>
                    this.mediaService.viewMedia(undefined, undefined, Number(project.id))
                );
                return forkJoin(mediaRequests);
            }),
            tap((mediaResults) => {
                this.projects.forEach((project, idx) => {
                    project.media = mediaResults[idx].data || [];
                });
            }),
            map(() => void 0),  // Return void
            catchError((err) => {
                this.toastService.show('Failed to load projects', 'error');
                return EMPTY;
            })
        );
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

    trackByProjectId(index: number, project: ProjectWithMedia): number {
        return project.id;
    }

    openEditModal(project: Project) {
        this.selectedProject = project;
        this.editForm = {
            title: project.title,
            description: project.description,
            status: ProjectStatus[project.status],
            endedAt: project.endedAt ?? null
        };
        this.isEditModalOpen = true;
    }

    openViewModal(project: Project) {
        this.selectedProject = project;
        this.isViewModalOpen = true;
    }

    async saveProject() {
        if (!this.selectedProject) return;

        const updateDto = {
            title: this.editForm.title,
            description: this.editForm.description,
            status: this.editForm.status,
            endedAt: this.editForm.endedAt
                ? new Date(this.editForm.endedAt).toISOString()
                : null
        };

        try {
            await firstValueFrom(
                this.projectsService.updateProject(this.selectedProject.id, updateDto)
            );

            if (this.selectedProjectFiles?.length > 0) {
                const mediaUploadPromises = this.selectedProjectFiles.map(file =>
                    firstValueFrom(
                        this.mediaService.uploadMedia(
                            file,
                            detectMediaType(file),
                            undefined,
                            undefined,
                            Number(this.selectedProject!.id)
                        )
                    )
                );

                await Promise.all(mediaUploadPromises);
                this.toastService.show('Project updated with media successfully', 'success');
            } else {
                this.toastService.show('Project updated without media. Click the project and try uploading the media again.', 'info');
            }

            this.isReloading = true;

            this.loadProjects().subscribe({
                next: () => {
                    this.isReloading = false;
                },
                error: () => {
                    this.isReloading = false;
                }
            });

            this.closeModals();
            this.selectedProjectFiles = [];

        } catch (error: any) {
            this.toastService.show('Failed to save project', 'error');
        }
    }

    openDeleteModal(project: Project): void {
        this.projectToDelete = project;
        this.deleteConfirmName = '';
        this.isDeleteModalOpen = true;
        this.activeActionMenuId = null;
    }

    closeDeleteModal(): void {
        this.isDeleteModalOpen = false;
        this.projectToDelete = null;
        this.deleteConfirmName = '';
        this.isDeletingProject = false;
    }

    get isDeleteNameMatch(): boolean {
        return this.projectToDelete?.title === this.deleteConfirmName;
    }

    confirmDelete(): void {
        if (!this.projectToDelete || !this.isDeleteNameMatch || this.isDeletingProject) return;

        this.isDeletingProject = true;
        this.projectsService.deleteProject(this.projectToDelete.id).subscribe({
            next: () => {
                this.toastService.show('Project deleted successfully', 'success');
                this.isDeletingProject = false;
                this.closeDeleteModal();
                this.loadProjects().subscribe();
            },
            error: (err) => {
                this.isDeletingProject = false;
                this.toastService.show(err.message || 'Failed to delete project', 'error');
            }
        });
    }

    navigateToTasks(projectId: number): void {
        this.router.navigate(['/projects', projectId, 'tasks']);
        this.activeActionMenuId = null;
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

    onProjectFileSelected(event: Event): void {

        const result = processSelectedFiles(
            event,
            this.selectedProjectFiles
        );

        this.selectedProjectFiles = result.files;

        result.errors.forEach(msg =>
            this.toastService.show(msg, 'warning')
        );
    }

    removeProjectFile(index: number): void {
        this.selectedProjectFiles = removeFileAtIndex(
            this.selectedProjectFiles,
            index
        );
    }

    formatProjectFileSize(bytes: number): string {
        return formatFileSize(bytes);
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

