import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { MediaService } from '../../Services/media.service';
import { MediaType, Media } from '../../Interfaces/Media/media-interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
})
export class MediaComponent implements OnInit, OnChanges {
  @Input() ideaId?: string | number;
  @Input() commentId?: string | number;
  @Input() projectId?: number;
  @Input() timesheetId?: number;
  @Input() projectTaskId?: number;
  @Input() subTaskId?: number;
  @Input() title = 'Media';
  @Input() compactMode = false;
  @Input() verticalLayout = false;
  @Input() fullFileName = false;
  @Input() media?: Media[];

  mediaList: Media[] = [];
  isLoading = false;
  MediaType = MediaType;

  private mediaService = inject(MediaService);

  ngOnInit(): void {
    this.loadMedia();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['ideaId'] ||
      changes['commentId'] ||
      changes['projectId'] ||
      changes['timesheetId'] ||
      changes['projectTaskId'] ||
      changes['subTaskId']
    ) {
      this.loadMedia();
    }
  }

  loadMedia(): void {
    if (
      !this.ideaId &&
      !this.commentId &&
      !this.projectId &&
      !this.timesheetId &&
      !this.projectTaskId &&
      !this.subTaskId
    )
      return;

    this.isLoading = true;

    this.mediaService
      .viewMedia(
        this.ideaId,
        this.commentId,
        this.projectId,
        this.projectTaskId,
        this.subTaskId,
        this.timesheetId,
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.mediaList = response.data;
          }
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  getMediaUrl(filePath: string): string {
    const cleanFileName = filePath.replace(/^media\//, '');
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/uploads/${cleanFileName}`;
  }

  getFileExtension(filePath: string): string {
    return filePath.split('.').pop()?.toUpperCase() || 'FILE';
  }

  getDisplayName(filePath: string): string {
    if (!filePath) return 'attachment';

    const fileName = filePath.split('/').pop() || filePath;

    const underscoreIndex = fileName.indexOf('_');
    if (underscoreIndex !== -1 && underscoreIndex < fileName.length - 1) {
      return fileName.substring(underscoreIndex + 1);
    }

    return fileName;
  }

  // Open in a new tab
  openMedia(media: Media): void {
    const url = this.getMediaUrl(media.filePath);

    if (media.mediaType === MediaType.Document) {
      // Force new tab
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } else {
      window.open(url, '_blank');
    }
  }
}
