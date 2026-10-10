import type { JobApplication } from '../types/job';

export interface PendingChange {
  operationId: string;
  applicationId: string;
  base: JobApplication | null;
  next: JobApplication | null;
  order: number;
  importOnly?: boolean;
  force?: boolean;
}

export class SyncConflict extends Error {
  constructor(public fields: string[]) {
    super('Esta postulación cambió en otro dispositivo.');
    this.name = 'SyncConflict';
  }
}

export function equalData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => equalData(value, b[index]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter(key => left[key] !== undefined);
  return keys.length === Object.keys(right).filter(key => right[key] !== undefined).length && keys.every(key => equalData(left[key], right[key]));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeValue(base: unknown, local: unknown, remote: unknown, path: string, conflicts: string[]): unknown {
  if (equalData(local, base)) return remote;
  if (equalData(local, remote) || equalData(remote, base)) return local;

  if (isObject(base) && isObject(local) && isObject(remote)) {
    const result: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(remote), ...Object.keys(local)])) {
      const value = mergeValue(base[key], local[key], remote[key], path ? `${path}.${key}` : key, conflicts);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }

  // Interviews and reminders merge by stable IDs, including additions/deletions.
  if ([base, local, remote].every(value => Array.isArray(value) && value.every(item => isObject(item) && typeof item.id === 'string'))) {
    const maps = [base, local, remote].map(value => new Map((value as Array<{ id: string }>).map(item => [item.id, item])));
    const result: unknown[] = [];
    for (const id of new Set([...maps[2].keys(), ...maps[1].keys(), ...maps[0].keys()])) {
      const value = mergeValue(maps[0].get(id), maps[1].get(id), maps[2].get(id), `${path}.${id}`, conflicts);
      if (value !== undefined) result.push(value);
    }
    return result;
  }

  conflicts.push(path || 'postulación');
  return local;
}

export function mergeApplication(base: JobApplication | null, local: JobApplication | null, remote: JobApplication | null): JobApplication | null {
  if (equalData(local, base)) return remote;
  if (equalData(local, remote) || equalData(remote, base)) return local;
  if (!base || !local || !remote) throw new SyncConflict(['postulación']);

  const conflicts: string[] = [];
  const { updatedAt: baseTime, ...baseData } = base;
  const { updatedAt: localTime, ...localData } = local;
  const { updatedAt: remoteTime, ...remoteData } = remote;
  const data = mergeValue(baseData, localData, remoteData, '', conflicts) as Omit<JobApplication, 'updatedAt'>;
  if (conflicts.length) throw new SyncConflict(conflicts);
  return { ...data, updatedAt: [baseTime, localTime, remoteTime].sort().at(-1)! };
}

export function projectPending(remote: Map<string, JobApplication | null>, pending: PendingChange[]): JobApplication[] {
  const records = new Map(remote);
  for (const change of pending) records.set(change.applicationId, change.next);
  return [...records.values()].filter((value): value is JobApplication => value !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
