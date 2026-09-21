/**
 * Configuração de desenvolvimento — aponta para os emuladores.
 *
 * `firebase emulators:start` ignora as credenciais reais, então os valores
 * abaixo só precisam ser sintaticamente válidos. O `projectId` deve bater com
 * o `default` do .firebaserc por causa do `singleProjectMode`.
 */
export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'localhost',
    projectId: 'bora-pra-cima',
    storageBucket: 'bora-pra-cima.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000',
  },
} as const;
