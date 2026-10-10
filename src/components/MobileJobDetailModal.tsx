import React from 'react';
import { JobApplication, ApplicationStatus } from '../types/job';
import { STATUS_MAP, MODALITY_MAP } from '../utils/statusConfig';
import { formatDateES } from '../utils/dateUtils';
import {
  X,
  ExternalLink,
  Edit2,
  Trash2,
  Video,
  Mail,
  Bell,
  CheckCircle2,
  Circle
} from 'lucide-react';

interface MobileJobDetailModalProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onToggleInterview: (appId: string, interviewId: string) => void;
  onToggleReminder: (appId: string, reminderId: string) => void;
  onOpenTemplate: (app: JobApplication, templateKey?: string) => void;
}

export const MobileJobDetailModal: React.FC<MobileJobDetailModalProps> = ({
  application,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
  onToggleInterview,
  onToggleReminder,
  onOpenTemplate
}) => {
  if (!isOpen || !application) return null;

  const statusMeta = STATUS_MAP[application.status];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-[#272a31] border border-[#3b404d] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 shadow-2xl">
        {/* Header - Larger */}
        <div className="px-5 py-4 border-b border-[#353944] flex items-start justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-medium">
              {MODALITY_MAP[application.modality]} · Postulado {formatDateES(application.appliedDate)}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-1">
              {application.company}
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 font-medium">{application.position}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(application)}
              className="p-2 text-zinc-300 hover:text-indigo-400 hover:bg-[#343842] rounded-xl transition-colors"
              title="Editar"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar la postulación en ${application.company}?`)) {
                  onDelete(application.id);
                  onClose();
                }
              }}
              className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-[#343842] rounded-xl transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-[#343842] rounded-full transition-colors ml-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body - Larger typography */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Status selector */}
          <div className="p-3.5 bg-[#1f2127] border border-[#373b45] rounded-xl flex items-center justify-between gap-3">
            <span className="font-semibold text-zinc-200 text-sm">Estado del proceso:</span>
            <select
              value={application.status}
              onChange={(e) => onUpdateStatus(application.id, e.target.value as ApplicationStatus)}
              className={`bg-[#2c3038] border text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-hidden ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}
            >
              {Object.entries(STATUS_MAP).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Key Facts */}
          <div className="grid grid-cols-2 gap-2.5">
            {application.salary && (
              <div className="p-3 bg-[#1f2127] border border-[#353944] rounded-xl">
                <span className="text-xs text-zinc-400 block mb-0.5">Salario</span>
                <span className="font-bold text-zinc-100 text-sm">{application.salary}</span>
              </div>
            )}
            {application.jobUrl && (
              <div className="p-3 bg-[#1f2127] border border-[#353944] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400 block mb-0.5">Vacante</span>
                  <span className="font-semibold text-indigo-400 text-sm">Enlace oficial</span>
                </div>
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-indigo-400 hover:text-indigo-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Interviews section */}
          <div>
            <h4 className="font-bold text-zinc-100 text-sm mb-2.5 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Entrevistas Agendadas</span>
            </h4>

            {(application.interviews || []).length === 0 ? (
              <p className="p-3.5 bg-[#1f2127]/60 border border-[#353944] rounded-xl text-zinc-400 text-center text-xs">
                Sin entrevistas agendadas. Toca el botón de editar arriba para programar una.
              </p>
            ) : (
              <div className="space-y-2.5">
                {application.interviews.map((int) => (
                  <div
                    key={int.id}
                    className={`p-3.5 rounded-xl border ${
                      int.completed
                        ? 'bg-[#1f2127]/40 border-[#353944]/40 opacity-70'
                        : 'bg-[#1f2127] border-[#373b45]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-zinc-100 text-sm">{int.title}</div>
                        <div className="text-xs sm:text-sm text-zinc-300 mt-1">
                          📅 {formatDateES(int.date)} · ⏰ {int.time} hs
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {int.meetingLink && !int.completed && (
                          <a
                            href={int.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs"
                          >
                            Unirse
                          </a>
                        )}
                        <button
                          onClick={() => onToggleInterview(application.id, int.id)}
                          className="px-2.5 py-1.5 bg-[#2e323b] hover:bg-[#383d47] border border-[#3e434f] text-zinc-200 rounded-lg text-xs font-medium"
                        >
                          {int.completed ? 'Realizada' : 'Marcar lista'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reminders section */}
          <div>
            <h4 className="font-bold text-zinc-100 text-sm mb-2.5 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span>Seguimientos de esta postulación</span>
            </h4>

            {(application.reminders || []).length === 0 ? (
              <p className="p-3.5 bg-[#1f2127]/60 border border-[#353944] rounded-xl text-zinc-400 text-center text-xs">
                Sin recordatorios pendientes.
              </p>
            ) : (
              <div className="space-y-2">
                {application.reminders.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-[#1f2127] border border-[#373b45] rounded-xl flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => onToggleReminder(application.id, r.id)}
                        className="text-zinc-400 hover:text-indigo-400 shrink-0"
                      >
                        {r.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-500" />
                        )}
                      </button>
                      <span className={`text-zinc-200 text-sm truncate ${r.completed ? 'line-through text-zinc-500' : ''}`}>
                        {r.title}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenTemplate(application, r.suggestedTemplateKey)}
                      className="text-indigo-400 hover:text-indigo-300 text-xs shrink-0 font-semibold px-2 py-1 bg-indigo-950/40 rounded border border-indigo-800/40"
                    >
                      Plantilla
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick email generator button */}
          <button
            onClick={() => onOpenTemplate(application)}
            className="w-full py-3 bg-[#323640] hover:bg-[#3c414d] border border-[#444955] text-zinc-100 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Mail className="w-4 h-4 text-indigo-400" />
            <span>Redactar correo de seguimiento</span>
          </button>

          {/* Notes */}
          {application.notes && (
            <div className="p-3.5 bg-[#1f2127] border border-[#353944] rounded-xl">
              <span className="text-xs text-zinc-400 font-semibold block mb-1">Notas</span>
              <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-line">{application.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
