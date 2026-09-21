import { Timestamp } from '@angular/fire/firestore';

/** Documento em `users/{uid}`. O `id` é o uid do Firebase Auth. */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
