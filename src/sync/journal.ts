import type { JobApplication } from '../types/job';
import type { PendingChange } from './merge';
import { isApplication } from './validate';

const prefix = 'orbita_jobs_sync_v1:';
export const operationPrefix = (uid: string) => `${prefix}${uid}:operation:`;
export const cacheKey = (uid: string) => `${prefix}${uid}:cache`;
export const isAccountKey = (uid: string, key: string) => key.startsWith(operationPrefix(uid)) || key === cacheKey(uid);

export function readPending(uid: string): PendingChange[] {
  const records: PendingChange[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(operationPrefix(uid))) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const change = JSON.parse(raw) as PendingChange;
    if (typeof change.operationId !== 'string' || typeof change.applicationId !== 'string' || !Number.isFinite(change.order)
      || key !== `${operationPrefix(uid)}${change.operationId}`
      || (change.base !== null && (!isApplication(change.base) || change.base.id !== change.applicationId))
      || (change.next !== null && (!isApplication(change.next) || change.next.id !== change.applicationId))) {
      throw new Error('No se pudieron leer los cambios pendientes de este dispositivo.');
    }
    records.push(change);
  }
  return records.sort((a, b) => a.order - b.order || a.operationId.localeCompare(b.operationId));
}

export function savePending(uid: string, change: PendingChange): void {
  localStorage.setItem(`${operationPrefix(uid)}${change.operationId}`, JSON.stringify(change));
}

export function removePending(uid: string, operationId: string): void {
  localStorage.removeItem(`${operationPrefix(uid)}${operationId}`);
}

export function readCache(uid: string): Map<string, JobApplication | null> | null {
  const raw = localStorage.getItem(cacheKey(uid));
  if (!raw) return null;
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries) || !entries.every(item => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string'
    && (item[1] === null || (isApplication(item[1]) && item[1].id === item[0])))) throw new Error('La copia local tiene un formato inválido.');
  return new Map(entries);
}

export function saveCache(uid: string, records: Map<string, JobApplication | null>): void {
  localStorage.setItem(cacheKey(uid), JSON.stringify([...records]));
}
