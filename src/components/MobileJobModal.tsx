import React, { useState } from 'react';
import { JobApplication, ApplicationStatus, WorkModality } from '../types/job';
import { STATUS_MAP } from '../utils/statusConfig';
import { getTodayDateString } from '../utils/dateUtils';
import { X, Video } from 'lucide-react';

interface MobileJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (app: JobApplication) => void;
  initialData?: JobApplication | null;
}

export const MobileJobModal: React.FC<MobileJobModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  if (!isOpen) return null;

  const [company, setCompany] = useState(initialData?.company || '');
  const [position, setPosition] = useState(initialData?.position || '');
  const [status, setStatus] = useState<ApplicationStatus>(initialData?.status || 'applied');
  const [modality, setModality] = useState<WorkModality>(initialData?.modality || 'remote');
  const [appliedDate, setAppliedDate] = useState(initialData?.appliedDate || getTodayDateString());
  const [salary, setSalary] = useState(initialData?.salary || '');
  const [jobUrl, setJobUrl] = useState(initialData?.jobUrl || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Quick next interview fields
  const [hasInterview, setHasInterview] = useState(false);
  const [interviewDate, setInterviewDate] = useState(getTodayDateString());
  const [interviewTime, setInterviewTime] = useState('11:00');
  const [interviewTitle, setInterviewTitle] = useState('Entrevista inicial');
  const [interviewLink, setInterviewLink] = useState('');

  // Quick reminder fields
  const [addFollowUpReminder, setAddFollowUpReminder] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) {
      alert('Por favor indica al menos la empresa y el puesto.');
      return;
    }

    const interviews = [...(initialData?.interviews || [])];
    if (hasInterview && interviewTitle.trim()) {
      interviews.push({
        id: 'int-' + Date.now(),
        title: interviewTitle.trim(),
        date: interviewDate,
        time: interviewTime,
        durationMinutes: 45,
        interviewers: '',
        meetingLink: interviewLink.trim() || undefined,
        completed: false
      });
    }

    const reminders = [...(initialData?.reminders || [])];
    if (addFollowUpReminder && !initialData) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      reminders.push({
        id: 'rem-' + Date.now(),
        title: `Seguimiento de postulación en ${company.trim()}`,
        dueDate: d.toISOString().slice(0, 10),
        type: 'follow_up_status',
        completed: false,
        suggestedTemplateKey: 'follow_up_status'
      });
    }

    const appToSave: JobApplication = {
      id: initialData?.id || 'app-' + Date.now(),
      company: company.trim(),
      position: position.trim(),
      location: initialData?.location || '',
      modality,
      salary: salary.trim(),
      jobUrl: jobUrl.trim(),
      status,
      priority: initialData?.priority || 'medium',
      appliedDate,
      expectedResponseDate: initialData?.expectedResponseDate,
      contactName: initialData?.contactName,
      contactEmail: initialData?.contactEmail,
      contactRole: initialData?.contactRole,
      notes: notes.trim(),
      interviews,
      reminders,
      tags: initialData?.tags || [],
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(appToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-[#272a31] border border-[#3b404d] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 shadow-2xl">
        {/* Header - Larger */}
        <div className="px-5 py-4 border-b border-[#353944] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-100 text-lg">
              {initialData ? 'Editar Postulación' : 'Nueva Postulación'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">Datos esenciales de la vacante</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-[#323640] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Larger text and touch areas */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Company & Position */}
          <div>
            <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Empresa *</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ej. Mercado Libre, Nubank, Globant"
              required
              className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3.5 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Puesto o Cargo *</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ej. Frontend Developer, Diseñador UX"
              required
              className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3.5 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          {/* Status & Modality */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
              >
                {Object.entries(STATUS_MAP).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Modalidad</label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as WorkModality)}
                className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
              >
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
              </select>
            </div>
          </div>

          {/* Applied Date & Salary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Fecha de postulación</label>
              <input
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                required
                className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Salario (opcional)</label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Ej. $3,500 USD"
                className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Optional: Add scheduled interview right now */}
          {!initialData && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setHasInterview(!hasInterview)}
                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold text-sm py-1.5"
              >
                <Video className="w-4 h-4" />
                <span>{hasInterview ? '− Quitar fecha de entrevista' : '+ Agendar próxima entrevista ahora'}</span>
              </button>

              {hasInterview && (
                <div className="mt-2.5 p-3.5 bg-[#1e2026] border border-[#383d47] rounded-xl space-y-3 text-sm">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Tipo de entrevista</label>
                    <input
                      type="text"
                      value={interviewTitle}
                      onChange={(e) => setInterviewTitle(e.target.value)}
                      placeholder="Ej. Screening con RRHH o Ronda técnica"
                      className="w-full bg-[#272a31] border border-[#3a3f4a] rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Fecha</label>
                      <input
                        type="date"
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        className="w-full bg-[#272a31] border border-[#3a3f4a] rounded-lg p-2.5 text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Hora</label>
                      <input
                        type="time"
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                        className="w-full bg-[#272a31] border border-[#3a3f4a] rounded-lg p-2.5 text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Enlace de llamada (Meet / Zoom)</label>
                    <input
                      type="url"
                      value={interviewLink}
                      onChange={(e) => setInterviewLink(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full bg-[#272a31] border border-[#3a3f4a] rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Job URL */}
          <div>
            <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Enlace a la oferta (opcional)</label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-zinc-200 mb-1.5 text-sm">Notas breves (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotaciones de la conversación o requisitos..."
              className="w-full bg-[#1e2026] border border-[#383d47] rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          {/* Submit Button - Big & comfortable */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-base transition-colors shadow-lg shadow-black/40"
            >
              {initialData ? 'Guardar Cambios' : 'Crear Postulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
