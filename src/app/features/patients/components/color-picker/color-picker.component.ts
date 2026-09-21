import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { readableTextOn } from '../../../../core/color/color.util';
import {
  MEMBER_PALETTE,
  TRANSPARENCY_LIMITS,
  memberTextColors,
} from '../../../../core/color/member-color';

/**
 * Escolha da cor e da transparência do familiar no calendário: uma paleta de
 * sugestões e, para quem quiser, uma cor livre. Não há veto de cor: quem administra
 * assume o risco de escolher algo parecido com o "Vago". A pré-visualização mostra
 * como o turno vai aparecer, e o bloco "Vago" continua escrito e tracejado.
 */
@Component({
  selector: 'app-color-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="picker">
      <legend>Cor no calendário</legend>

      <div class="swatches" role="radiogroup" aria-label="Cor no calendário">
        @for (option of palette; track option.hex) {
          <button
            type="button"
            class="swatch"
            role="radio"
            [attr.aria-checked]="isSelected(option.hex)"
            [attr.aria-label]="option.name"
            [style.background]="option.hex"
            [style.color]="textOn(option.hex)"
            (click)="color.set(option.hex)"
          >
            @if (isSelected(option.hex)) {
              <span aria-hidden="true">✓</span>
            }
          </button>
        }

        <label
          class="swatch swatch--custom"
          [class.is-custom]="isCustom()"
          [style.background]="isCustom() ? color() : null"
          [style.color]="isCustom() ? textOn(color()) : null"
        >
          <span class="sr-only">Outra cor</span>
          <span aria-hidden="true">{{ isCustom() ? '✓' : '+' }}</span>
          <input
            type="color"
            class="swatch__input"
            [value]="color()"
            (input)="pickCustom($event)"
          />
        </label>
      </div>

      <div class="transparency">
        <label class="transparency__label" for="member-transparency">
          Transparência
          <span class="transparency__value">{{ transparency() }}%</span>
        </label>
        <input
          id="member-transparency"
          type="range"
          class="transparency__range"
          [min]="limits.min"
          [max]="limits.max"
          [step]="limits.step"
          [value]="transparency()"
          [attr.aria-valuetext]="transparency() + '%'"
          (input)="pickTransparency($event)"
        />
        <p class="transparency__hint">Quanto maior, mais leve o turno fica no calendário.</p>
      </div>

      <p
        class="preview"
        [style.--member-color]="color()"
        [style.--member-weight]="weight()"
        [style.--member-text-light]="text().light"
        [style.--member-text-dark]="text().dark"
      >
        {{ previewName() || 'Assim aparece no calendário' }}
      </p>
    </fieldset>
  `,
  styles: `
    .picker {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      padding: 0;
      margin-bottom: var(--space-2);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }

    .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .swatch {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--touch-target);
      height: var(--touch-target);
      padding: 0;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-full);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
    }

    /* Selecionada: anel + ✓, para não depender só da cor. */
    .swatch[aria-checked='true'],
    .swatch.is-custom {
      outline: 3px solid var(--color-text);
      outline-offset: 2px;
    }

    .swatch--custom {
      background: var(--color-surface);
      color: var(--color-text);
    }

    .swatch--custom:focus-within {
      outline: 3px solid var(--color-focus);
      outline-offset: 2px;
    }

    /* O seletor nativo cobre o botão inteiro, invisível: o toque abre o painel de cores. */
    .swatch__input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .transparency {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .transparency__label {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }

    .transparency__value {
      font-variant-numeric: tabular-nums;
    }

    .transparency__range {
      width: 100%;
      /* O polegar do controle é pequeno; a faixa toda vira alvo de toque. */
      height: var(--touch-target);
      margin: 0;
      accent-color: var(--color-primary-mark);
      cursor: pointer;
    }

    .transparency__hint {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    /* Igual ao card do calendário: mesma mistura com o fundo, mesmo texto. */
    .preview {
      margin: 0;
      padding: var(--space-3);
      background: color-mix(in srgb, var(--member-color) var(--member-weight), transparent);
      border: 1px solid color-mix(in srgb, var(--member-color) 75%, #000);
      border-left-width: 4px;
      border-radius: var(--radius-sm);
      /* A mesma escolha de tinta do card de turno: presa ao tema dos tokens. */
      color: color-mix(
        in srgb,
        var(--member-text-dark) calc(var(--theme-dark) * 100%),
        var(--member-text-light)
      );
      font-weight: var(--font-weight-bold);
    }
  `,
})
export class ColorPickerComponent {
  /** A cor escolhida (`#rrggbb`), em `[(color)]`. */
  readonly color = model.required<string>();
  /** A transparência escolhida, em %, em `[(transparency)]`. */
  readonly transparency = model.required<number>();
  /** Nome exibido na pré-visualização. */
  readonly previewName = input('');

  protected readonly palette = MEMBER_PALETTE;

  protected readonly limits = TRANSPARENCY_LIMITS;

  protected readonly weight = computed(() => `${100 - this.transparency()}%`);

  protected readonly text = computed(() =>
    memberTextColors(this.color().toLowerCase(), this.transparency()),
  );

  /** Fora da paleta: veio do seletor livre. */
  protected readonly isCustom = computed(
    () => !this.palette.some((option) => option.hex === this.color().toLowerCase()),
  );

  protected isSelected(hex: string): boolean {
    return this.color().toLowerCase() === hex;
  }

  protected textOn(hex: string): string {
    return readableTextOn(hex.toLowerCase());
  }

  protected pickTransparency(event: Event): void {
    this.transparency.set(Number((event.target as HTMLInputElement).value));
  }

  protected pickCustom(event: Event): void {
    this.color.set((event.target as HTMLInputElement).value.toLowerCase());
  }
}
