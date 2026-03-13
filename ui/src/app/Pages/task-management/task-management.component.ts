import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../Services/task.service';
import { TaskDetails, TaskDto } from '../../Interfaces/Tasks/task-interface';
import { CommitteeMembersService } from '../../Services/committeemembers.service';
import { ToastService } from '../../Services/toast.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MediaService } from '../../Services/media.service';
import { detectMediaType, processSelectedFiles, removeFileAtIndex, formatFileSize } from '../../Components/utils/media.utils';
import { forkJoin, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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

  projectId: number = 0;
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

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = +params['projectId'];
      if (this.projectId) {
        this.loadTasks();
        this.loadUsers();
      }
    });
  }

  loadTasks(): void {
    this.isLoading = true;
    this.taskService.getProjectTasks(this.projectId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.tasks = response.data || [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
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

  toggleAssignee(userId: string): void {
    const index = this.newTask.assigneeIds.indexOf(userId);
    if (index > -1) {
      this.newTask.assigneeIds.splice(index, 1);
    } else {
      this.newTask.assigneeIds.push(userId);
    }
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
}
