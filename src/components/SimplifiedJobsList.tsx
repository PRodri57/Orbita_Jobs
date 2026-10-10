import React, { useState, useMemo } from 'react';
import { JobApplication, ApplicationStatus } from '../types/job';
import { STATUS_MAP, MODALITY_MAP } from '../utils/statusConfig';
import { formatDateES } from '../utils/dateUtils';
import { Search, Video, Bell, Plus, ChevronRight } from 'lucide-react';

interface SimplifiedJobsListProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onOpenNewModal: () => void;
}

export const SimplifiedJobsList: React.FC<SimplifiedJobsListProps> = ({
  applications,
  onSelectApplication,
  onOpenNewModal
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'interview' | 'offer' | 'closed'>('all');

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        app.company.toLowerCase().includes(search.toLowerCase()) ||
        app.position.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filter === 'active') return app.status !== 'rejected' && app.status !== 'withdrawn';
      if (filter === 'interview') return app.status === 'interviewing' || app.status === 'technical_test';
      if (filter === 'offer') return app.status === 'offer' || app.status === 'accepted';
      if (filter === 'closed') return app.status === 'rejected' || app.status === 'withdrawn';
      return true;
    });
  }, [applications, search, filter]);

  const activeCount = applications.filter((a) => a.status !== 'rejected' && a.status !== 'withdrawn').length;
  const inInterviewCount = applications.filter((a) => a.status === 'interviewing' || a.status === 'technical_test').length;

  return (
    <div className="space-y-4 pb-24">
      {/* Search Input - Bigger text */}
      <div className="relative">
        <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresa o puesto..."
          className="w-full bg-[#272a31] border border-[#373b45] rounded-2xl pl-11 pr-4 py-3 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-indigo-400 transition-colors shadow-xs"
        />
      </div>

      {/* Filter Horizontal Chips - Bigger text */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium ${
            filter === 'all'
              ? 'bg-[#31353f] text-zinc-100 font-semibold border border-[#434855]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Todas ({applications.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium ${
            filter === 'active'
              ? 'bg-[#31353f] text-zinc-100 font-semibold border border-[#434855]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Activas ({activeCount})
        </button>
        <button
          onClick={() => setFilter('interview')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium ${
            filter === 'interview'
              ? 'bg-[#31353f] text-zinc-100 font-semibold border border-[#434855]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Entrevistas ({inInterviewCount})
        </button>
        <button
          onClick={() => setFilter('offer')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium ${
            filter === 'offer'
              ? 'bg-[#31353f] text-zinc-100 font-semibold border border-[#434855]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Ofertas
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium ${
            filter === 'closed'
              ? 'bg-[#31353f] text-zinc-100 font-semibold border border-[#434855]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Cerradas
        </button>
      </div>

      {/* Cards List - Dark Gray, Larger typography */}
      {filtered.length === 0 ? (
        <div className="bg-[#272a31]/80 border border-[#343842] rounded-2xl p-8 text-center text-sm">
          <p className="text-zinc-200 font-semibold mb-1 text-base">Sin resultados</p>
          <p className="text-zinc-400 mb-4">No hay postulaciones con este filtro.</p>
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-md shadow-black/30"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar postulación</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const statusMeta = STATUS_MAP[app.status];

            // Next interview
            const nextInterview = (app.interviews || [])
              .filter((i) => !i.completed)
              .sort((a, b) => a.date.localeCompare(b.date))[0];

            // Pending reminders
            const pendingReminders = (app.reminders || []).filter((r) => !r.completed);

            return (
              <div
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className="bg-[#272a31] border border-[#353944] active:border-[#4b5160] hover:border-[#434855] rounded-2xl p-4 transition-all cursor-pointer shadow-sm relative group"
              >
                {/* Header row: Company and Status - Larger typography */}
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-zinc-100 text-base sm:text-lg tracking-tight truncate">
                      {app.company}
                    </h3>
                    <p className="text-sm text-zinc-300 mt-0.5 font-medium line-clamp-1">
                      {app.position}
                    </p>
                  </div>

                  {/* Status badge - Larger */}
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                {/* Next Interview Highlight (if any) */}
                {nextInterview ? (
                  <div className="mt-3 p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Video className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="text-amber-200 font-medium truncate">
                        {nextInterview.title} · {formatDateES(nextInterview.date)} ({nextInterview.time} hs)
                      </span>
                    </div>
                    {nextInterview.meetingLink && (
                      <a
                        href={nextInterview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold px-2.5 py-1 bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 rounded-lg shrink-0 transition-colors"
                      >
                        Unirse
                      </a>
                    )}
                  </div>
                ) : null}

                {/* Footer metadata: Modality, Salary, Reminders - Larger text */}
                <div className="mt-3 pt-2.5 border-t border-[#343842] flex items-center justify-between text-xs sm:text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-300">{MODALITY_MAP[app.modality]}</span>
                    {app.salary && (
                      <>
                        <span>·</span>
                        <span className="text-zinc-300 font-medium">{app.salary}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {pendingReminders.length > 0 && (
                      <span className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                        <Bell className="w-3.5 h-3.5" />
                        <span>{pendingReminders.length} pendiente(s)</span>
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
