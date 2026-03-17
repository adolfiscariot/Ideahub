import { Component, OnInit, inject, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { TimesheetService } from '../../Services/timesheet.service';
import { TimesheetDto, RelevantTask, BlockerSeverity } from '../../Interfaces/Timesheet/timesheet-interface';
import { ToastService } from '../../Services/toast.service';
import { MediaComponent } from '../media/media.component';
import { MediaService } from '../../Services/media.service';
import { firstValueFrom } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../Services/auth/auth.service';
import { ModalComponent } from '../../Components/modal/modal.component';

interface TimesheetRow {
  taskId: number;
  description: string;
  hoursSpent: number;
  comments: string;
  hasBlocker: boolean;
  blockerDescription: string;
  blockerSeverity: BlockerSeverity;
  tempFiles: File[];
}

@Component({
  selector: 'app-timesheets',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MediaComponent, MatMenuModule, MatButtonModule, ModalComponent],
  templateUrl: './timesheets.component.html',
  styleUrl: './timesheets.component.scss'
})
export class TimesheetsComponent implements OnInit {
  private timesheetService = inject(TimesheetService);
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  @Input() isChildView: boolean = false;
  @Input() parentProjectId: number | null = null;

  projectId: number = 0;
  currentUserId: string = '';
  isEditing: boolean = false;
  editingLogId: number | null = null;
  showDeleteModal: boolean = false;
  logToDeleteId: number | null = null;
  workDate: string = ''; // Initialized in ngOnInit
  availableTasks: RelevantTask[] = [];
  rows: TimesheetRow[] = [];
  recentLogs: TimesheetDto[] = [];
  isLoading = false;
  activeMediaTimesheetId: number | null = null;

  // Filtering State
  filterUserId: string = '';
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterSeverity: string = '';
  projectMembers: { id: string, name: string }[] = [];

  private formatDateToLocalISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseLocalISOToDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  get filteredLogs(): TimesheetDto[] {
    return this.recentLogs.filter(log => {
      // User Filter
      if (this.filterUserId && log.userId !== this.filterUserId) return false;

      // Date Filters
      if (log.workDate) {
        const logDate = new Date(log.workDate);
        logDate.setHours(0, 0, 0, 0);

        if (this.filterStartDate) {
          const start = this.parseLocalISOToDate(this.filterStartDate);
          start.setHours(0, 0, 0, 0);
          if (logDate < start) return false;
        }

        if (this.filterEndDate) {
          const end = this.parseLocalISOToDate(this.filterEndDate);
          end.setHours(0, 0, 0, 0);
          if (logDate > end) return false;
        }
      }

      // Severity Filter
      if (this.filterSeverity) {
        if (!log.hasBlocker) return false;
        if (this.getSeverityLabel(log.blockerSeverity) !== this.filterSeverity) return false;
      }

      return true;
    });
  }

  clearFilters(): void {
    this.filterUserId = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterSeverity = '';
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.activeMediaTimesheetId = null;
  }

  ngOnInit(): void {
    this.workDate = this.formatDateToLocalISO(new Date());

    if (this.isChildView && this.parentProjectId) {
      this.projectId = this.parentProjectId;
    } else {
      const pId = this.route.snapshot.paramMap.get('projectId')
        || this.route.parent?.snapshot.paramMap.get('projectId');
      if (pId) {
        this.projectId = +pId;
      }
    }

    if (this.projectId) {
      this.isLoading = true;
      this.loadTasks();
      this.loadRecentLogs();
      this.loadProjectTeam();
    }

    this.currentUserId = this.authService.getCurrentUserId();
    this.addRow(); // Start with one empty row
  }

