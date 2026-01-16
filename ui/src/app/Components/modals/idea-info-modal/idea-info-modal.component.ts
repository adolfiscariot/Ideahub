import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroLightBulb, heroCheckCircle, heroExclamationCircle, heroSparkles } from '@ng-icons/heroicons/outline';
import { ButtonsComponent } from '../../buttons/buttons.component';

@Component({
    selector: 'app-idea-info-modal',
    standalone: true,
    imports: [CommonModule, NgIconComponent, ButtonsComponent],
    viewProviders: [provideIcons({ heroXMark, heroLightBulb, heroCheckCircle, heroExclamationCircle, heroSparkles })],
    templateUrl: './idea-info-modal.component.html',
    styleUrl: './idea-info-modal.component.scss'
})
export class IdeaInfoModalComponent {
    @Input() isVisible: boolean = false;
    @Output() close = new EventEmitter<void>();
    @Output() dontShowAgain = new EventEmitter<void>();

    closeModal() {
        this.close.emit();
    }

    handleDontShowAgain() {
        this.dontShowAgain.emit();
    }

    // Prevent closing when clicking inside content
    onContentClick(event: MouseEvent) {
        event.stopPropagation();
    }
}
