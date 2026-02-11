import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
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
  styleUrls: ['./media.component.scss']
})
export class MediaComponent implements OnInit {
  @Input() ideaId?: number;
  @Input() commentId?: number;
  @Input() projectId?: number;
  @Input() title: string = 'Media';
  @Input() compactMode: boolean = false;
  @Input() media?: Media[];

  mediaList: Media[] = [];
  isLoading = false;
  MediaType = MediaType;

  constructor(private mediaService: MediaService) { }

  ngOnInit(): void {
    this.loadMedia();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ideaId'] || changes['commentId'] || changes['projectId']) {
      this.loadMedia();
    }
  }

  loadMedia(): void {
    if (!this.ideaId && !this.commentId && !this.projectId) return;

    this.isLoading = true;

    this.mediaService.viewMedia(this.ideaId, this.commentId, this.projectId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.mediaList = response.data;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  getMediaUrl(filePath: string): string {
    // Remove 'media/' prefix 
    const cleanFileName = filePath.replace(/^media\//, '');
    return `${environment.apiUrl}/uploads/${cleanFileName}`;
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