  loadTasks(): void {
    this.timesheetService.getRelevantTasks(this.projectId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.availableTasks = res.data;
        }
      }
    });
  }

  loadRecentLogs(): void {
    this.timesheetService.getProjectLogs(this.projectId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.recentLogs = res.data;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadProjectTeam(): void {
    this.timesheetService.getProjectTeam(this.projectId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.projectMembers = res.data;
        }
      }
    });
  }

  addRow(): void {
    this.rows.push({
      taskId: 0,
      description: '',
      hoursSpent: 0,
      comments: '',
      hasBlocker: false,
      blockerDescription: '',
      blockerSeverity: BlockerSeverity.Low,
      tempFiles: []
    });
  }

  removeRow(index: number): void {
    if (this.rows.length > 1) {
      this.rows.splice(index, 1);
    }
  }

  onFileSelected(event: any, index: number): void {
    const files = event.target.files;
    if (files.length > 0) {
      this.rows[index].tempFiles.push(...Array.from(files) as File[]);
    }
  }

  removeTempFile(rowIndex: number, fileIndex: number): void {
    this.rows[rowIndex].tempFiles.splice(fileIndex, 1);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async submitLogs(): Promise<void> {
    const validRows = this.rows.filter(row => row.taskId !== 0 && row.hoursSpent > 0);

    if (validRows.length === 0) {
      this.toastService.show('Please fill in at least one task with hours', 'warning');
      return;
    }

    this.isLoading = true;

    try {
      if (this.isEditing && this.editingLogId) {
        // Handle Single Row Update
        const row = validRows[0];
        const updateDto: TimesheetDto = {
          taskId: row.taskId,
          workDate: this.parseLocalISOToDate(this.workDate),
          description: row.description,
          hoursSpent: row.hoursSpent,
          comments: row.comments,
          hasBlocker: row.hasBlocker,
          blockerDescription: row.blockerDescription,
          blockerSeverity: row.blockerSeverity
        };

        const res = await firstValueFrom(this.timesheetService.updateLog(this.editingLogId, updateDto));
        if (res.success) {
          if (row.hasBlocker && row.tempFiles.length > 0) {
            for (const file of row.tempFiles) {
              const mediaType = this.mediaService.detectMediaType(file);
              await firstValueFrom(
                this.mediaService.uploadMedia(file, mediaType, undefined, undefined, undefined, this.editingLogId)
              );
            }
          }
          this.toastService.show('Timesheet updated successfully', 'success');
          this.cancelEdit();
          this.loadRecentLogs();
        }
      } else {
        // Existing Bulk Log Logic
        const logsToSend: TimesheetDto[] = validRows.map(row => ({
          taskId: row.taskId,
          workDate: this.parseLocalISOToDate(this.workDate),
          description: row.description,
          hoursSpent: row.hoursSpent,
          comments: row.comments,
          hasBlocker: row.hasBlocker,
          blockerDescription: row.blockerDescription,
          blockerSeverity: row.blockerSeverity
        }));

        const res = await firstValueFrom(this.timesheetService.bulkLogWork(this.projectId, logsToSend));

        if (res.success && res.data) {
          const createdIds: number[] = res.data;

          // Match validRows to createdIds to upload files
          for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const timesheetId = createdIds[i];

            if (row.hasBlocker && row.tempFiles.length > 0 && timesheetId) {
              for (const file of row.tempFiles) {
                const mediaType = this.mediaService.detectMediaType(file);
                await firstValueFrom(this.mediaService.uploadMedia(file, mediaType, undefined, undefined, undefined, timesheetId));
              }
            }
          }

          this.toastService.show('Timesheet submitted successfully', 'success');
          this.rows = [];
          this.addRow();
          this.loadRecentLogs();
        }
      }
    } catch (error) {
      this.toastService.show('Failed to submit timesheet', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  editLog(log: TimesheetDto): void {
    if (!log.id) return;

    this.isEditing = true;
    this.editingLogId = log.id;
    this.workDate = this.formatDateToLocalISO(new Date(log.workDate));

    // Clear and set rows to the single log being edited
    this.rows = [{
      taskId: log.taskId || 0,
      description: log.description,
      hoursSpent: log.hoursSpent,
      comments: log.comments || '',
      hasBlocker: log.hasBlocker,
      blockerDescription: log.blockerDescription || '',
      blockerSeverity: log.blockerSeverity || 0,
      tempFiles: []
    }];
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingLogId = null;
    this.rows = [];
    this.addRow();
  }

  async deleteLog(id: number): Promise<void> {
    this.logToDeleteId = id;
    this.showDeleteModal = true;
  }

  async confirmDelete(): Promise<void> {
    if (!this.logToDeleteId) return;

    try {
      const res = await firstValueFrom(this.timesheetService.deleteLog(this.logToDeleteId));
      if (res.success) {
        this.toastService.show('Log deleted successfully', 'success');
        this.loadRecentLogs();
        this.closeDeleteModal();
      }
    } catch (error) {
      this.toastService.show('Failed to delete log', 'error');
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.logToDeleteId = null;
  }

  getSeverityLabel(severity: number | string | null | undefined): string {
    const sev = severity ?? 0;
    const sevStr = typeof sev === 'string' ? sev.toLowerCase() : '';
    if (sevStr === 'high' || sev === 2) return 'High';
    if (sevStr === 'medium' || sev === 1) return 'Medium';
    return 'Low';
  }

  getSeverityStyle(severity: number | string | undefined | null): { [key: string]: string } {
    const sev = severity ?? 0;
    const sevStr = typeof sev === 'string' ? sev.toLowerCase() : '';
    if (sevStr === 'high' || sev === 2) return { 'background-color': '#fff1f2', 'color': '#9f1239' };
    if (sevStr === 'medium' || sev === 1) return { 'background-color': '#fffbeb', 'color': '#92400e' };
    return { 'background-color': '#ecfdf5', 'color': '#065f46' };
  }

  toggleMediaPopup(event: Event, timesheetId: number | undefined): void {
    event.stopPropagation();
    if (!timesheetId) return;
    this.activeMediaTimesheetId = this.activeMediaTimesheetId === timesheetId ? null : timesheetId;
  }
}
