# Bora Pra Cima

Gestor de escala de acompanhantes hospitalares.

Uma pessoa internada precisa de acompanhante em turnos definidos pelo hospital, e a
família se organiza por mensagens soltas — o que deixa turnos descobertos e ninguém
sabendo quem vai quando. Este sistema publica essa escala como um calendário que
**qualquer pessoa da família abre por um link, sem criar conta**, e que só os
responsáveis conseguem editar.

## Como funciona

1. Um responsável cria a conta, cadastra o paciente e informa a **janela de revezamento**
   do hospital (por exemplo, trocas só entre 06:00 e 21:00) e a permanência mínima de
   cada acompanhante (padrão: 6h).
2. No calendário, o que ninguém cobre aparece escrito **Vago**. Toca num "Vago" ou em
   **Adicionar turno**.
3. Escolhe quem vai (ou cadastra a pessoa ali mesmo), o dia e o horário em que chega e
   sai. O sistema confere a janela, o mínimo de horas e a sobreposição antes de salvar.
4. Copia o link público e manda no grupo da família. Quem abrir vê a escala e os
   horários descobertos; ninguém consegue alterar nada por ali.

O link pode ser desligado a qualquer momento nos ajustes, sem trocar de endereço.

### Quem usa

| Quem | Tem conta? | O que pode |
|---|---|---|
| **Visitante do link** | Não | Ver o calendário. Nada mais: não edita e não vê telefones. |
| **Familiar** | Não | É só um nome na escala. A maior parte da família nunca entra no sistema. |
| **Responsável** | Sim | Editar a escala, os familiares e os dados do paciente; ligar e desligar o link; convidar outros responsáveis. |
| **Dono** | Sim | Tudo o que o responsável faz, mais remover responsáveis e apagar o paciente. É quem cadastrou o paciente. |

Familiar e responsável são coisas diferentes: o primeiro aparece no calendário, o segundo
tem permissão de escrita. As telas insistem nessa distinção porque é a confusão mais fácil
de cometer.

## Regras de negócio

### Turnos

- Um **turno** é um acompanhante, num dia, de uma hora de chegada a uma de saída. Toda a
  cobertura é feita de turnos.
- O turno pertence ao **dia em que começa**. Se a saída é igual ou anterior à chegada, ele
  vira a noite e termina no dia seguinte (o card mostra `+1`, e a continuação aparece na
  coluna do dia seguinte com `↑ ontem`). Chegada e saída iguais valem 24 horas.
- Datas e horas são o que está escrito (`2026-09-24`, `19:00`), sem fuso: quem abre o
  link em outro lugar vê o mesmo dia.

### Revezamento (regra do hospital, guardada no paciente)

Um turno só é salvo se:

1. **chegada e saída caem dentro da janela** de revezamento do paciente;
2. **dura pelo menos a permanência mínima** (configurável de 30 minutos a 24 horas);
3. **não se sobrepõe a outro turno**, inclusive entre dias. Encostar (a saída de um é a
   chegada do outro) é a troca de turno, não conflito.

A conferência roda enquanto a pessoa digita e **bloqueia** o botão de salvar, explicando o
motivo em português e, quando o problema é o tempo mínimo, sugerindo a primeira saída
possível. Mudar a janela ou o mínimo nos ajustes vale para os próximos turnos; os que já
estão marcados não são reescritos.

### "Vago"

- Vago não é cadastrado: é a **lacuna entre turnos**, calculada a cada abertura do
  calendário.
- Só há vago **de agora em diante**: o que já passou e o que veio antes da internação não
  é pintado de vago.
- O bloco escreve "Vago" e tem borda tracejada; o estado nunca depende só da cor. Tocar
  nele abre o painel de turno já com o horário da lacuna.

### Familiares

- Cada familiar tem nome, telefone (opcional, visível só para os responsáveis), cor e
  transparência.
- Pode ser cadastrado na tela de família ou na hora, ao escalar alguém que ainda não
  existe.
- **Renomear** atualiza o nome em todos os turnos dele.
- **Tirar da escala** o remove das opções de novos turnos, sem mexer nos turnos já
  combinados.
- **Apagar** apaga também os turnos dele, que voltam a ser "Vago". A tela avisa quantos
  ficarão vagos antes de confirmar.

### Cor e transparência

- Cada familiar tem uma cor no calendário: 10 sugeridas ou qualquer outra. Quem é
  cadastrado recebe a primeira cor sugerida que ninguém usa ainda.
- A **transparência** do card vai de 40% a 95%, de 5 em 5 (padrão: 40%). Perto de 95%, só a
  borda do card o destaca.
- Não há cor proibida: quem administra assume o risco de escolher algo parecido com o
  "Vago". O que mantém o "Vago" inconfundível é o texto e a borda tracejada.
- O texto do card se ajusta sozinho para continuar legível sobre a cor escolhida, no tema
  claro e no escuro. As telas privada e pública mostram as mesmas cores.

### Link público

- Qualquer pessoa com o endereço vê o calendário, o nome do paciente e o leito. Não há
  login, e nada nele é editável.
- **Telefones nunca aparecem**, nem o cadastro de familiares.
- Ligar e desligar é instantâneo e mantém o mesmo endereço: quem já tem o link deixa de
  ver a escala assim que é desligado.

### Responsáveis e convites

- Um responsável convida outro pelo **e-mail**. A pessoa vê o convite ao entrar no sistema
  com esse e-mail e aceita para virar responsável.
- O convite **não dispara e-mail**: a tela orienta a avisar a pessoa por outro meio.
- Qualquer responsável convida e cancela convites; só o **dono** remove responsáveis.
- Só o dono apaga o paciente, o que também derruba o link do calendário. Não há como
  desfazer.

