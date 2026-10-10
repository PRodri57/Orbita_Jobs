import React from 'react';
import { Briefcase, Calendar, Bell, Plus, Mail } from 'lucide-react';
import { ViewMode } from '../types/job';

interface BottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewModal: () => void;
  onOpenTemplatesModal: () => void;
  pendingRemindersCount: number;
  upcomingInterviewsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onViewChange,
  onOpenNewModal,
  onOpenTemplatesModal,
  pendingRemindersCount,
  upcomingInterviewsCount
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#25282f]/95 backdrop-blur-md border-t border-[#31343d] px-3 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md sm:max-w-lg mx-auto flex items-center justify-between relative">
        {/* Tab 1: Postulaciones */}
        <button
          onClick={() => onViewChange('jobs')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            currentView === 'jobs' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Briefcase className="w-5 h-5 mb-1" />
          <span className="text-xs">Postulaciones</span>
        </button>

        {/* Tab 2: Entrevistas */}
        <button
          onClick={() => onViewChange('interviews')}
          className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentView === 'interviews' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Calendar className="w-5 h-5 mb-1" />
            {upcomingInterviewsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-zinc-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {upcomingInterviewsCount}
              </span>
            )}
          </div>
          <span className="text-xs">Entrevistas</span>
        </button>

        {/* CENTER BUTTON: Elevated Add Button */}
        <div className="px-2 flex items-center justify-center -mt-6">
          <button
            onClick={onOpenNewModal}
            className="w-13 h-13 sm:w-14 sm:h-14 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-black/50 border-4 border-[#25282f] transition-transform active:scale-95"
            title="Agregar nueva postulación"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Seguimientos */}
        <button
          onClick={() => onViewChange('reminders')}
          className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentView === 'reminders' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5 mb-1" />
            {pendingRemindersCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {pendingRemindersCount}
              </span>
            )}
          </div>
          <span className="text-xs">Seguimientos</span>
        </button>

        {/* Tab 4: Plantillas de correo */}
        <button
          onClick={onOpenTemplatesModal}
          className="flex-1 flex flex-col items-center justify-center py-1 transition-colors text-zinc-400 hover:text-zinc-200"
        >
          <Mail className="w-5 h-5 mb-1" />
          <span className="text-xs">Plantillas</span>
        </button>
      </div>
    </nav>
  );
};
