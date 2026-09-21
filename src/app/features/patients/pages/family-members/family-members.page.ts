import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';

import { isValidHexColor } from '../../../../core/color/color.util';
import {
  DEFAULT_TRANSPARENCY,
  memberColorOf,
  nextFreeMemberColor,
  transparencyOf,
} from '../../../../core/color/member-color';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';
import { SheetComponent } from '../../../../core/ui/sheet/sheet.component';
import { ToastService } from '../../../../core/ui/toast/toast.service';
import { ColorPickerComponent } from '../../components/color-picker/color-picker.component';
import { FamilyMember } from '../../models/family-member.model';
import { FamilyMembersService } from '../../services/family-members.service';

/**
 * Quem pode ser escalado.
 *
 * Estas pessoas não têm conta no sistema — a maior parte da família não vai criar
 * uma. Aqui elas são apenas nomes que aparecem no calendário.
 */
@Component({
  selector: 'app-family-members-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ColorPickerComponent,
    FieldComponent,
    SheetComponent,
  ],
  template: `
    <div class="page">
      <p class="intro">
        Quem pode ser escalado como acompanhante. Não precisam ter conta no sistema — o nome
        aparece no calendário e pronto.
      </p>

      @if (members().length === 0) {
        <p class="empty">Ninguém cadastrado ainda.</p>
      } @else {
        <ul class="members">
          @for (member of members(); track member.id) {
            <li class="member" [class.is-inactive]="!member.active">
              <span
                class="member__color"
                aria-hidden="true"
                [style.background]="colorOf(member)"
              ></span>

              <div class="member__info">
                <span class="member__name">{{ member.name }}</span>
                @if (member.phone) {
                  <a class="member__phone" [href]="'tel:' + member.phone">{{ member.phone }}</a>
                }
                @if (!member.active) {
                  <span class="member__badge">Fora da escala</span>
                }
              </div>

              <button type="button" class="member__edit" (click)="openEdit(member)">
                <span class="sr-only">Editar {{ member.name }}</span>
                <span aria-hidden="true">✎</span>
              </button>
            </li>
          }
        </ul>
      }

      <app-button block (click)="openAdd()">+ Cadastrar familiar</app-button>
    </div>

    @if (sheetMode() !== null) {
      <app-sheet
        [title]="editing() ? 'Editar familiar' : 'Cadastrar familiar'"
        (dismissed)="closeSheet()"
      >
        <form class="stack" [formGroup]="form" (ngSubmit)="save()">
          <app-field for="member-name" label="Nome">
            <input id="member-name" type="text" formControlName="name" autocomplete="off" />
          </app-field>

          <app-field
            for="member-phone"
            label="Telefone"
            optional
            hint="Só os responsáveis pela escala veem. Nunca aparece no link público."
          >
            <input
              id="member-phone"
              type="tel"
              formControlName="phone"
              inputmode="tel"
              autocomplete="off"
            />
          </app-field>

          <app-color-picker
            [(color)]="color"
            [(transparency)]="transparency"
            [previewName]="name()"
          />

          <app-button
            type="submit"
            block
            [disabled]="form.invalid || colorInvalid()"
            [loading]="saving()"
          >
            Salvar
          </app-button>

          @if (editing(); as member) {
            <app-button variant="secondary" block (click)="toggleActive(member)">
              {{ member.active ? 'Tirar da escala' : 'Voltar para a escala' }}
            </app-button>

            <app-button variant="danger" block [loading]="deleting()" (click)="remove(member)">
              Apagar do cadastro
            </app-button>
          }
        </form>
      </app-sheet>
    }
  `,
  styles: `
    .intro {
      margin-bottom: var(--space-5);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .empty {
      padding: var(--space-5) 0;
      text-align: center;
      color: var(--color-text-muted);
    }

    .members {
      list-style: none;
      margin: 0 0 var(--space-4);
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .member {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .member.is-inactive {
      opacity: 0.65;
    }

    /* Só reforço: quem é continua dito pelo nome. */
    .member__color {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-full);
    }

    .member__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-height: var(--touch-target);
      justify-content: center;
    }

    .member__name {
      font-weight: var(--font-weight-medium);
    }

    .member__phone {
      font-size: var(--font-size-sm);
    }

    .member__badge {
      align-self: flex-start;
      padding: 0 var(--space-2);
      background: var(--color-surface-sunken);
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }

    .member__edit {
      width: var(--touch-target);
      height: var(--touch-target);
      flex-shrink: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--font-size-lg);
      cursor: pointer;
    }

    .member__edit:hover {
      background: var(--color-surface-sunken);
    }
  `,
})
export class FamilyMembersPage {
  readonly patientId = input.required<string>();

