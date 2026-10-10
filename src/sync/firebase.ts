import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { collection, doc, initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { JobApplication } from '../types/job';
import type { PendingChange } from './merge';
import { equalData, mergeApplication } from './merge';
import { firebaseOptions } from './config';
import { isApplication } from './validate';

export function createFirebaseClient() {
  const options = import.meta.env.VITE_FIREBASE_CONFIG?.trim() ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) : firebaseOptions;
  if (!options.apiKey || !options.projectId || !options.authDomain || !options.appId) {
    throw new Error('La sincronización todavía no está configurada.');
  }
  const app = getApps().find(app => app.name === 'orbita-jobs') || initializeApp(options, 'orbita-jobs');
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });

  return {
    auth,
    watchUser: (receive: (user: User | null) => void) => onAuthStateChanged(auth, receive),
    login: () => signInWithPopup(auth, new GoogleAuthProvider()),
    logout: () => signOut(auth),
    subscribe(uid: string, receive: (records: Map<string, JobApplication | null>, fromCache: boolean) => void, fail: (error: Error) => void) {
      return onSnapshot(collection(db, 'users', uid, 'applications'), { includeMetadataChanges: true }, snapshot => {
        const records = new Map<string, JobApplication | null>();
        let invalid = false;
        snapshot.forEach(item => {
          const stored = item.data();
          if (!stored.deleted && (!isApplication(stored.data) || stored.data.id !== item.id)) { invalid = true; return; }
          records.set(item.id, stored.deleted ? null : stored.data as JobApplication);
        });
        if (invalid) { fail(new Error('Los datos de la nube tienen un formato inválido.')); return; }
        receive(records, snapshot.metadata.fromCache);
      }, fail);
    },
    async commit(uid: string, change: PendingChange): Promise<JobApplication | null> {
      return runTransaction(db, async transaction => {
        const reference = doc(db, 'users', uid, 'applications', change.applicationId);
        const snapshot = await transaction.get(reference);
        const stored = snapshot.data();
        const remote = stored && !stored.deleted ? stored.data as JobApplication : null;
        // Imports only fill missing IDs. Tombstones must not be resurrected by an old device.
        if ((change.importOnly && snapshot.exists()) || stored?.operationId === change.operationId) return remote;
        const merged = change.force ? change.next : mergeApplication(change.base, change.next, remote);
        if (snapshot.exists() && equalData(merged, remote)) return remote;
        transaction.set(reference, {
          data: merged,
          deleted: merged === null,
          revision: (stored?.revision || 0) + 1,
          operationId: change.operationId,
          updatedAt: serverTimestamp(),
        });
        return merged;
      });
    },
  };
}

export type FirebaseClient = ReturnType<typeof createFirebaseClient>;
