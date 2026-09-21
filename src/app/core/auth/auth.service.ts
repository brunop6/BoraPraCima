import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  GoogleAuthProvider,
  User,
  authState,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';

import { USERS } from '../firebase/paths';

/**
 * Sessão do usuário.
 *
 * Exposta como signals para os componentes e como Observable para os guards, que
 * precisam de um valor assíncrono antes de liberar a rota.
 *
 * O estado tem três situações, e confundir as duas últimas causa o bug clássico de
 * jogar o usuário para a tela de login ao recarregar a página:
 *   - `undefined`: o Firebase ainda está restaurando a sessão do armazenamento;
 *   - `null`: não há ninguém logado;
 *   - `User`: sessão ativa.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  /** Para os guards. A primeira emissão já é a definitiva. */
  readonly user$: Observable<User | null> = authState(this.auth);

  private readonly state = toSignal(this.user$, { initialValue: undefined });

  readonly isResolving = computed(() => this.state() === undefined);
  readonly user = computed(() => this.state() ?? null);
  readonly isAuthenticated = computed(() => !!this.state());
  readonly uid = computed(() => this.state()?.uid ?? null);
  readonly email = computed(() => this.state()?.email?.toLowerCase() ?? null);

  readonly displayName = computed(() => {
    const user = this.state();
    if (!user) {
      return null;
    }
    return user.displayName?.trim() || user.email?.split('@')[0] || 'Você';
  });

  /** Primeiro nome — o cabeçalho fica apertado no celular. */
  readonly firstName = computed(() => this.displayName()?.split(' ')[0] ?? null);

  // ------------------------------------------------------------------ entrada

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    // Sem isto, quem tem várias contas Google entra sempre na primeira sem escolher.
    provider.setCustomParameters({ prompt: 'select_account' });

    const credential = await signInWithPopup(this.auth, provider);
    await this.upsertUserDocument(credential.user);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    await this.upsertUserDocument(credential.user);
  }

  async registerWithEmail(name: string, email: string, password: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    const trimmedName = name.trim();

    await updateProfile(credential.user, { displayName: trimmedName });
    await this.upsertUserDocument(credential.user, trimmedName);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  /** Resolve assim que o Firebase decidir se há sessão. Usado pelos guards. */
  async waitForUser(): Promise<User | null> {
    return firstValueFrom(this.user$);
  }

  // ------------------------------------------------------------------- users/

  /**
   * Mantém `users/{uid}` em dia. `createdAt` só é escrito na criação — com
   * `{ merge: true }` puro, cada login sobrescreveria a data original.
   */
  private async upsertUserDocument(user: User, nameOverride?: string): Promise<void> {
    const reference = doc(this.firestore, `${USERS}/${user.uid}`);
    const snapshot = await getDoc(reference);

    const name =
      nameOverride?.trim() ||
      user.displayName?.trim() ||
      user.email?.split('@')[0] ||
      'Sem nome';

    const profile = {
      name,
      email: (user.email ?? '').toLowerCase(),
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    };

    if (snapshot.exists()) {
      await updateDoc(reference, profile);
      return;
    }

    await setDoc(reference, { ...profile, createdAt: serverTimestamp() });
  }
}