  private readonly familyMembers = inject(FamilyMembersService);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly sheetMode = signal<'add' | 'edit' | null>(null);
  protected readonly editing = signal<FamilyMember | null>(null);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);

  protected readonly members = toSignal(
    toObservable(this.patientId).pipe(switchMap((id) => this.familyMembers.watch(id))),
    { initialValue: [] as FamilyMember[] },
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
  });

  protected readonly name = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });

  /** Cor e transparência em edição no seletor. Fora do form porque ele usa `model()`. */
  protected readonly color = signal('');
  protected readonly transparency = signal(DEFAULT_TRANSPARENCY);
  protected readonly colorInvalid = computed(() => !isValidHexColor(this.color()));

  protected colorOf(member: FamilyMember): string {
    return memberColorOf(member.id, member.color);
  }

  protected openAdd(): void {
    this.editing.set(null);
    this.form.reset({ name: '', phone: '' });
    this.color.set(nextFreeMemberColor(this.members().map((member) => member.color)));
    this.transparency.set(DEFAULT_TRANSPARENCY);
    this.sheetMode.set('add');
  }

  protected openEdit(member: FamilyMember): void {
    this.editing.set(member);
    this.form.setValue({ name: member.name, phone: member.phone ?? '' });
    this.color.set(this.colorOf(member));
    this.transparency.set(transparencyOf(member.transparency));
    this.sheetMode.set('edit');
  }

  protected closeSheet(): void {
    this.sheetMode.set(null);
    this.editing.set(null);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.colorInvalid()) {
      return;
    }

    const { name, phone } = this.form.getRawValue();
    const appearance = { color: this.color(), transparency: this.transparency() };
    const member = this.editing();

    this.saving.set(true);
    try {
      if (member) {
        if (member.name !== name.trim()) {
          // Propaga o nome novo para os turnos já escalados.
          const updated = await this.familyMembers.rename(this.patientId(), member.id, name);
          this.toast.success(
            updated > 0
              ? `Nome atualizado em ${updated} ${updated === 1 ? 'turno' : 'turnos'}.`
              : 'Nome atualizado.',
          );
        }

        if (
          appearance.color !== this.colorOf(member) ||
          appearance.transparency !== transparencyOf(member.transparency)
        ) {
          // Propaga a aparência nova para os turnos já escalados.
          await this.familyMembers.updateAppearance(this.patientId(), member.id, appearance);
        }

        await this.familyMembers.updateContact(this.patientId(), member.id, phone);
      } else {
        await this.familyMembers.create(this.patientId(), name, appearance, phone);
        this.toast.success(`${name.trim()} cadastrado(a).`);
      }

      this.closeSheet();
    } catch {
      this.toast.error('Não foi possível salvar. Tente de novo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleActive(member: FamilyMember): Promise<void> {
    try {
      await this.familyMembers.setActive(this.patientId(), member.id, !member.active);
      this.closeSheet();
      this.toast.success(
        member.active
          ? `${member.name} não aparece mais nas opções de escala.`
          : `${member.name} voltou para as opções de escala.`,
      );
    } catch {
      this.toast.error('Não foi possível alterar. Tente de novo.');
    }
  }

  protected async remove(member: FamilyMember): Promise<void> {
    // Conta antes de perguntar: "isto vai deixar 4 turnos vagos" é uma informação
    // que muda a decisão.
    const assignments = await this.familyMembers.countAssignments(this.patientId(), member.id);

    const warning =
      assignments > 0
        ? `\n\n${assignments} ${assignments === 1 ? 'turno ficará vago' : 'turnos ficarão vagos'}.`
        : '';

    if (!confirm(`Apagar ${member.name} do cadastro?${warning}`)) {
      return;
    }

    this.deleting.set(true);
    try {
      await this.familyMembers.remove(this.patientId(), member.id);
      this.closeSheet();
      this.toast.success(`${member.name} foi apagado(a) do cadastro.`);
    } catch {
      this.toast.error('Não foi possível apagar. Tente de novo.');
    } finally {
      this.deleting.set(false);
    }
  }
}
