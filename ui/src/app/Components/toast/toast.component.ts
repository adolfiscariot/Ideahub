import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../Services/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './toast.component.html',
    styleUrl: './toast.component.scss',
    animations: [
        trigger('toastAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateX(20px)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(20px)' })),
            ]),
        ]),
    ],
})
export class ToastComponent {
    toastService = inject(ToastService);
    toasts$ = this.toastService.toasts$;

    remove(id: number) {
        this.toastService.remove(id);
    }
}
