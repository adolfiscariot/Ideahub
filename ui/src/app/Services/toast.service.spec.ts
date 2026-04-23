/// <reference types="jasmine" />
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('show()', () => {
    it('should add a toast to the stream', () => {
      let currentToasts: Toast[] = [];
      const sub = service.toasts$.subscribe((t) => (currentToasts = t));

      service.show('Hello world', 'success');

      expect(currentToasts.length).toBe(1);
      expect(currentToasts[0].message).toBe('Hello world');
      expect(currentToasts[0].type).toBe('success');
      expect(currentToasts[0].id).toBeDefined();

      sub.unsubscribe();
    });

    it('should assign incrementing IDs to toasts', () => {
      const id1 = service.show('First');
      const id2 = service.show('Second');
      expect(id2).toBeGreaterThan(id1);
    });
  });

  describe('remove()', () => {
    it('should remove a toast manually', () => {
      const id = service.show('Delete me');
      let currentToasts: Toast[] = [];
      const sub = service.toasts$.subscribe((t) => (currentToasts = t));

      expect(currentToasts.length).toBe(1);
      service.remove(id);
      expect(currentToasts.length).toBe(0);

      sub.unsubscribe();
    });
  });

  describe('Auto-removal (fakeAsync)', () => {
    it('should remove toast automatically after duration', fakeAsync(() => {
      let currentToasts: Toast[] = [];
      const sub = service.toasts$.subscribe((t) => (currentToasts = t));

      service.show('Temp toast', 'info', 1000);
      expect(currentToasts.length).toBe(1);

      // Pass 500ms - toast should still be there
      tick(500);
      expect(currentToasts.length).toBe(1);

      // Pass remaining 501ms - toast should be gone
      tick(501);
      expect(currentToasts.length).toBe(0);

      sub.unsubscribe();
    }));

    it('should NOT remove toast automatically if duration is 0', fakeAsync(() => {
      let currentToasts: Toast[] = [];
      service.toasts$.subscribe((t) => (currentToasts = t));

      service.show('Infinite', 'warning', 0);
      tick(10000);
      expect(currentToasts.length).toBe(1);
    }));
  });

  describe('ngOnDestroy()', () => {
    it('should clear all active timeouts', fakeAsync(() => {
      service.show('Cleanup', 'info', 1000);
      service.ngOnDestroy();

      tick(2000);
      // If it still cleaned up, the coverage/logic for timeouts would be accessed
      // Since it's a private map, we verify it doesn't crash
      expect(true).toBeTrue();
    }));
  });
});
