import React, { useState } from 'react';
import { JobApplication, InterviewItem } from '../types/job';
import { formatDateES, getDaysDifference } from '../utils/dateUtils';
import { Video, Calendar, Mail, CheckCircle2 } from 'lucide-react';

interface SimplifiedInterviewsListProps {
  applications: JobApplication[];
  onToggleInterview: (appId: string, interviewId: string) => void;
  onSelectApplication: (app: JobApplication) => void;
  onOpenTemplate: (app: JobApplication, interview: InterviewItem) => void;
}

export const SimplifiedInterviewsList: React.FC<SimplifiedInterviewsListProps> = ({
  applications,
  onToggleInterview,
  onSelectApplication,
  onOpenTemplate
}) => {
  const [showCompleted, setShowCompleted] = useState(false);

  // Flatten interviews
  const allInterviews = applications.flatMap((app) =>
    (app.interviews || []).map((interview) => ({
      ...interview,
      application: app
    }))
  );

  const pending = allInterviews
    .filter((i) => !i.completed)
    .sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.time.localeCompare(b.time);
    });

  const completed = allInterviews.filter((i) => i.completed);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <span>Agenda de Entrevistas</span>
        </h2>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-zinc-200"
        >
          {showCompleted ? 'Ocultar pasadas' : `Ver pasadas (${completed.length})`}
        </button>
      </div>

      {pending.length === 0 && !showCompleted ? (
        <div className="bg-[#272a31]/80 border border-[#343842] rounded-2xl p-8 text-center text-sm">
          <p className="text-zinc-200 font-semibold mb-1 text-base">Sin entrevistas pendientes</p>
          <p className="text-zinc-400">Cuando agendes una entrevista en una postulación, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => {
            const diff = getDaysDifference(item.date);
            const isToday = diff === 0;
            const isTomorrow = diff === 1;

            return (
              <div
                key={item.id}
                className="bg-[#272a31] border border-[#353944] rounded-2xl p-4 space-y-3 shadow-sm"
              >
                {/* Header: Company, Date Badge - Larger */}
                <div className="flex items-start justify-between gap-3">
                  <div onClick={() => onSelectApplication(item.application)} className="cursor-pointer min-w-0 flex-1">
                    <span className="font-bold text-zinc-100 text-base sm:text-lg hover:text-indigo-400 transition-colors truncate block">
                      {item.application.company}
                    </span>
                    <p className="text-sm text-zinc-300 font-medium">{item.application.position}</p>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      isToday
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                        : isTomorrow
                        ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                        : 'bg-[#31353f] text-zinc-300 border border-[#434855]'
                    }`}
                  >
                    {isToday ? '¡Hoy!' : isTomorrow ? 'Mañana' : formatDateES(item.date)}
                  </span>
                </div>

                {/* Interview Stage & Time - Larger typography */}
                <div className="bg-[#1f2127]/80 p-3 rounded-xl border border-[#343842] text-xs sm:text-sm">
                  <div className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-indigo-400" />
                    <span>{item.title}</span>
                  </div>
                  <div className="text-zinc-300 mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-200">⏰ {item.time} hs</span>
                    <span>·</span>
                    <span>{item.durationMinutes} minutos</span>
                    {item.interviewers && (
                      <>
                        <span>·</span>
                        <span className="truncate">👤 {item.interviewers}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
                  <button
                    onClick={() => onOpenTemplate(item.application, item)}
                    className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Agradecimiento</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {item.meetingLink && (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        <span>Unirse</span>
                      </a>
                    )}
                    <button
                      onClick={() => onToggleInterview(item.application.id, item.id)}
                      className="px-3 py-2 text-xs sm:text-sm font-medium text-zinc-200 bg-[#343842] hover:bg-[#3d424e] rounded-xl transition-colors"
                    >
                      Realizada
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Completed Interviews */}
          {showCompleted && completed.length > 0 && (
            <div className="pt-4 border-t border-[#343842] space-y-2.5">
              <h3 className="text-sm font-semibold text-zinc-400">Entrevistas Realizadas</h3>
              {completed.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#272a31]/60 border border-[#343842]/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-sm opacity-80"
                >
                  <div>
                    <span className="font-semibold text-zinc-200">{item.application.company}</span>
                    <p className="text-xs text-zinc-400">
                      {item.title} · {formatDateES(item.date)}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleInterview(item.application.id, item.id)}
                    className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lista</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
