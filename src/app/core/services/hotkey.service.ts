import { Inject, Injectable, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';

type HotkeyHandler = () => void;

@Injectable({ providedIn: 'root' })
export class HotkeyService implements OnDestroy {
  private readonly handlers = new Map<string, HotkeyHandler>();
  private listener?: (event: KeyboardEvent) => void;

  constructor(@Inject(DOCUMENT) private readonly doc: Document) {}

  register(map: Record<string, HotkeyHandler>): void {
    this.unregisterAll();
    Object.entries(map).forEach(([key, handler]) => {
      const normalized = this.normalizeKey(key);
      if (!normalized) return;
      this.handlers.set(normalized, handler);
    });
    if (this.handlers.size) {
      this.attach();
    }
  }

  unregisterAll(): void {
    if (this.listener) {
      this.doc.removeEventListener('keydown', this.listener, true);
      this.listener = undefined;
    }
    this.handlers.clear();
  }

  ngOnDestroy(): void {
    this.unregisterAll();
  }

  private attach(): void {
    if (this.listener) return;
    this.listener = (event: KeyboardEvent) => this.handleEvent(event);
    this.doc.addEventListener('keydown', this.listener, true);
  }

  private handleEvent(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    if (event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    if (this.isEditableTarget(event.target)) return;

    const normalizedCode = this.normalizeKey(event.code);
    const normalizedKey = this.normalizeKey(event.key);
    const handler =
      (normalizedCode && this.handlers.get(normalizedCode)) ||
      (normalizedKey && this.handlers.get(normalizedKey));
    if (!handler) return;
    event.preventDefault();
    handler();
  }

  private normalizeKey(key: string | null | undefined): string | null {
    if (!key) return null;
    const trimmed = key.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower === ' ' || lower === 'space' || lower === 'spacebar') {
      return 'space';
    }
    if (lower === 'enter' || lower === 'return') {
      return 'enter';
    }
    if (lower === 'q' || lower === 'w' || lower === 'e') {
      return lower;
    }
    if (lower === '1' || lower === '2' || lower === '3') {
      return lower;
    }
    if (lower.startsWith('digit') && lower.length === 6) {
      const digit = lower.slice(5);
      return digit === '1' || digit === '2' || digit === '3' ? digit : null;
    }
    if (lower.startsWith('numpad') && lower.length === 7) {
      const digit = lower.slice(6);
      return digit === '1' || digit === '2' || digit === '3' ? digit : null;
    }
    if (lower.startsWith('key') && lower.length === 4) {
      const letter = lower.slice(3);
      return letter === 'q' || letter === 'w' || letter === 'e' ? letter : null;
    }
    return null;
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    return target.isContentEditable;
  }
}
