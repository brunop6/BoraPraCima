import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routerFeatures } from './app.config';

@Component({ template: '<router-outlet />', imports: [RouterOutlet] })
class ShellStub {}

@Component({ template: '' })
class NamedChildStub {
  readonly patientId = input<string>();
}

describe('routerFeatures', () => {
  /**
   * Regressão: as telas de familiares, equipe e ajustes ficam em rotas-filhas com
   * caminho, sob o shell do paciente. Sem herdar `:patientId` elas consultavam
   * `patients/undefined/...` e o Firestore respondia "permissão insuficiente".
   */
  it('entrega o patientId do pai a uma rota-filha com caminho', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            {
              path: ':patientId',
              component: ShellStub,
              children: [{ path: 'familiares', component: NamedChildStub }],
            },
          ],
          ...routerFeatures,
        ),
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/abc/familiares');

    const child = harness.fixture.debugElement.query(By.directive(NamedChildStub))
      .componentInstance as NamedChildStub;
    expect(child.patientId()).toBe('abc');
  });
});
