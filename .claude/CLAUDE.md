You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Este projeto (BoraPraCima)

Escala de acompanhantes hospitalares. Leia o `README.md` antes de mexer — as decisões
de modelagem ali têm razões que não são óbvias no código.

### Arquitetura

- Bounded contexts em `src/app/features/{auth,patients,schedule}`; compartilhado em
  `src/app/core`.
- **`core` não importa features. Features não importam umas às outras.** A área de um
  paciente mistura telas de dois contextos e é composta em `app.routes.ts`, na raiz.
- `@angular/fire` só aparece em `core/firebase` e nos services de feature. Componentes
  nunca falam com o Firestore direto.
- Caminhos de coleção vêm de `core/firebase/paths.ts`, nunca de string literal.

### Invariantes que não podem quebrar

- **Datas são `'YYYY-MM-DD'` e horas são `'HH:mm'`**, sempre string. Nunca `Date` nem
  `Timestamp` para data de turno. Use `core/utils/date.util.ts` e `time.util.ts`.
- **`endTime <= startTime` significa que o turno vira a noite** e termina no dia
  seguinte (`date` é o dia em que ele COMEÇA). Todo cálculo de duração precisa passar
  por `durationMinutes`.
- **A janela de revezamento e a permanência mínima são do paciente**
  (`handoffWindowStart`, `handoffWindowEnd`, `minStayMinutes`). Leia sempre por
  `handoffRulesOf`, e valide turno por `validateShift`: não reimplemente a conta.
- **"Vago" não é armazenado.** Não existe grade semanal nem turno sem acompanhante:
  vago é a lacuna entre turnos, calculada em `day-layout.util.ts`.
- **Nada de `match /{sub=**}` em `firestore.rules`.** As regras se combinam com OU; um
  curinga recursivo tornaria `familyMembers` e `invites` legíveis pelo link público.
- **A tela pública e a privada usam o mesmo `ThreeDayViewComponent`**, com `readonly`.
  Não crie uma segunda implementação.
- **O estado "vago" nunca é comunicado só pela cor.** O bloco escreve "Vago".
- **Alvos de toque ≥ 48px** (`--touch-target`). O público tem pouca prática digital.

### Ao mexer em rules ou em payload de service

Rode `npm run test:rules`. `tests/rules/service-payloads.test.mjs` existe para prender
os dois lados juntos: se você mudar o que um service escreve, esse arquivo muda junto.
