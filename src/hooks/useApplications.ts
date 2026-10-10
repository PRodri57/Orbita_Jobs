import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type { JobApplication } from '../types/job';
import type { FirebaseClient } from '../sync/firebase';
import { loadApplications, saveApplications } from '../utils/storage';
import { equalData, projectPending, SyncConflict } from '../sync/merge';
import type { PendingChange } from '../sync/merge';
import { isAccountKey, readCache, readPending, removePending, saveCache, savePending } from '../sync/journal';
import { isApplication } from '../sync/validate';

const configured = true;

interface Model {
  user: User | null;
  applications: JobApplication[];
  remote: Map<string, JobApplication | null>;
  pending: PendingChange[];
  conflicts: Set<string>;
  ready: boolean;
  connected: boolean;
  online: boolean;
  working: boolean;
  error: string | null;
  terminalError: boolean;
}

function errorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  if (code.includes('permission-denied')) return 'Esta cuenta no tiene permiso para sincronizar. Tus cambios siguen en este dispositivo.';
  if (code.includes('unauthorized-domain') || code.includes('operation-not-allowed')) return 'El acceso con Google todavía no está habilitado para esta página.';
  if (code.includes('popup-blocked')) return 'El navegador bloqueó el inicio de sesión. Permití la ventana de Google y volvé a intentar.';
  return 'No se pudo sincronizar. Tus cambios se conservan en este dispositivo.';
}

