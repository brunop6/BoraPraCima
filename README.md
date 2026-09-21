# Bora Pra Cima

Gestor de escala de acompanhantes hospitalares.

Uma pessoa internada precisa de acompanhante em turnos definidos pelo hospital, e a
família se organiza por mensagens soltas — o que deixa turnos descobertos e ninguém
sabendo quem vai quando. Este sistema publica essa escala como um calendário que
**qualquer pessoa da família abre por um link, sem criar conta**, e que só os
responsáveis conseguem editar.

## Como funciona

1. Um responsável cadastra o paciente e informa a **janela de revezamento** do hospital
   (por exemplo, trocas só entre 06:00 e 21:00) e a permanência mínima de cada
   acompanhante (padrão: 6h).
2. No calendário, o que ninguém cobre aparece escrito **Vago**. Toca num "Vago" ou em
   **Adicionar turno**.
3. Escolhe quem vai (ou cadastra a pessoa ali mesmo), o dia e o horário em que chega e
   sai. O sistema confere a janela, o mínimo de horas e a sobreposição antes de salvar.
4. Copia o link público e manda no grupo da família. Quem abrir vê a escala e os
   horários descobertos; ninguém consegue alterar nada por ali.

O link pode ser desligado a qualquer momento nos ajustes, sem trocar de endereço.

## Stack

| | |
|---|---|
| Angular | 20.3 (LTS), standalone, signals, controle de fluxo nativo |
| Firebase | Firestore + Auth via `@angular/fire` 20.0.1 |
| Plano | **Spark (gratuito)** — não há Cloud Functions |
| Hospedagem | Firebase Hosting |

Sem Cloud Functions é uma decisão, não uma limitação aceita por acaso: a propagação de
nomes e a exclusão de familiares rodam no navegador com `writeBatch`, e o aceite de convite é autorizado por uma
regra do Firestore. Isso mantém o projeto sem cartão de crédito.

## Começar

Pré-requisitos: Node 22+, Java 17+ (para os emuladores), `firebase-tools`.

```bash
npm install
```

### 1. Criar o projeto no Firebase

