import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Event as RouterEvent, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { AppUpdateService, MIN_CHECK_INTERVAL_MS } from './app-update.service';

class SwUpdateStub {
  isEnabled = true;
  readonly versionUpdates = new Subject<VersionEvent>();
  readonly unrecoverable = new Subject<UnrecoverableStateEvent>();
  readonly activateUpdate = jasmine.createSpy('activateUpdate').and.resolveTo(true);
  readonly checkForUpdate = jasmine.createSpy('checkForUpdate').and.resolveTo(false);
}

describe('AppUpdateService', () => {
  let updates: SwUpdateStub;
  let events: Subject<RouterEvent>;
  let reload: jasmine.Spy;
  let hidden: boolean;
  let onVisibilityChange: (() => void) | undefined;

  /** Deixa as promessas pendentes do `activateUpdate` resolverem. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  const versionReady = (): VersionEvent => ({
    type: 'VERSION_READY',
    currentVersion: { hash: 'antiga' },
    latestVersion: { hash: 'nova' },
  });

  function start(): void {
    TestBed.inject(AppUpdateService).start();
  }

  beforeEach(() => {
    updates = new SwUpdateStub();
    events = new Subject<RouterEvent>();
    reload = jasmine.createSpy('reload');
    hidden = false;
    onVisibilityChange = undefined;

    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: updates },
        { provide: Router, useValue: { events } },
        {
          provide: DOCUMENT,
          useValue: {
            location: { reload },
            get hidden() {
              return hidden;
            },
            addEventListener: (type: string, handler: () => void) => {
              if (type === 'visibilitychange') {
                onVisibilityChange = handler;
              }
            },
          },
        },
      ],
    });
  });

  it('só recarrega na primeira troca de tela depois de a versão ficar pronta', async () => {
    start();
    updates.versionUpdates.next(versionReady());
    await settle();

    expect(reload).not.toHaveBeenCalled();

    events.next(new NavigationEnd(1, '/pacientes/abc', '/pacientes/abc'));
    await settle();

    expect(updates.activateUpdate).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ignora navegação que ainda não terminou', async () => {
    start();
    updates.versionUpdates.next(versionReady());
    events.next(new NavigationStart(1, '/pacientes/abc'));
    await settle();

    expect(reload).not.toHaveBeenCalled();
  });

  it('não recarrega de novo a cada tela seguinte', async () => {
    start();
    updates.versionUpdates.next(versionReady());
    events.next(new NavigationEnd(1, '/a', '/a'));
    events.next(new NavigationEnd(2, '/b', '/b'));
    await settle();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('confere a versão ao voltar para a tela, respeitando o intervalo mínimo', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 8, 21, 9, 0, 0));
    start();

    onVisibilityChange!();
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);

    onVisibilityChange!();
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);

    jasmine.clock().mockDate(new Date(Date.now() + MIN_CHECK_INTERVAL_MS));
    onVisibilityChange!();
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);

    jasmine.clock().uninstall();
  });

  it('não confere nada enquanto a aba está escondida', () => {
    start();
    hidden = true;
    onVisibilityChange!();

    expect(updates.checkForUpdate).not.toHaveBeenCalled();
  });

  it('recarrega quando o service worker fica sem saída', () => {
    start();
    updates.unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'cache incompleto' });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  /** Em desenvolvimento não há service worker: nada pode disparar uma recarga. */
  it('fica inerte com o service worker desligado', async () => {
    updates.isEnabled = false;
    start();
    updates.versionUpdates.next(versionReady());
    events.next(new NavigationEnd(1, '/a', '/a'));
    await settle();

    expect(reload).not.toHaveBeenCalled();
    expect(onVisibilityChange).toBeUndefined();
  });
});
