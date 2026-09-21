import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 7000;

/** Avisos curtos de "deu certo" e "não deu". */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  success(message: string): void {
    this.show(message, 'success');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  /** Erros ficam mais tempo na tela: em geral trazem uma instrução para seguir. */
  error(message: string): void {
    this.show(message, 'error', ERROR_DURATION_MS);
  }

  show(message: string, tone: ToastTone = 'info', durationMs = DEFAULT_DURATION_MS): void {
    const id = this.nextId++;
    this.items.update((current) => [...current, { id, message, tone }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.items.update((current) => current.filter((toast) => toast.id !== id));
  }
}
