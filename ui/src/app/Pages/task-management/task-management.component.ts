import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../Services/task.service';
import {
  TaskDetails,
  TaskDto,
  TaskUpdateDto,
  SubTaskDto,
  SubTaskUpdateDto,
  SubTaskDetails,
} from '../../Interfaces/Tasks/task-interface';
import { CommitteeMembersService } from '../../Services/committeemembers.service';
import { ToastService } from '../../Services/toast.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MediaService } from '../../Services/media.service';
import {
  detectMediaType,
  processSelectedFiles,
  removeFileAtIndex,
  formatFileSize,
} from '../../Components/utils/media.utils';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ProjectService } from '../../Services/project.service';
import { AuthService } from '../../Services/auth/auth.service';
import { TimesheetsComponent } from '../timesheets/timesheets.component';
import { MediaComponent } from '../media/media.component';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { UserRecord } from '../../Interfaces/Users/user-interface';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    ButtonsComponent,
    TimesheetsComponent,
    MediaComponent,
  ],
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

  projectId = 0;
  projectOverseerId = '';
  currentUserId = '';
  tasks: TaskDetails[] = [];
  isLoading = false;

  // New Task Form
  newTask: TaskDto = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    labels: '',
    taskAssignees: [],
  };

  labelInput = '';
  taskLabels: string[] = [];

  availableUsers: UserRecord[] = [];
  isCreating = false;
  showUserDropdown = false;
  selectedTask: TaskDetails | null = null;

  selectedFiles: File[] = [];
  carouselIndex = 0;
  sortOption = 'taskNumber';

  // Subtask Modal
  isSubTaskModalOpen = false;
  targetTaskId = 0;
  newSubTask: SubTaskDto = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    subTaskAssignees: [],
  };
  showSubTaskUserDropdown = false;
  showInlineSubTaskUserDropdown = false;
  isCreatingSubTask = false;
  selectedSubTaskFiles: File[] = [];
  parentSubTaskId: number | null = null;

  // Edit Task Modal
  isEditTaskModalOpen = false;
  editingTaskId = 0;
  editTask: TaskUpdateDto = {};
  editTaskLabels: string[] = [];
  editLabelInput = '';
  showEditUserDropdown = false;
  editTaskAssigneeIds: string[] = [];
  isUpdatingTask = false;

  // Delete Task Confirmation
  isPendingDeleteTask = false;
  pendingDeleteTaskId = 0;
  pendingDeleteTaskTitle = '';
  isDeletingTask = false;

  // Edit SubTask Modal
  isEditSubTaskModalOpen = false;
  editingSubTaskId = 0;
  editSubTask: SubTaskUpdateDto = {};
  showEditSubTaskUserDropdown = false;
  editSubTaskAssigneeIds: string[] = [];
  isUpdatingSubTask = false;

  // Delete SubTask Confirmation
  isPendingDeleteSubTask = false;
  pendingDeleteSubTaskId = 0;
  pendingDeleteSubTaskTitle = '';
  isDeletingSubTask = false;

  activeInspectionTab: 'subtasks' | 'media' = 'subtasks';
  selectedTaskMediaCount = 0;
  activeMainTab: 'tasks' | 'timesheets' = 'tasks';
  isTabSwitching = false;

  ngOnInit(): void {
    this.authService.getUserId().subscribe((id: string) => {
      this.currentUserId = id;
    });

    this.route.params.subscribe((params) => {
      this.projectId = +params['projectId'];
      if (this.projectId) {
        this.loadInitialData();
      }
    });
  }

  loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      project: this.projectService.getProjectById(this.projectId),
      tasks: this.taskService.getProjectTasks(this.projectId),
      users: this.committeeService.getAllUsers(),
    })
      .pipe(
        catchError((err) => {
          this.isLoading = false;
          const errorMessage =
            err.error?.message ||
            'You do not have permission to access this project workspace.';
          this.toastService.show(errorMessage, 'error');
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (!result) return;

        const { project, tasks, users } = result;

        if (project.success && project.data) {
          this.projectOverseerId = project.data.overseenByUserId || '';
        }

        if (tasks.success) {
          this.tasks = tasks.data || [];
          this.sortTasks();

          if (this.selectedTask) {
            const updatedTask = this.tasks.find(
              (t) => t.id === this.selectedTask?.id,
            );
            if (updatedTask) {
              this.selectedTask = updatedTask;
            }
          }
        }

        if (users.success) {
          this.availableUsers = users.data || [];
        }

        this.isLoading = false;
      });
  }

  get canCreateTask(): boolean {
    return (
      !!this.currentUserId && this.currentUserId === this.projectOverseerId
    );
  }

  canManageTask(task: TaskDetails): boolean {
    return (
      (!!this.currentUserId && this.currentUserId === this.projectOverseerId) ||
      (task.taskAssignees && task.taskAssignees.includes(this.currentUserId))
    );
  }

  canManageSubTask(
    st: SubTaskDetails,
    task: TaskDetails | null = null,
  ): boolean {
    // Allow if Overseer
    if (!!this.currentUserId && this.currentUserId === this.projectOverseerId)
      return true;

    // Allow if SubTask Assignee
    if (st.subTaskAssignees && st.subTaskAssignees.includes(this.currentUserId))
      return true;

    // Allow if Task Assignee (parent of the subtask)
    const effectiveTask = task || this.selectedTask;
    if (
      effectiveTask &&
      effectiveTask.taskAssignees &&
      effectiveTask.taskAssignees.includes(this.currentUserId)
    )
      return true;

    return false;
  }

  // Note: loadTasks is now part of loadInitialData for ngOnInit but kept as a helper for updates
  loadTasks(): void {
    this.taskService.getProjectTasks(this.projectId).subscribe({
      next: (response: ApiResponse<TaskDetails[]>) => {
        if (response.success) {
          this.tasks = response.data || [];
          this.sortTasks();

          if (this.selectedTask) {
            const updatedTask = this.tasks.find(
              (t) => t.id === this.selectedTask?.id,
            );
            if (updatedTask) {
              this.selectedTask = updatedTask;
            }
          }
        }
      },
      error: (err) => {
        // Only show individual error if not during initial load
        if (!this.isLoading) {
          const errorMessage = err.error?.message || 'Failed to load tasks.';
          this.toastService.show(errorMessage, 'error');
        }
      },
    });
  }

  sortTasks(): void {
    if (this.sortOption === 'dueDate') {
      this.tasks.sort(
        (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
      );
    } else if (this.sortOption === 'taskNumber') {
      this.tasks.sort((a, b) => a.id - b.id);
    }
  }

  getCompletedSubtasks(task: TaskDetails): number {
    return task.subTasks
      ? task.subTasks.filter((st) => st.isCompleted).length
      : 0;
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

  setInspectionTab(tab: 'subtasks' | 'media'): void {
    this.activeInspectionTab = tab;
  }

  setMainTab(tab: 'tasks' | 'timesheets'): void {
    if (this.activeMainTab === tab) return;
    this.isTabSwitching = true;
    this.activeMainTab = tab;
    setTimeout(() => {
      this.isTabSwitching = false;
    }, 150);
  }

  getSubTasksByParent(parentId: number | null): SubTaskDetails[] {
    if (!this.selectedTask?.subTasks) return [];
    return this.selectedTask.subTasks.filter(
      (st) => (st.parentSubTaskId || null) === parentId,
    );
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

  // Note: loadUsers is now part of loadInitialData for ngOnInit but kept as a helper if needed
  loadUsers(): void {
    this.committeeService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableUsers = response.data || [];
        }
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Failed to load users.';
        this.toastService.show(errorMessage, 'error');
      },
    });
  }

  getUserName(userId: string): string {
    const user = this.availableUsers.find((u) => u.id === userId);
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
    this.taskLabels = this.taskLabels.filter((l) => l !== label);
  }

  getLabels(labels: string): string[] {
    if (!labels) return [];
    return labels.split(',').filter((l) => l.trim().length > 0);
  }

  toggleAssignee(userId: string): void {
    const index = this.newTask.taskAssignees.indexOf(userId);
    if (index > -1) {
      this.newTask.taskAssignees.splice(index, 1);
    } else {
      this.newTask.taskAssignees.push(userId);
    }
    this.showUserDropdown = false;
  }

  isAssigneeSelected(userId: string): boolean {
    return this.newTask.taskAssignees.includes(userId);
  }

  selectTask(task: TaskDetails): void {
    this.selectedTask = task;
    this.loadSelectedTaskMediaCount();
  }

  loadSelectedTaskMediaCount(): void {
    if (!this.selectedTask) return;
    this.mediaService
      .viewMedia(undefined, undefined, undefined, this.selectedTask.id)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selectedTaskMediaCount = response.data.length;
          }
        },
        error: () => {
          this.selectedTaskMediaCount = 0;
        },
      });
  }

  onFilesSelected(event: Event): void {
    const result = processSelectedFiles(event, this.selectedFiles);
    this.selectedFiles = result.files;
    result.errors.forEach((err) => this.toastService.show(err, 'warning'));
  }

  removeFile(index: number): void {
    this.selectedFiles = removeFileAtIndex(this.selectedFiles, index);
  }

  onSubTaskFilesSelected(event: Event): void {
    const result = processSelectedFiles(event, this.selectedSubTaskFiles);
    this.selectedSubTaskFiles = result.files;
    result.errors.forEach((err) => this.toastService.show(err, 'warning'));
  }

  removeSubTaskFile(index: number): void {
    this.selectedSubTaskFiles = removeFileAtIndex(
      this.selectedSubTaskFiles,
      index,
    );
  }

  formatSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  createTask(): void {
    if (
      !this.newTask.title ||
      !this.newTask.startDate ||
      !this.newTask.endDate
    ) {
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

    this.taskService.createTask(this.projectId, this.newTask).subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.toastService.show(
            response.message || 'Failed to create task',
            'error',
          );
          this.isCreating = false;
          return;
        }

        const taskId = response.data.id;
        const filesToUpload = [...this.selectedFiles]; // Take snapshot before reset

        // Task is created — finalize UI immediately regardless of upload outcome
        this.resetForm();
        this.loadTasks();
        this.isCreating = false;

        if (filesToUpload.length === 0) {
          this.toastService.show('Task created successfully', 'success');
          return;
        }

        // Run uploads in parallel; catch errors per-file so forkJoin never fails
        const uploadRequests = filesToUpload.map((file) =>
          this.mediaService
            .uploadMedia(
              file,
              detectMediaType(file),
              undefined,
              undefined,
              undefined,
              taskId,
              undefined,
            )
            .pipe(
              switchMap(() => of({ ok: true })),
              catchError((err) => of({ ok: false, error: err })),
            ),
        );

        forkJoin(uploadRequests).subscribe((results) => {
          const anyFailed = results.some((r) => !r.ok);
          if (anyFailed) {
            this.toastService.show(
              'Task created, but some media failed to upload',
              'warning',
            );
          } else {
            this.toastService.show(
              'Task created with media successfully',
              'success',
            );
          }
          this.loadSelectedTaskMediaCount();
        });
      },
      error: (err) => {
        this.toastService.show(
          err.error.message || 'An error occurred',
          'error',
        );
        this.isCreating = false;
      },
    });
  }

  resetForm(): void {
    this.newTask = {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      labels: '',
      taskAssignees: [],
    };
    this.taskLabels = [];
    this.labelInput = '';
    this.showUserDropdown = false;
    this.selectedFiles = [];
  }

  // --- SUBTASK MODAL METHODS ---
  openSubTaskModal(taskId: number, parentId: number | null = null): void {
    this.resetSubTaskForm();
    this.targetTaskId = taskId;
    this.parentSubTaskId = parentId;
    this.isSubTaskModalOpen = true;
  }

  closeSubTaskModal(): void {
    this.isSubTaskModalOpen = false;
    this.showSubTaskUserDropdown = false;
    this.parentSubTaskId = null;
  }

  toggleSubTaskAssignee(userId: string): void {
    const index = this.newSubTask.subTaskAssignees.indexOf(userId);
    if (index > -1) {
      this.newSubTask.subTaskAssignees.splice(index, 1);
    } else {
      this.newSubTask.subTaskAssignees.push(userId);
    }
    this.showSubTaskUserDropdown = false;
  }

  isSubTaskAssigneeSelected(userId: string): boolean {
    return this.newSubTask.subTaskAssignees.includes(userId);
  }

  createSubTask(): void {
    if (
      !this.newSubTask.title ||
      !this.newSubTask.startDate ||
      !this.newSubTask.endDate
    ) {
      this.toastService.show('Please fill in required fields', 'warning');
      return;
    }

    this.isCreatingSubTask = true;
    if (this.parentSubTaskId) {
      this.newSubTask.parentSubTaskId = this.parentSubTaskId;
    }
    this.taskService
      .createSubTask(this.targetTaskId, this.newSubTask)
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.toastService.show(
              response.message || 'Failed to create subtask',
              'error',
            );
            this.isCreatingSubTask = false;
            return;
          }

          const subTaskId = response.data.id;
          const newSubTaskData = response.data;
          const filesToUpload = [...this.selectedSubTaskFiles]; // Take snapshot before reset

          this.closeSubTaskModal();
          this.resetSubTaskForm();

          // Optimistically update the list if we have a selected task
          if (this.selectedTask && this.selectedTask.id === this.targetTaskId) {
            this.selectedTask.subTasks.push(newSubTaskData);
          }
          this.loadTasks(); // Full refresh in background

          this.isCreatingSubTask = false;

          if (filesToUpload.length === 0) {
            this.toastService.show('Subtask created successfully', 'success');
            return;
          }

          // Upload media
          const uploadRequests = filesToUpload.map((file) =>
            this.mediaService
              .uploadMedia(
                file,
                detectMediaType(file),
                undefined,
                undefined,
                undefined,
                undefined,
                subTaskId,
              )
              .pipe(
                switchMap(() => of({ ok: true })),
                catchError((err) => of({ ok: false, error: err })),
              ),
          );

          forkJoin(uploadRequests).subscribe((results) => {
            const anyFailed = results.some((r) => !r.ok);
            if (anyFailed) {
              this.toastService.show(
                'Subtask created, but some media failed to upload',
                'warning',
              );
            } else {
              this.toastService.show(
                'Subtask created with media successfully',
                'success',
              );
            }
            this.loadSelectedTaskMediaCount();
          });
        },
        error: (err) => {
          this.toastService.show(
            err.message || 'Failed to create subtask',
            'error',
          );
          this.isCreatingSubTask = false;
        },
      });
  }

  toggleSubTaskStatus(subTask: SubTaskDetails): void {
    const taskId = this.selectedTask?.id;
    if (!taskId) return;

    // RULE: Cannot complete a subtask if children are incomplete
    if (!subTask.isCompleted) {
      const children = this.selectedTask!.subTasks.filter(
        (st) => st.parentSubTaskId === subTask.id,
      );
      const incompleteChildren = children.filter((c) => !c.isCompleted);
      if (incompleteChildren.length > 0) {
        this.toastService.show(
          'Cannot complete subtask until all children are finished',
          'warning',
        );
        return;
      }
    }

    const updateDto: SubTaskUpdateDto = {
      title: subTask.title,
      description: subTask.description || '',
      startDate: subTask.startDate,
      endDate: subTask.endDate,
      isCompleted: !subTask.isCompleted,
      subTaskAssignees: subTask.subTaskAssignees,
    };

    this.taskService.updateSubTask(subTask.id, updateDto).subscribe({
      next: (response) => {
        if (response.success) {
          // Update locally
          subTask.isCompleted = !subTask.isCompleted;
          this.toastService.show('Subtask updated', 'success');

          // If we just un-completed a subtask, we must un-complete its ancestors
          if (!subTask.isCompleted) {
            this.uncompleteAncestorSubtasks(subTask);
          }

          // Check if parent should be updated
          this.checkAndSyncMainTaskCompletion();

          // Refresh list to update task-level progress bars
          this.loadTasks();
        }
      },
      error: (err) => {
        const errorMessage =
          err.error?.message || 'Failed to update subtask status.';
        this.toastService.show(errorMessage, 'error');
      },
    });
  }

  private checkAndSyncMainTaskCompletion(): void {
    if (!this.selectedTask) return;

    const allSubTasksCompleted =
      this.selectedTask.subTasks.length > 0 &&
      this.selectedTask.subTasks.every((st) => st.isCompleted);

    // Only update if state changed
    if (this.selectedTask.isCompleted !== allSubTasksCompleted) {
      const updateDto: TaskUpdateDto = {
        isCompleted: allSubTasksCompleted,
      };

      this.taskService.updateTask(this.selectedTask.id, updateDto).subscribe({
        next: (response) => {
          if (response.success) {
            this.selectedTask!.isCompleted = allSubTasksCompleted;
            if (allSubTasksCompleted) {
              this.toastService.show(
                'Main task marked as complete!',
                'success',
              );
            }
          }
        },
        error: (err) => {
          const errorMessage =
            err.error?.message || 'Failed to sync task completion.';
          this.toastService.show(errorMessage, 'error');
        },
      });
    }
  }

  private uncompleteAncestorSubtasks(subTask: SubTaskDetails): void {
    if (!this.selectedTask || !subTask.parentSubTaskId) return;

    const parent = this.selectedTask.subTasks.find(
      (st) => st.id === subTask.parentSubTaskId,
    );
    if (parent && parent.isCompleted) {
      const updateDto: SubTaskUpdateDto = {
        title: parent.title,
        description: parent.description || '',
        startDate: parent.startDate,
        endDate: parent.endDate,
        isCompleted: false,
        subTaskAssignees: parent.subTaskAssignees,
      };

      this.taskService.updateSubTask(parent.id, updateDto).subscribe({
        next: (response) => {
          if (response.success) {
            parent.isCompleted = false;
            // Recursively walk up
            this.uncompleteAncestorSubtasks(parent);
          }
        },
        error: (err) => {
          const errorMessage =
            err.error?.message || 'Failed to update ancestor subtasks.';
          this.toastService.show(errorMessage, 'error');
        },
      });
    }
  }

  resetSubTaskForm(): void {
    this.newSubTask = {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      subTaskAssignees: [],
    };
    this.selectedSubTaskFiles = [];
    this.parentSubTaskId = null;
  }

  // --- EDIT TASK METHODS ---
  openEditTask(task: TaskDetails, event: Event): void {
    event.stopPropagation();
    this.editingTaskId = task.id;
    this.editTaskLabels = task.labels
      ? task.labels.split(',').filter((l) => l.trim())
      : [];
    this.editLabelInput = '';
    this.editTaskAssigneeIds = [...task.taskAssignees];
    this.editTask = {
      title: task.title,
      description: task.description,
      startDate: task.startDate ? task.startDate.substring(0, 10) : '',
      endDate: task.endDate ? task.endDate.substring(0, 10) : '',
      labels: task.labels,
      taskAssignees: [...task.taskAssignees],
    };
    this.showEditUserDropdown = false;
    this.isEditTaskModalOpen = true;
  }

  closeEditTaskModal(): void {
    this.isEditTaskModalOpen = false;
    this.showEditUserDropdown = false;
  }

  addEditLabel(event: Event): void {
    event.preventDefault();
    const value = this.editLabelInput.trim();
    if (value && !this.editTaskLabels.includes(value)) {
      this.editTaskLabels.push(value);
      this.editLabelInput = '';
    }
  }

  removeEditLabel(label: string): void {
    this.editTaskLabels = this.editTaskLabels.filter((l) => l !== label);
  }

  toggleEditTaskAssignee(userId: string): void {
    const index = this.editTaskAssigneeIds.indexOf(userId);
    if (index > -1) {
      this.editTaskAssigneeIds.splice(index, 1);
    } else {
      this.editTaskAssigneeIds.push(userId);
    }
    this.showEditUserDropdown = false;
  }

  isEditTaskAssigneeSelected(userId: string): boolean {
    return this.editTaskAssigneeIds.includes(userId);
  }

  saveTaskEdit(): void {
    if (
      !this.editTask.title ||
      !this.editTask.startDate ||
      !this.editTask.endDate
    ) {
      this.toastService.show('Please fill in all required fields', 'warning');
      return;
    }
    // Capture any pending label
    const pending = this.editLabelInput.trim();
    if (pending && !this.editTaskLabels.includes(pending)) {
      this.editTaskLabels.push(pending);
      this.editLabelInput = '';
    }
    this.editTask.labels = this.editTaskLabels.join(',');
    this.editTask.taskAssignees = [...this.editTaskAssigneeIds];

    this.isUpdatingTask = true;
    this.taskService.updateTask(this.editingTaskId, this.editTask).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.show('Task updated successfully', 'success');
          this.closeEditTaskModal();
          this.loadTasks();
        } else {
          this.toastService.show(
            response.message || 'Failed to update task',
            'error',
          );
        }
        this.isUpdatingTask = false;
      },
      error: (err) => {
        this.toastService.show(err.message || 'An error occurred', 'error');
        this.isUpdatingTask = false;
      },
    });
  }

  // --- DELETE TASK METHODS ---
  confirmDeleteTask(task: TaskDetails, event: Event): void {
    event.stopPropagation();
    this.pendingDeleteTaskId = task.id;
    this.pendingDeleteTaskTitle = task.title;
    this.isPendingDeleteTask = true;
  }

  cancelDeleteTask(): void {
    this.isPendingDeleteTask = false;
    this.pendingDeleteTaskId = 0;
    this.pendingDeleteTaskTitle = '';
  }

  executeDeleteTask(): void {
    this.isDeletingTask = true;
    this.taskService.deleteTask(this.pendingDeleteTaskId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.show('Task deleted successfully', 'success');
          if (this.selectedTask?.id === this.pendingDeleteTaskId) {
            this.selectedTask = null;
          }
          this.cancelDeleteTask();
          this.loadTasks();
        } else {
          this.toastService.show(
            response.message || 'Failed to delete task',
            'error',
          );
        }
        this.isDeletingTask = false;
      },
      error: (err) => {
        this.toastService.show(err.message || 'An error occurred', 'error');
        this.isDeletingTask = false;
      },
    });
  }

  // --- EDIT SUBTASK METHODS ---
  openEditSubTask(st: SubTaskDetails, event: Event): void {
    event.stopPropagation();
    this.editingSubTaskId = st.id;
    this.editSubTaskAssigneeIds = [...st.subTaskAssignees];
    this.editSubTask = {
      title: st.title,
      description: st.description,
      startDate: st.startDate ? st.startDate.substring(0, 10) : '',
      endDate: st.endDate ? st.endDate.substring(0, 10) : '',
      isCompleted: st.isCompleted,
      subTaskAssignees: [...st.subTaskAssignees],
    };
    this.showEditSubTaskUserDropdown = false;
    this.isEditSubTaskModalOpen = true;
  }

  closeEditSubTaskModal(): void {
    this.isEditSubTaskModalOpen = false;
    this.showEditSubTaskUserDropdown = false;
  }

  toggleEditSubTaskAssignee(userId: string): void {
    const index = this.editSubTaskAssigneeIds.indexOf(userId);
    if (index > -1) {
      this.editSubTaskAssigneeIds.splice(index, 1);
    } else {
      this.editSubTaskAssigneeIds.push(userId);
    }
    this.showEditSubTaskUserDropdown = false;
  }

  isEditSubTaskAssigneeSelected(userId: string): boolean {
    return this.editSubTaskAssigneeIds.includes(userId);
  }

  saveSubTaskEdit(): void {
    if (
      !this.editSubTask.title ||
      !this.editSubTask.startDate ||
      !this.editSubTask.endDate
    ) {
      this.toastService.show('Please fill in all required fields', 'warning');
      return;
    }
    this.editSubTask.subTaskAssignees = [...this.editSubTaskAssigneeIds];
    this.isUpdatingSubTask = true;
    this.taskService
      .updateSubTask(this.editingSubTaskId, this.editSubTask)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Subtask updated successfully', 'success');
            this.closeEditSubTaskModal();
            this.loadTasks();
          } else {
            this.toastService.show(
              response.message || 'Failed to update subtask',
              'error',
            );
          }
          this.isUpdatingSubTask = false;
        },
        error: (err) => {
          this.toastService.show(err.message || 'An error occurred', 'error');
          this.isUpdatingSubTask = false;
        },
      });
  }

  // --- DELETE SUBTASK METHODS ---
  confirmDeleteSubTask(st: SubTaskDetails, event: Event): void {
    event.stopPropagation();
    this.pendingDeleteSubTaskId = st.id;
    this.pendingDeleteSubTaskTitle = st.title;
    this.isPendingDeleteSubTask = true;
  }

  cancelDeleteSubTask(): void {
    this.isPendingDeleteSubTask = false;
    this.pendingDeleteSubTaskId = 0;
    this.pendingDeleteSubTaskTitle = '';
  }

  executeDeleteSubTask(): void {
    this.isDeletingSubTask = true;
    this.taskService.deleteSubTask(this.pendingDeleteSubTaskId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.show('Subtask deleted successfully', 'success');

          // Immediate UI update
          if (this.selectedTask) {
            this.selectedTask.subTasks = this.selectedTask.subTasks.filter(
              (st) => st.id !== this.pendingDeleteSubTaskId,
            );
          }

          this.cancelDeleteSubTask();
          this.loadTasks();
        } else {
          this.toastService.show(
            response.message || 'Failed to delete subtask',
            'error',
          );
        }
        this.isDeletingSubTask = false;
      },
      error: (err) => {
        this.toastService.show(err.message || 'An error occurred', 'error');
        this.isDeletingSubTask = false;
      },
    });
  }
}