export function useApplications() {
  const model = useRef<Model | null>(null);
  if (!model.current) {
    model.current = {
      user: null, applications: loadApplications(), remote: new Map(), pending: [], conflicts: new Set(),
      ready: !configured, connected: false, online: navigator.onLine, working: false, error: null, terminalError: false,
    };
  }
  const [state, setState] = useState<Model>(() => ({ ...model.current! }));
  const client = useRef<FirebaseClient | null>(null);
  const sequence = useRef(Date.now());
  const drainRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => {
    const current = model.current!;
    if (current.user) current.applications = projectPending(current.remote, current.pending);
    setState({ ...current, conflicts: new Set(current.conflicts), pending: [...current.pending] });
  }, []);

  useEffect(() => {
    let disposed = false;
    let unsubscribeAuth = () => {};
    let unsubscribeCloud = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    let processing = false;
    let generation = 0;

    const restorePending = () => {
      const current = model.current!;
      if (current.user) current.pending = readPending(current.user.uid);
    };

    const processQueue = async () => {
      const current = model.current!;
      if (disposed || processing || !current.user || !current.ready || !current.online || current.terminalError || !client.current) return;
      processing = true;
      const uid = current.user.uid;
      const queueGeneration = generation;
      const run = async () => {
        current.working = true;
        refresh();
        try {
          restorePending();
          let change = current.pending.find(item => !current.conflicts.has(item.applicationId));
          while (change && !disposed && queueGeneration === generation && current.online) {
            try {
              const merged = await client.current!.commit(uid, change);
              if (disposed || queueGeneration !== generation) return;
              removePending(uid, change.operationId);
              current.remote.set(change.applicationId, merged);
              saveCache(uid, current.remote);
              current.error = null;
              restorePending();
            } catch (error) {
              if (disposed || queueGeneration !== generation) return;
              if (error instanceof SyncConflict) {
                current.conflicts.add(change.applicationId);
              } else {
                current.error = errorMessage(error);
                const code = (error as { code?: string })?.code || '';
                current.terminalError = !['unavailable', 'deadline-exceeded', 'aborted'].some(value => code.includes(value));
                break;
              }
            }
            refresh();
            change = current.pending.find(item => !current.conflicts.has(item.applicationId));
          }
        } catch {
          current.error = 'No se pudieron guardar los cambios pendientes. Revisá el espacio disponible del navegador.';
          current.terminalError = true;
        } finally {
          current.working = false;
          if (!disposed && queueGeneration === generation) refresh();
        }
      };
      try {
        // A single browser tab drains the durable journal; all tabs observe the same queue.
        if (navigator.locks) await navigator.locks.request(`orbita-jobs-sync:${uid}`, { ifAvailable: true }, lock => lock ? run() : undefined);
        else await run();
      } finally {
        processing = false;
        if (!disposed && model.current!.pending.length && !model.current!.terminalError) timer = setTimeout(processQueue, 10_000);
      }
    };
    drainRef.current = () => { void processQueue(); };

    const connectionChanged = () => {
      model.current!.online = navigator.onLine;
      refresh();
      if (navigator.onLine) void processQueue();
    };
    const storageChanged = (event: StorageEvent) => {
      const current = model.current!;
      if (!current.user || !event.key || !isAccountKey(current.user.uid, event.key)) return;
      try { restorePending(); refresh(); void processQueue(); }
      catch { current.error = 'No se pudieron leer los cambios pendientes.'; current.terminalError = true; refresh(); }
    };
    window.addEventListener('online', connectionChanged);
    window.addEventListener('offline', connectionChanged);
    window.addEventListener('storage', storageChanged);

    if (configured) {
      void import('../sync/firebase').then(module => {
        if (disposed) return;
        client.current = module.createFirebaseClient();
        unsubscribeAuth = client.current.watchUser(user => {
          generation++;
          unsubscribeCloud();
          const current = model.current!;
          current.user = user;
          current.error = null;
          current.terminalError = false;
          current.connected = false;
          current.conflicts = new Set();
          current.pending = [];
          current.remote = new Map();
          current.ready = !user;
          if (!user) {
            current.applications = loadApplications();
            refresh();
            return;
          }
          try {
            const cached = readCache(user.uid);
            current.remote = cached || new Map();
            current.ready = cached !== null;
            restorePending();
            refresh();
          } catch {
            current.error = 'No se pudieron leer los datos guardados en este dispositivo.';
            current.terminalError = true;
            refresh();
          }
          const subscriptionGeneration = generation;
          unsubscribeCloud = client.current!.subscribe(user.uid, (records, fromCache) => {
            if (disposed || subscriptionGeneration !== generation) return;
            if (fromCache && !records.size && current.remote.size) return;
            if (!fromCache || records.size || current.ready) {
              current.remote = records;
              current.ready = true;
              current.connected = !fromCache;
              try { saveCache(user.uid, records); restorePending(); }
              catch { current.error = 'El navegador no pudo guardar una copia local. Revisá el espacio disponible.'; current.terminalError = true; }
              refresh();
              void processQueue();
            }
          }, error => {
            if (disposed || subscriptionGeneration !== generation) return;
            current.error = errorMessage(error);
            current.terminalError = true;
            refresh();
          });
          void processQueue();
        });
      }).catch(error => {
        if (disposed) return;
        model.current!.ready = true;
        model.current!.error = errorMessage(error);
        refresh();
      });
    }
    return () => {
      disposed = true;
      generation++;
      unsubscribeAuth();
      unsubscribeCloud();
      clearTimeout(timer);
      window.removeEventListener('online', connectionChanged);
      window.removeEventListener('offline', connectionChanged);
      window.removeEventListener('storage', storageChanged);
    };
  }, [refresh]);

  const enqueue = useCallback((changes: Array<Omit<PendingChange, 'operationId' | 'order'>>) => {
    const current = model.current!;
    if (!current.user) return false;
    // Roll back only newly staged entries if durable storage fails before UI changes.
    const staged: string[] = [];
    try {
      for (const change of changes) {
        sequence.current = Math.max(Date.now(), sequence.current + 0.01);
        const operation = { ...change, operationId: crypto.randomUUID(), order: sequence.current };
        savePending(current.user.uid, operation);
        staged.push(operation.operationId);
      }
      current.pending = readPending(current.user.uid);
      current.error = null;
      refresh();
      drainRef.current();
      return true;
    } catch {
      for (const id of staged) removePending(current.user.uid, id);
      current.error = 'No se pudo guardar el cambio en este dispositivo. Revisá el espacio del navegador y volvé a intentar.';
      refresh();
      return false;
    }
  }, [refresh]);

  const setApplications = useCallback((update: SetStateAction<JobApplication[]>): boolean => {
    const current = model.current!;
    if (!current.ready || (current.user && current.terminalError)) return false;
    const next = typeof update === 'function' ? update(current.applications) : update;
    // Remove undefined optional fields before both comparison and persistence.
    const sanitized = JSON.parse(JSON.stringify(next)) as JobApplication[];
    if (!Array.isArray(sanitized) || !sanitized.every(isApplication) || new Set(sanitized.map(app => app.id)).size !== sanitized.length) {
      current.error = 'El archivo contiene postulaciones incompletas o IDs duplicados. Usá un respaldo JSON exportado desde esta aplicación.';
      refresh();
      return false;
    }
    if (!current.user) {
      if (!saveApplications(sanitized)) {
        current.error = 'No se pudo guardar el cambio. Revisá el espacio disponible del navegador.';
        refresh();
        return false;
      }
      current.applications = sanitized;
      current.error = null;
      refresh();
      return true;
    }
    const before = new Map(current.applications.map(app => [app.id, app]));
    const after = new Map(sanitized.map(app => [app.id, app]));
    const changes: Array<Omit<PendingChange, 'operationId' | 'order'>> = [];
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const base = before.get(id) || null;
      const next = after.get(id) || null;
      if (!equalData(base, next)) changes.push({ applicationId: id, base, next });
    }
    return enqueue(changes);
  }, [enqueue, refresh]);

  const login = useCallback(async () => {
    if (!client.current) return;
    try { await client.current.login(); }
    catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      model.current!.error = errorMessage(error);
      refresh();
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await client.current?.logout(); }
    catch { model.current!.error = 'No se pudo cerrar la sesión. Volvé a intentar.'; refresh(); }
  }, [refresh]);

  const importLocal = useCallback(() => {
    const current = model.current!;
    if (!current.user || !current.ready || current.terminalError) return false;
    return enqueue(loadApplications().filter(app => !current.remote.has(app.id)).map(app => ({ applicationId: app.id, base: null, next: app, importOnly: true })));
  }, [enqueue]);

  const resolveConflict = useCallback((id: string, useLocal: boolean) => {
    const current = model.current!;
    if (!current.user) return;
    const changes = current.pending.filter(change => change.applicationId === id);
    const next = changes.at(-1)?.next ?? null;
    // Stage the replacement first, so a quota failure never destroys the local draft.
    if (useLocal && !enqueue([{ applicationId: id, base: current.remote.get(id) || null, next, force: true }])) return;
    for (const change of changes) removePending(current.user.uid, change.operationId);
    current.pending = readPending(current.user.uid);
    current.conflicts.delete(id);
    refresh();
    drainRef.current();
  }, [enqueue, refresh]);

  const retry = useCallback(() => {
    // A failed Firestore listener is closed; recreate it and the auth observer.
    window.location.reload();
  }, []);

  return {
    ...state, configured, setApplications, login, logout, retry, importLocal, resolveConflict,
    canEdit: state.ready && !(state.user && state.terminalError),
    localCount: state.user && state.ready ? loadApplications().filter(app => !state.remote.has(app.id)).length : 0,
  };
}
