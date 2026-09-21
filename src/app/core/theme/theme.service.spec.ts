import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';
import { THEME_COLORS } from './theme.util';

describe('ThemeService', () => {
  let meta: HTMLMetaElement;
  let root: HTMLElement;

  function start(hour: number, minute = 0): ThemeService {
    jasmine.clock().mockDate(new Date(2026, 8, 21, hour, minute, 0));
    const service = TestBed.inject(ThemeService);
    service.start();
    return service;
  }

  beforeEach(() => {
    jasmine.clock().install();
    root = TestBed.inject(DOCUMENT).documentElement;
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    meta.remove();
    delete root.dataset['theme'];
  });

  it('abre claro no meio do dia e escuro de madrugada', () => {
    start(9);
    expect(root.dataset['theme']).toBe('light');
    expect(meta.content).toBe(THEME_COLORS.light);

    TestBed.resetTestingModule();
    start(3);
    expect(root.dataset['theme']).toBe('dark');
    expect(meta.content).toBe(THEME_COLORS.dark);
  });

  it('vira para escuro às 18:00 sem recarregar', () => {
    const service = start(17, 59);
    expect(service.theme()).toBe('light');

    jasmine.clock().tick(59_000);
    expect(root.dataset['theme']).toBe('light');

    jasmine.clock().tick(1_000);
    expect(root.dataset['theme']).toBe('dark');
    expect(service.theme()).toBe('dark');
    expect(meta.content).toBe(THEME_COLORS.dark);
  });

  it('vira para claro às 06:00, atravessando a meia-noite', () => {
    const service = start(23, 0);
    expect(service.theme()).toBe('dark');

    jasmine.clock().tick(6 * 60 * 60_000 + 59 * 60_000);
    expect(root.dataset['theme']).toBe('dark');

    jasmine.clock().tick(60_000);
    expect(root.dataset['theme']).toBe('light');
    expect(meta.content).toBe(THEME_COLORS.light);
  });

  it('continua virando nas viradas seguintes', () => {
    start(17, 59);
    jasmine.clock().tick(60_000);
    expect(root.dataset['theme']).toBe('dark');

    jasmine.clock().tick(12 * 60 * 60_000);
    expect(root.dataset['theme']).toBe('light');

    jasmine.clock().tick(12 * 60 * 60_000);
    expect(root.dataset['theme']).toBe('dark');
  });
});
