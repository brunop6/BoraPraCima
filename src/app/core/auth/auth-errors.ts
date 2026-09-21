import { FirebaseError } from '@angular/fire/app';

/**
 * Mensagens de erro em português claro.
 *
 * Quem vai usar isto em boa parte não tem prática digital: "auth/invalid-credential"
 * não ajuda ninguém, e "Erro ao autenticar" ajuda menos ainda porque não diz o que
 * fazer. Cada mensagem aqui termina apontando um próximo passo.
 */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Esse e-mail não parece válido. Confira se está escrito corretamente.',
  'auth/user-disabled': 'Esta conta foi desativada. Fale com quem administra o calendário.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail. Confira ou cadastre-se.',
  'auth/wrong-password': 'Senha incorreta. Tente de novo ou use "Esqueci minha senha".',
  'auth/invalid-credential': 'E-mail ou senha incorretos. Tente de novo ou use "Esqueci minha senha".',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar em vez de cadastrar.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/missing-password': 'Digite sua senha.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique o sinal e tente de novo.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir. Tente de novo.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere os pop-ups e tente de novo.',
  'auth/cancelled-popup-request': 'Entrada cancelada. Tente de novo.',
  'auth/operation-not-allowed': 'Este método de login não está habilitado no projeto Firebase.',
  'auth/account-exists-with-different-credential':
    'Esse e-mail já está cadastrado com outro método de login. Tente entrar com e-mail e senha.',
};

const FALLBACK = 'Não foi possível concluir. Tente de novo em instantes.';

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? FALLBACK;
  }
  return FALLBACK;
}

/** O usuário fechou o pop-up — não é erro, não merece mensagem vermelha. */
export function isUserCancelled(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')
  );
}
