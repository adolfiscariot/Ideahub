import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../Services/task.service';
import { TaskDetails, TaskDto, SubTaskDto, SubTaskUpdateDto, SubTaskDetails } from '../../Interfaces/Tasks/task-interface';
import { CommitteeMembersService } from '../../Services/committeemembers.service';
import { ToastService } from '../../Services/toast.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MediaService } from '../../Services/media.service';
import { detectMediaType, processSelectedFiles, removeFileAtIndex, formatFileSize } from '../../Components/utils/media.utils';
import { forkJoin, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ProjectService } from '../../Services/project.service';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ButtonsComponent],
  templateUrl: './task-management.component.html',
  styleUrl: './task-management.component.scss',
})
export class TaskManagementComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  private committeeService = inject(CommitteeMembersService);
  private toastService = inject(ToastService);
  private mediaService = inject(MediaService);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);

  projectId: number = 0;
  projectOverseerId: string = '';
  tasks: TaskDetails[] = [];
  isLoading = false;

  // New Task Form
  newTask: TaskDto = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    labels: '',
    assigneeIds: []
  };

  labelInput: string = '';
  taskLabels: string[] = [];

  availableUsers: any[] = [];
  isCreating = false;
  showUserDropdown = false;
  selectedTask: TaskDetails | null = null;

  selectedFiles: File[] = [];
  carouselIndex: number = 0;
  sortOption: string = 'dueDate';

  // Subtask Modal
  isSubTaskModalOpen = false;
  targetTaskId: number = 0;
  newSubTask: SubTaskDto = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    assigneeIds: []
  };
  showSubTaskUserDropdown = false;
  showInlineSubTaskUserDropdown = false;
  isCreatingSubTask = false;

  activeInspectionTab: 'subtasks' | 'timesheets' = 'subtasks';

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = +params['projectId'];
      if (this.projectId) {
        this.loadProjectInfo();
        this.loadTasks();
        this.loadUsers();
      }
    });
  }

  loadProjectInfo(): void {
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (response) => {
        if (response.success) {
          this.projectOverseerId = response.data.overseenByUserId;
        }
      }
    });
  }

  get canCreateTask(): boolean {
    return this.authService.getUserId() === this.projectOverseerId;
  }

  loadTasks(): void {
    this.isLoading = true;
    this.taskService.getProjectTasks(this.projectId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.tasks = response.data || [];
          this.sortTasks();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  sortTasks(): void {
    if (this.sortOption === 'dueDate') {
      this.tasks.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }
  }

  getCompletedSubtasks(task: TaskDetails): number {
    return task.subTasks ? task.subTasks.filter(st => st.isCompleted).length : 0;
  }

  calculateProgress(task: TaskDetails): number {
    if (!task.subTasks || task.subTasks.length === 0) {
      return task.isCompleted ? 100 : 0;
    }
    const completed = this.getCompletedSubtasks(task);
    return Math.round((completed / task.subTasks.length) * 100);
  }

  getProgressColor(progress: number): string {
    if (progress <= 25) return 'red';
    if (progress < 75) return 'orange';
    return 'green';
  }

  setInspectionTab(tab: 'subtasks' | 'timesheets'): void {
    this.activeInspectionTab = tab;
  }

  nextTasks(): void {
    if (this.carouselIndex + 4 < this.tasks.length) {
      this.carouselIndex++;
    }
  }

  prevTasks(): void {
    if (this.carouselIndex > 0) {
      this.carouselIndex--;
    }
  }

  getVisibleTasks(): TaskDetails[] {
    return this.tasks.slice(this.carouselIndex, this.carouselIndex + 4);
  }

  loadUsers(): void {
    this.committeeService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableUsers = response.data || [];
        }
      }
    });
  }

  getUserName(userId: string): string {
    const user = this.availableUsers.find(u => u.id === userId);
    return user ? user.fullName || user.email : 'Unknown User';
  }

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
  }

  addLabel(event: Event): void {
    event.preventDefault();
    const value = this.labelInput.trim();

    if (value && !this.taskLabels.includes(value)) {
      this.taskLabels.push(value);
      this.labelInput = '';
    }
  }

  removeLabel(label: string): void {
    this.taskLabels = this.taskLabels.filter(l => l !== label);
  }

  getLabels(labels: string): string[] {
    if (!labels) return [];
    return labels.split(',').filter(l => l.trim().length > 0);
  }

  toggleAssignee(userId: string): void {
    const index = this.newTask.assigneeIds.indexOf(userId);
    if (index > -1) {
      this.newTask.assigneeIds.splice(index, 1);
    } else {
      this.newTask.assigneeIds.push(userId);
    }
    this.showUserDropdown = false;
  }

  isAssigneeSelected(userId: string): boolean {
    return this.newTask.assigneeIds.includes(userId);
  }

  selectTask(task: TaskDetails): void {
    this.selectedTask = task;
  }

  onFilesSelected(event: Event): void {
    const result = processSelectedFiles(event, this.selectedFiles);
    this.selectedFiles = result.files;
    result.errors.forEach(err => this.toastService.show(err, 'warning'));
  }

  removeFile(index: number): void {
    this.selectedFiles = removeFileAtIndex(this.selectedFiles, index);
  }

  formatSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  createTask(): void {
    if (!this.newTask.title || !this.newTask.startDate || !this.newTask.endDate) {
      this.toastService.show('Please fill in all required fields', 'warning');
      return;
    }

    this.isCreating = true;

    // Pick up any pending label that wasn't "entered"
    const pendingLabel = this.labelInput.trim();
    if (pendingLabel && !this.taskLabels.includes(pendingLabel)) {
      this.taskLabels.push(pendingLabel);
      this.labelInput = '';
    }

    this.newTask.labels = this.taskLabels.join(',');

    this.taskService.createTask(this.projectId, this.newTask).pipe(
      switchMap((response) => {
        if (response.success && response.data) {
          const taskId = response.data.id;
          if (this.selectedFiles.length > 0) {
            const uploadRequests = this.selectedFiles.map(file =>
              this.mediaService.uploadMedia(
                file,
                detectMediaType(file),
                undefined,
                taskId,
                undefined
              )
            );
            return forkJoin(uploadRequests).pipe(
              switchMap(() => {
                this.toastService.show('Task created with media successfully', 'success');
                return from([response]);
              })
            );
          } else {
            this.toastService.show('Task created successfully', 'success');
            return from([response]);
          }
        } else {
          throw new Error(response.message || 'Failed to create task');
        }
      })
    ).subscribe({
      next: (response) => {
        this.resetForm();
        this.loadTasks();
        this.isCreating = false;
      },
      error: (err) => {
        this.toastService.show(err.message || 'An error occurred', 'error');
        this.isCreating = false;
      }
    });
  }

  resetForm(): void {
    this.newTask = {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      labels: '',
      assigneeIds: []
    };
    this.taskLabels = [];
    this.labelInput = '';
    this.showUserDropdown = false;
    this.selectedFiles = [];
  }

  // --- SUBTASK MODAL METHODS ---
  openSubTaskModal(taskId: number): void {
    this.targetTaskId = taskId;
    this.isSubTaskModalOpen = true;
    this.resetSubTaskForm();
  }

  closeSubTaskModal(): void {
    this.isSubTaskModalOpen = false;
    this.showSubTaskUserDropdown = false;
  }

  toggleSubTaskAssignee(userId: string): void {
    const index = this.newSubTask.assigneeIds.indexOf(userId);
    if (index > -1) {
      this.newSubTask.assigneeIds.splice(index, 1);
    } else {
      this.newSubTask.assigneeIds.push(userId);
    }
    this.showSubTaskUserDropdown = false;
  }

  isSubTaskAssigneeSelected(userId: string): boolean {
    return this.newSubTask.assigneeIds.includes(userId);
  }

  createSubTask(): void {
    if (!this.newSubTask.title || !this.newSubTask.startDate || !this.newSubTask.endDate) {
      this.toastService.show('Please fill in required fields', 'warning');
      return;
    }

    this.isCreatingSubTask = true;
    this.taskService.createSubTask(this.targetTaskId, this.newSubTask).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.show('Subtask created successfully', 'success');
          this.closeSubTaskModal();
          this.loadTasks(); // Refresh list
          
          // Also update selectedTask if it's the one we're looking at
          if (this.selectedTask?.id === this.targetTaskId) {
            this.taskService.getProjectTasks(this.projectId).subscribe({
              next: (tasksResponse) => {
                const refreshedTask = tasksResponse.data?.find(t => t.id === this.targetTaskId);
                if (refreshedTask) {
                  this.selectedTask = refreshedTask;
                }
              }
            });
          }
        }
        this.isCreatingSubTask = false;
      },
      error: (err) => {
        this.toastService.show(err.message || 'Failed to create subtask', 'error');
        this.isCreatingSubTask = false;
      }
    });
  }

  toggleSubTaskStatus(subTask: SubTaskDetails): void {
    const taskId = this.selectedTask?.id;
    if (!taskId) return;

    const updateDto: SubTaskUpdateDto = {
      title: subTask.title,
      description: subTask.description || '',
      startDate: subTask.startDate,
      endDate: subTask.endDate,
      isCompleted: !subTask.isCompleted,
      assigneeIds: subTask.assigneeIds
    };

    this.taskService.updateSubTask(subTask.id, updateDto).subscribe({
      next: (response) => {
        if (response.success) {
          // Update locally
          subTask.isCompleted = !subTask.isCompleted;
          this.toastService.show('Subtask updated', 'success');
          // Refresh list to update task-level progress bars
          this.loadTasks();
        }
      }
    });
  }

  resetSubTaskForm(): void {
    this.newSubTask = {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      assigneeIds: []
    };
  }
}
