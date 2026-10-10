import React, { useState, useRef } from 'react';
import { MoreVertical, FileSpreadsheet, Download, Upload, RotateCcw } from 'lucide-react';
import { JobApplication } from '../types/job';
import { exportApplicationsToCSV, exportApplicationsToJSON } from '../utils/storage';

interface MobileHeaderProps {
  applications: JobApplication[];
  onImportApplications: (apps: JobApplication[]) => boolean;
  onResetData: () => void;
  canEdit: boolean;
  synchronized: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  applications,
  onImportApplications,
  onResetData,
  canEdit,
  synchronized
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          if (synchronized && !confirm('Este respaldo reemplazará las postulaciones de tu cuenta y sincronizará el cambio con tus dispositivos. ¿Continuar?')) return;
          if (onImportApplications(parsed)) alert(`Se incorporaron ${parsed.length} postulaciones. Los cambios pendientes aparecen en el estado de sincronización.`);
        }
      } catch {
        alert('Archivo no válido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="sticky top-0 z-30 bg-[#202227]/90 backdrop-blur-md border-b border-[#2d3038] px-4 py-3.5">
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex items-center justify-between relative">
        {/* Left balance spacer */}
        <div className="w-9" />

        {/* Centered Title - NO LOGO, larger letters */}
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight text-center flex-1">
          Orbita Jobs
        </h1>

        {/* Right action button */}
        <div className="relative w-9 flex justify-end">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-[#2b2e35] rounded-xl transition-colors"
            title="Opciones de datos"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 mt-2 top-full w-52 bg-[#282b31] border border-[#373a43] rounded-2xl shadow-2xl py-1.5 text-sm text-zinc-200 z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={() => {
                  exportApplicationsToCSV(applications);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-[#32353d] flex items-center gap-2.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exportar Excel (CSV)</span>
              </button>
              <button
                onClick={() => {
                  exportApplicationsToJSON(applications);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-[#32353d] flex items-center gap-2.5 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Respaldo JSON</span>
              </button>
              <button
                disabled={!canEdit}
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-[#32353d] flex items-center gap-2.5 transition-colors"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Importar JSON</span>
              </button>
              <hr className="my-1 border-[#373a43]" />
              <button
                disabled={!canEdit}
                onClick={() => {
                  if (confirm(synchronized ? 'Esto reemplazará las postulaciones de tu cuenta por los ejemplos y sincronizará el cambio con tus dispositivos. ¿Continuar?' : '¿Restablecer datos a los ejemplos?')) {
                    onResetData();
                  }
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-[#32353d] flex items-center gap-2.5 text-amber-400/90 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Cargar ejemplos</span>
              </button>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>
    </header>
  );
};
