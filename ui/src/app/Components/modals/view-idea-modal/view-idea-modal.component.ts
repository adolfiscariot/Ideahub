import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MostVotedIdea, PromotedIdea } from '../../../Models/analytics.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroUser, heroUserGroup, heroHandThumbUp, heroStar } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-view-idea-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ heroXMark, heroUser, heroUserGroup, heroHandThumbUp, heroStar })],
  templateUrl: './view-idea-modal.component.html',
  styleUrl: './view-idea-modal.component.scss'
})
export class ViewIdeaModalComponent {
  @Input() idea: MostVotedIdea | PromotedIdea | null = null;
  @Input() isVisible: boolean = false;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }

  // Prevent closing when clicking inside the modal content
  onContentClick(event: MouseEvent) {
    event.stopPropagation();
  }
}
