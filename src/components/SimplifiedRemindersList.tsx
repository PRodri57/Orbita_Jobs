import React, { useState } from 'react';
import { JobApplication, ReminderItem } from '../types/job';
import { formatDateES, getRelativeDateLabel, getTodayDateString } from '../utils/dateUtils';
import { Bell, CheckCircle2, Circle, Mail, Plus, Trash2 } from 'lucide-react';

interface SimplifiedRemindersListProps {
  applications: JobApplication[];
  onToggleReminder: (appId: string, reminderId: string) => void;
  onDeleteReminder: (appId: string, reminderId: string) => void;
  onAddReminder: (appId: string, reminder: Omit<ReminderItem, 'id'>) => void;
  onPostponeReminder: (appId: string, reminderId: string, days: number) => void;
  onOpenTemplate: (app: JobApplication, templateKey?: string) => void;
  onSelectApplication: (app: JobApplication) => void;
}

export const SimplifiedRemindersList: React.FC<SimplifiedRemindersListProps> = ({
  applications,
  onToggleReminder,
  onDeleteReminder,
  onAddReminder,
  onPostponeReminder,
  onOpenTemplate,
  onSelectApplication
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(applications[0]?.id || '');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(getTodayDateString());

  // Flatten reminders
  const allReminders = applications.flatMap((app) =>
    (app.reminders || []).map((reminder) => ({
      ...reminder,
      application: app
    }))
  );

  const pending = allReminders.filter((r) => !r.completed);
  const completed = allReminders.filter((r) => r.completed);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !title.trim()) return;

    onAddReminder(selectedAppId, {
      title: title.trim(),
      dueDate,
      type: 'follow_up_status',
      completed: false,
      suggestedTemplateKey: 'follow_up_status'
    });

    setTitle('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-400" />
          <span>Seguimientos Pendientes</span>
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar</span>
        </button>
      </div>

      {/* Quick Add Form - Larger inputs */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#272a31] border border-[#3b404d] rounded-2xl p-4 sm:p-5 space-y-3.5 text-sm shadow-md"
        >
          <div className="font-bold text-zinc-100 text-base">Nuevo Recordatorio de Seguimiento</div>
          <div>
            <label className="block text-zinc-300 font-medium mb-1">Empresa</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
            >
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.company} - {a.position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Tarea o Seguimiento</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Consultar novedades si no responden tras una semana"
              required
              className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Fecha Límite</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs"
            >
              Guardar Recordatorio
            </button>
          </div>
        </form>
      )}

      {/* Reminders List - Dark Gray, Larger typography */}
      {pending.length === 0 ? (
        <div className="bg-[#272a31]/80 border border-[#343842] rounded-2xl p-8 text-center text-sm">
          <p className="text-zinc-200 font-semibold mb-1 text-base">¡Al día con tus seguimientos!</p>
          <p className="text-zinc-400">No tienes tareas o recordatorios pendientes en este momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((rem) => {
            const rel = getRelativeDateLabel(rem.dueDate);
            const isOverdue = rel.status === 'overdue';
            const isToday = rel.status === 'today';

            return (
              <div
                key={rem.id}
                className="bg-[#272a31] border border-[#353944] rounded-2xl p-4 flex items-start gap-3.5 shadow-sm"
              >
                {/* Touch Checkbox */}
                <button
                  onClick={() => onToggleReminder(rem.application.id, rem.id)}
                  className="mt-0.5 text-zinc-400 hover:text-indigo-400 transition-colors shrink-0 p-1"
                  title="Marcar como completado"
                >
                  <Circle className="w-5 h-5 text-zinc-500 hover:text-indigo-400" />
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      onClick={() => onSelectApplication(rem.application)}
                      className="font-bold text-zinc-100 text-sm sm:text-base hover:text-indigo-400 cursor-pointer truncate"
                    >
                      {rem.application.company}
                    </span>

                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg ${
                        isOverdue
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                          : isToday
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                          : 'bg-[#31353f] text-zinc-300 border border-[#434855]'
                      }`}
                    >
                      {rel.label}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-zinc-200 font-normal leading-relaxed">
                    {rem.title}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#343842] text-xs sm:text-sm">
                    <button
                      onClick={() => onOpenTemplate(rem.application, rem.suggestedTemplateKey)}
                      className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Copiar plantilla de correo</span>
                    </button>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <button
                        onClick={() => onPostponeReminder(rem.application.id, rem.id, 2)}
                        className="px-2.5 py-1 bg-[#343842] hover:bg-[#3e4450] text-zinc-200 rounded-lg text-xs font-medium border border-[#434855] transition-colors"
                        title="Posponer 2 días"
                      >
                        +2d
                      </button>
                      <button
                        onClick={() => onDeleteReminder(rem.application.id, rem.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed list */}
      {completed.length > 0 && (
        <div className="pt-4 border-t border-[#343842] space-y-2">
          <h3 className="text-sm font-semibold text-zinc-400">Completados recientemente</h3>
          {completed.slice(0, 5).map((rem) => (
            <div
              key={rem.id}
              className="bg-[#272a31]/50 border border-[#343842]/50 rounded-xl p-3 flex items-center justify-between gap-3 text-sm opacity-65"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="line-through text-zinc-400 truncate">{rem.title}</span>
              </div>
              <button
                onClick={() => onToggleReminder(rem.application.id, rem.id)}
                className="text-xs text-zinc-400 hover:text-zinc-200 shrink-0"
              >
                Desmarcar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