### Uso pensado para o corredor do hospital

Boa parte das pessoas tem pouca prática digital e lê a escala no celular, muitas vezes no
claro: alvos de toque de pelo menos 48px, texto grande e contraste alto. O tema escuro
acompanha a preferência do sistema, para os turnos da madrugada.

## Telas

### Sem login

| Endereço | Tela | O que faz |
|---|---|---|
| `/p/:id` | **Calendário público** | A escala em modo consulta: nome do paciente, leito, o mesmo seletor de Dia, 3 dias e Semana e um atalho "Sou responsável pela escala". Se o link estiver desligado, avisa que não está disponível. |
| `/entrar` | **Entrar** | Google ou e-mail e senha. Leva a "Esqueci minha senha" e "Criar uma conta". |
| `/cadastrar` | **Criar conta** | Nome, e-mail e senha (mínimo de 6 caracteres), ou Google. |
| `/recuperar-senha` | **Esqueci minha senha** | Envia por e-mail um link para criar uma senha nova. |

Quem já está logado e abre uma tela de entrada é redirecionado para a lista de pacientes.

### Para responsáveis

| Endereço | Tela | O que faz |
|---|---|---|
| `/pacientes` | **Pacientes** | Lista os pacientes de que a pessoa é responsável (leito, internação e se o link está desligado). Mostra convites recebidos, com o botão de aceitar, e o botão de sair. |
| `/pacientes/novo` | **Cadastrar paciente** | Nome, leito (aparece no link público), hospital (opcional, só para responsáveis), data da internação e as regras de revezamento. Ao salvar, abre o calendário. |
| `/pacientes/:id` | **Calendário** | Três dias lado a lado, com eixo de horas, linha de "agora" no dia de hoje e turnos passados esmaecidos. Um seletor troca entre **Dia**, **3 dias** (o padrão) e **Semana** (domingo a sábado); trocar de visualização, ou tocar na que já está marcada, volta para hoje. A escolha fica guardada no navegador e vale na próxima vez que abrir, em qualquer paciente e no link público. Acima do calendário, o mês e o ano (`Setembro/2026`) e setas que andam um dia, três dias ou uma semana, conforme a visualização. Toque num "Vago" ou em **Adicionar turno** para criar; toque num turno para trocar quem vai, o dia, os horários ou apagá-lo. |
| `/pacientes/:id/familiares` | **Família** | Lista de familiares com a cor de cada um. Cadastrar e editar: nome, telefone, cor e transparência (com pré-visualização de como o card aparece). Tirar da escala e apagar. |
| `/pacientes/:id/equipe` | **Responsáveis** | Quem pode editar a escala, convites enviados e o formulário de convite por e-mail. |
| `/pacientes/:id/ajustes` | **Ajustes** | Link público (copiar, abrir o calendário, ligar e desligar), atalho para os responsáveis, dados do paciente e regras de revezamento e, só para o dono, apagar o paciente. |

Dentro de um paciente, uma barra fixa embaixo alterna entre **Calendário**, **Família** e
**Ajustes**; a tela de responsáveis é aberta a partir dos ajustes. Um endereço que não
existe cai numa página de "não encontrada" com o caminho de volta.

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

## Testes

As regras do Firestore são o ponto do sistema onde um erro tem consequência real — um link
público que deixasse escrever, ou que expusesse os telefones da família, seria uma falha
visível para pessoas reais. Por isso rodam 41 casos contra o emulador, em três frentes:

- **`public-access.test.mjs`** — o que o link público mostra e o que ele nunca mostra.
- **`invites.test.mjs`** — a única escrita do sistema feita por quem ainda não é admin.
- **`service-payloads.test.mjs`** — os payloads que os services de fato escrevem. Uma
  regra pode estar correta em tese e mesmo assim recusar o que o app manda; este
  arquivo é o que prende as duas coisas juntas.

Rodam em série porque compartilham um emulador e cada suíte limpa o banco entre os casos.

As regras de negócio puras (revezamento, lacunas do calendário, cor e contraste) têm specs
de unidade.

## Organização

Bounded contexts do DDD, com o padrão de feature modules do Angular adaptado:

```
src/app/
  core/           # o que é compartilhado; não conhece nenhuma feature
    auth/         # sessão, guards, mensagens de erro em português
    firebase/     # único lugar que fala com @angular/fire; caminhos das coleções
    color/        # cor e transparência do familiar: paleta, contraste do texto
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

**O nome, a cor e a transparência do familiar estão duplicados dentro de cada turno.** A
tela pública não pode ler `familyMembers`, que guarda telefone. A duplicação é deliberada
e custa a propagação em `FamilyMembersService.rename` e `updateAppearance`.

**A cor e a transparência do familiar são livres, sem veto.** Quem administra pode
escolher qualquer cor, inclusive uma parecida com a do "Vago", e assume esse risco; o que
mantém o "Vago" inconfundível é o bloco escrever "Vago" e ter borda tracejada, não a cor.
A transparência vai de 40% a 95% (passo de 5): perto de 95% só a borda do card se
destaca. Quem nunca escolheu (cadastros anteriores) recebe uma cor derivada do id
(`memberColorOf`) e a transparência padrão de 40% (`transparencyOf`), iguais nas telas
privada e pública, sem migração. O texto do card é calculado sobre a cor já misturada ao
fundo, em cada tema (`memberTextColors`), para manter o contraste mínimo de 4,5:1. O fundo
(`--color-surface`) existe duas vezes: em `styles/_tokens.scss` (fonte da verdade) e em
`core/color/member-color.ts`; mexeu num, mexa no outro.

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
