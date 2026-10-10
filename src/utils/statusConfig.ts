import { ApplicationStatus, PriorityLevel, WorkModality } from '../types/job';

export interface StatusMeta {
  key: ApplicationStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

export const STATUS_MAP: Record<ApplicationStatus, StatusMeta> = {
  draft: {
    key: 'draft',
    label: 'Borrador',
    badgeBg: 'bg-[#2b2d35]',
    badgeText: 'text-zinc-300',
    badgeBorder: 'border-[#3d414c]',
    dotColor: 'bg-zinc-400'
  },
  applied: {
    key: 'applied',
    label: 'Postulada',
    badgeBg: 'bg-sky-950/40',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-800/40',
    dotColor: 'bg-sky-400'
  },
  review: {
    key: 'review',
    label: 'En revisión',
    badgeBg: 'bg-cyan-950/40',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-800/40',
    dotColor: 'bg-cyan-400'
  },
  technical_test: {
    key: 'technical_test',
    label: 'Prueba técnica',
    badgeBg: 'bg-purple-950/40',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-800/40',
    dotColor: 'bg-purple-400'
  },
  interviewing: {
    key: 'interviewing',
    label: 'En entrevista',
    badgeBg: 'bg-amber-950/40',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-800/40',
    dotColor: 'bg-amber-400'
  },
  offer: {
    key: 'offer',
    label: 'Oferta recibida',
    badgeBg: 'bg-emerald-950/40',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-800/40',
    dotColor: 'bg-emerald-400'
  },
  accepted: {
    key: 'accepted',
    label: 'Aceptada 🎉',
    badgeBg: 'bg-teal-950/40',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-800/40',
    dotColor: 'bg-teal-400'
  },
  rejected: {
    key: 'rejected',
    label: 'Rechazada',
    badgeBg: 'bg-[#2b2d35]',
    badgeText: 'text-zinc-400',
    badgeBorder: 'border-[#3a3d47]',
    dotColor: 'bg-zinc-500'
  },
  withdrawn: {
    key: 'withdrawn',
    label: 'Retirada',
    badgeBg: 'bg-[#2b2d35]',
    badgeText: 'text-zinc-400',
    badgeBorder: 'border-[#3a3d47]',
    dotColor: 'bg-zinc-500'
  }
};

export const PRIORITY_MAP: Record<PriorityLevel, { label: string; dotClass: string }> = {
  high: { label: 'Alta', dotClass: 'bg-rose-400' },
  medium: { label: 'Media', dotClass: 'bg-amber-400' },
  low: { label: 'Baja', dotClass: 'bg-zinc-400' }
};

export const MODALITY_MAP: Record<WorkModality, string> = {
  remote: 'Remoto',
  hybrid: 'Híbrido',
  onsite: 'Presencial'
};
