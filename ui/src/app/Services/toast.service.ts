import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root',
})
export class ToastService {
    private toastsSubject = new BehaviorSubject<Toast[]>([]);
    public toasts$ = this.toastsSubject.asObservable();
    private counter = 0;
    private timeouts: Map<number, any> = new Map();

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
        const id = this.counter++;
        const newToast: Toast = { id, message, type, duration };

        this.toastsSubject.next([...this.toastsSubject.value, newToast]);

        if (duration > 0) {
            const timeoutId = setTimeout(() => {
                this.remove(id);
            }, duration);
            this.timeouts.set(id, timeoutId);
        }
    }

    remove(id: number) {
        const currentToasts = this.toastsSubject.value;
        this.toastsSubject.next(currentToasts.filter((t) => t.id !== id));

        if (this.timeouts.has(id)) {
            clearTimeout(this.timeouts.get(id));
            this.timeouts.delete(id);
        }
    }

    ngOnDestroy() {
        this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        this.timeouts.clear();
    }
}