No [console do Firebase](https://console.firebase.google.com):

1. Crie um projeto.
2. **Authentication → Sign-in method**: habilite **Google** e **E-mail/senha**.
3. **Firestore Database**: crie o banco em modo de produção, região `southamerica-east1`.
4. **Configurações do projeto → Seus aplicativos → Web**: registre um app e copie o
   objeto `firebaseConfig`.

### 2. Apontar o código para ele

Cole os valores em [`src/environments/environment.ts`](src/environments/environment.ts),
substituindo os `TODO_`. Esses valores não são segredo — a proteção real está em
`firestore.rules`.

Depois, ajuste o `default` em [`.firebaserc`](.firebaserc) para o ID do seu projeto.

### 3. Rodar

```bash
npm start          # app em http://localhost:4200 (aponta para os emuladores)
npm run emulators  # Auth e Firestore locais, em outro terminal
```

Em desenvolvimento o app usa
[`environment.development.ts`](src/environments/environment.development.ts), que liga
os emuladores. Nenhum dado de teste toca o projeto real.

### 4. Publicar

```bash
npm run build
npx firebase deploy
```

O deploy publica o app, as `firestore.rules` e os índices de uma vez.

## Testes

```bash
npm run test:rules
```

As regras de negócio puras (revezamento, lacunas do calendário) têm specs de unidade:

```bash
ng test --watch=false --browsers=ChromeHeadless
```

Sobe o emulador do Firestore e roda 40 casos contra as regras de segurança. É o ponto
do sistema onde um erro tem consequência real — um link público que deixasse escrever,
ou que expusesse os telefones da família, seria uma falha visível para pessoas reais.

Os testes cobrem três frentes:

- **`public-access.test.mjs`** — o que o link público mostra e o que ele nunca mostra.
- **`invites.test.mjs`** — a única escrita do sistema feita por quem ainda não é admin.
- **`service-payloads.test.mjs`** — os payloads que os services de fato escrevem. Uma
  regra pode estar correta em tese e mesmo assim recusar o que o app manda; este
  arquivo é o que prende as duas coisas juntas.

Rodam em série (`--test-concurrency=1`) porque compartilham um emulador e cada suíte
limpa o banco entre os casos.

## Organização

Bounded contexts do DDD, com o padrão de feature modules do Angular adaptado:

```
src/app/
  core/           # o que é compartilhado; não conhece nenhuma feature
    auth/         # sessão, guards, mensagens de erro em português
    firebase/     # único lugar que fala com @angular/fire; caminhos das coleções
    patient/      # shared kernel: o tipo Patient e a leitura do paciente
    layout/       # moldura das telas de um paciente
    ui/           # botão, campo, painel, estado vazio, avisos
    utils/        # datas e horas como string
  features/
    auth/         # entrar, cadastrar, recuperar senha
    patients/     # paciente, familiares, responsáveis, convites
    schedule/     # turnos, lacunas, calendário, tela pública
```

Regra de dependência: `core` não importa features; features importam `core`;
**features não importam umas às outras**. A área de um paciente mistura telas dos dois
contextos, e por isso é composta em [`app.routes.ts`](src/app/app.routes.ts), na raiz.

## Decisões que valem saber antes de mexer

**Datas e horas são strings, não `Timestamp`.** `'2026-09-24'` e `'19:00'`. Um turno de
quinta-feira das 22:00 às 06:00 guardado como instante UTC vira sexta-feira no
navegador de quem estiver em outro fuso — e a família vê o dia errado. Como string, a
data é o que está escrito, e a comparação lexicográfica coincide com a cronológica.

**Turno que vira a noite.** Quando `endTime <= startTime`, o turno termina no dia
seguinte. O card mostra `+1`.

**Não existe grade semanal, e "vago" não é armazenado.** A cobertura é só a coleção
`companions`: um documento por turno (acompanhante, dia, chegada, saída). "Vago" é a
lacuna entre turnos, calculada no navegador em `day-layout.util.ts`. Não se pinta de
vago o que veio antes da internação nem o que já passou.

**Revezamento é regra do hospital, e mora no paciente.** `handoffWindowStart`,
`handoffWindowEnd` e `minStayMinutes` ficam no documento do paciente. Todo turno precisa
começar e terminar dentro da janela, durar pelo menos o mínimo e não se sobrepor a
outro. A conferência é `validateShift` (`shift-rules.util.ts`), roda a cada tecla no
painel de turno e **bloqueia** o salvamento. Ela acontece só no navegador, como o resto
da validação de forma: as rules não olham os campos. Pacientes anteriores à regra não
têm os campos e usam os padrões (`handoffRulesOf`).

**O turno pertence ao dia em que começa.** Um turno de 21:00 às 06:00 tem a data da
noite, e o calendário desenha a continuação na coluna do dia seguinte. Por isso o
calendário carrega um dia a mais de cada lado do que mostra. `start == end` vale 24h.

**O ID do turno é aleatório.** Sem molde não há chave natural. Veja "Dívidas conhecidas".

**O nome do familiar está duplicado dentro de cada turno.** A tela pública não pode ler
`familyMembers`, que guarda telefone. A duplicação é deliberada e custa a propagação em
`FamilyMembersService.rename`.

**Convites ficam na raiz (`invites/{email}_{patientId}`), não como subcollection.**
Mostrar "você tem um convite" exigiria procurar em todos os pacientes, ou seja, uma
collection group query — que regras aninhadas em `match /patients/{pid}/...` não
autorizam. Autorizar exigiria um curinga recursivo, e curinga recursivo é justamente o
que as rules evitam (as regras se combinam com OU, então um curinga tornaria os
convites legíveis por quem abrisse o link público).

**Não existe `match /{sub=**}` nas rules.** Cada subcollection tem seu bloco explícito.

**O budget de bundle inicial é 1.2 MB.** O SDK do Firestore responde pela maior parte;
são ~256 kB comprimidos, que é o que de fato trafega. O budget existe para pegar
regressões, não para forçar o impossível.

## Dívidas conhecidas

- **Dois responsáveis criando turnos ao mesmo tempo podem gerar sobreposição.** A
  conferência de conflito é feita no navegador contra o que ele já carregou, e o ID do
  turno é aleatório. O calendário mostra os dois lado a lado em vez de esconder um.

- **Apagar um paciente não apaga as subcollections.** O Firestore não faz cascata. Os
  documentos ficam órfãos e inacessíveis, já que as regras dos filhos dependem do
  documento pai. Resolver direito pediria uma Cloud Function, o que tiraria o projeto
  do plano gratuito.
- **`isPublic()` faz um `get()` por avaliação de regra.** O custo é baixo porque a
  regra de leitura pública não referencia `resource`, então o Firestore a avalia uma
  vez por consulta e não uma vez por documento. Se o volume crescer, o caminho é
  espelhar `publicAccessEnabled` em cada documento filho.
- **O convite não dispara e-mail.** Enviar exigiria Cloud Functions. A tela de
  responsáveis diz isso e orienta a avisar a pessoa por WhatsApp.
- **A interface não foi exercitada em navegador automatizado.** Regras e payloads têm
  cobertura automatizada; as telas foram verificadas por compilação e build.
