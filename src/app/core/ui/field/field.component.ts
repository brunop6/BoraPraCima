import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Rótulo, dica e mensagem de erro em volta de um campo projetado.
 *
 * O `<input>` fica no template de quem usa, com o `formControlName` e o `id`; assim
 * o componente não precisa implementar `ControlValueAccessor` nem reimplementar
 * cada tipo de campo. O estilo do input vem de `styles/_forms.scss`, global, porque
 * estilo encapsulado não alcança conteúdo projetado.
 */
@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field">
      <label class="field__label" [attr.for]="for()">
        {{ label() }}
        @if (optional()) {
          <span class="field__optional">(opcional)</span>
        }
      </label>

      <ng-content />

      @if (hint() && !error()) {
        <p class="field__hint" [id]="for() + '-hint'">{{ hint() }}</p>
      }

      @if (error()) {
        <p class="field__error" [id]="for() + '-error'" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{{ error() }}</span>
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .field__optional {
      margin-left: var(--space-1);
      font-weight: var(--font-weight-normal);
      color: var(--color-text-muted);
    }
  `,
})
export class FieldComponent {
  /** `id` do input projetado — liga o `<label>` ao campo. */
  readonly for = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  /** `<app-field optional>` marca o campo como não obrigatório no rótulo. */
  readonly optional = input(false, { transform: booleanAttribute });
}
