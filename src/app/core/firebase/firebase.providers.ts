import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';

import { environment } from '../../../environments/environment';

const EMULATOR_HOST = '127.0.0.1';
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

/**
 * Único ponto do app que conhece o `@angular/fire`. As features falam apenas com
 * os services de `core/firebase` e `core/auth`, então trocar de SDK é uma mudança
 * localizada aqui.
 */
export function provideFirebase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
          disableWarnings: true,
        });
      }
      return auth;
    }),

    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.useEmulators) {
        connectFirestoreEmulator(firestore, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
      }
      return firestore;
    }),
  ]);
}
