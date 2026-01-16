import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroUserGroup, heroCalendar, heroLockClosed, heroLightBulb, heroUser } from '@ng-icons/heroicons/outline';
import { ButtonsComponent } from '../../buttons/buttons.component';

@Component({
    selector: 'app-group-details-modal',
    standalone: true,
    imports: [CommonModule, NgIconComponent, ButtonsComponent],
    viewProviders: [provideIcons({ heroXMark, heroUserGroup, heroCalendar, heroLockClosed, heroLightBulb, heroUser })],
    templateUrl: './group-details-modal.component.html',
    styleUrl: './group-details-modal.component.scss'
})
export class GroupDetailsModalComponent {
    @Input() isVisible: boolean = false;
    @Input() group: any = null;
    @Output() close = new EventEmitter<void>();

    isExpanded: boolean = false;

    toggleDescription() {
        this.isExpanded = !this.isExpanded;
    }

    closeModal() {
        this.close.emit();
        this.isExpanded = false; // Reset on close
    }

    // Prevent closing when clicking inside the modal content
    onContentClick(event: MouseEvent) {
        event.stopPropagation();
    }

    formatDate(date: any): string {
        if (!date) return 'Unknown date';
        try {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    }

    formatMemberCount(count: number): string {
        if (!count || count === 0) return '0 members';
        return count === 1 ? '1 member' : `${count} members`;
    }
}
