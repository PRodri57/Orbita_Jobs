import { JobApplication } from '../types/job';
import { INITIAL_JOB_APPLICATIONS } from '../data/mockData';

const STORAGE_KEY = 'postulatrack_applications_v1';
const USER_PROFILE_KEY = 'postulatrack_user_profile_v1';

export interface UserProfile {
  name: string;
  email: string;
  title: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Candidato/a',
  email: 'postulaciones@ejemplo.com',
  title: 'Desarrollador de Software'
};

export function loadApplications(): JobApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveApplications(INITIAL_JOB_APPLICATIONS);
      return INITIAL_JOB_APPLICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 0) {
      return parsed;
    }
    return INITIAL_JOB_APPLICATIONS;
  } catch (err) {
    console.error('Error loading applications from localStorage', err);
    return INITIAL_JOB_APPLICATIONS;
  }
}

export function saveApplications(apps: JobApplication[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    return true;
  } catch (err) {
    console.error('Error saving applications to localStorage', err);
    return false;
  }
}

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving user profile', err);
  }
}

export function exportApplicationsToJSON(apps: JobApplication[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(apps, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `postulaciones_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportApplicationsToCSV(apps: JobApplication[]): void {
  const headers = [
    'Empresa',
    'Puesto',
    'Estado',
    'Modalidad',
    'Ubicacion',
    'Salario',
    'Fecha Postulacion',
    'Respuesta Esperada',
    'Prioridad',
    'Contacto Nombre',
    'Contacto Email',
    'Entrevistas Totales',
    'Recordatorios Pendientes',
    'URL Oferta'
  ];

  const escapeCSV = (str?: string) => {
    if (!str) return '""';
    const escaped = String(str).replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = apps.map((app) => [
    escapeCSV(app.company),
    escapeCSV(app.position),
    escapeCSV(app.status),
    escapeCSV(app.modality),
    escapeCSV(app.location),
    escapeCSV(app.salary),
    escapeCSV(app.appliedDate),
    escapeCSV(app.expectedResponseDate),
    escapeCSV(app.priority),
    escapeCSV(app.contactName),
    escapeCSV(app.contactEmail),
    escapeCSV(String(app.interviews?.length || 0)),
    escapeCSV(String(app.reminders?.filter((r) => !r.completed).length || 0)),
    escapeCSV(app.jobUrl)
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `postulaciones_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
