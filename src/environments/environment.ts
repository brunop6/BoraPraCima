/**
 * Configuração de produção.
 *
 * Os valores de `firebase` vêm do console do Firebase, em
 * Configurações do projeto → Seus aplicativos → Aplicativo da Web.
 * Não são segredo: a proteção real está em `firestore.rules`.
 */
export const environment = {
  production: true,
  useEmulators: false,
  firebase: {
    apiKey: "AIzaSyBNikUSJz3KkQnoft6pGsD9C0588Swo04c",
    authDomain: "bora-pra-cima.firebaseapp.com",
    projectId: "bora-pra-cima",
    storageBucket: "bora-pra-cima.firebasestorage.app",
    messagingSenderId: "32524124448",
    appId: "1:32524124448:web:754e08db815996ec859745",
    measurementId: "G-4H0BSH4F1E"
  },
} as const;
