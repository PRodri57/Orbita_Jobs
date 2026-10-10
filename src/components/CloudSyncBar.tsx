import { Cloud, CloudCheck, CloudOff, LoaderCircle, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { useApplications } from '../hooks/useApplications';

export function CloudSyncBar({ sync }: { sync: ReturnType<typeof useApplications> }) {
  const [signingIn, setSigningIn] = useState(false);
  const [dismissedImport, setDismissedImport] = useState<string | null>(null);
  const connecting = !sync.ready || signingIn;
  const pending = sync.pending.length;
  const offline = !sync.online || (sync.user && sync.ready && !sync.connected && !pending);
  const status = !sync.user ? 'Guardado en este dispositivo'
    : connecting ? 'Cargando tus postulaciones…'
    : sync.error ? 'Sincronización interrumpida'
    : sync.conflicts.size ? 'Hay cambios para revisar'
    : offline ? 'Sin conexión · copia local'
    : pending ? `${pending} cambio${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'}`
    : 'Sincronizado';

  return (
    <section aria-label="Cuenta y sincronización" className="mb-4 rounded-xl border border-[#353944] bg-[#25282f] px-3.5 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-zinc-300" role="status" aria-live="polite">
            {connecting || sync.working ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              : offline ? <CloudOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              : sync.user && !pending && !sync.error ? <CloudCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              : <Cloud className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span>{status}</span>
          </div>
          {sync.user && <p className="mt-1 truncate text-xs text-zinc-400">{sync.user.email}</p>}
        </div>
        {sync.user ? (
          <button onClick={() => { if (!pending || confirm('Hay cambios pendientes. Se conservarán en este dispositivo hasta que vuelvas a iniciar sesión con esta cuenta. ¿Cerrar sesión?')) void sync.logout(); }} className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-[#333740] hover:text-zinc-100" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : sync.configured ? (
          <button disabled={connecting} onClick={async () => { setSigningIn(true); try { await sync.login(); } finally { setSigningIn(false); } }} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            <LogIn className="h-4 w-4" aria-hidden="true" /> Conectar Google
          </button>
        ) : null}
      </div>
      {sync.error && (
        <div className="mt-3 border-t border-[#353944] pt-3" role="alert">
          <p className="text-xs text-amber-300">{sync.error}</p>
          <button onClick={sync.retry} className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-indigo-200"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reintentar</button>
        </div>
      )}
      {sync.user && sync.ready && sync.connected && sync.localCount > 0 && dismissedImport !== sync.user.uid && (
        <div className="mt-3 border-t border-[#353944] pt-3">
          <p className="text-xs leading-relaxed text-zinc-400">Hay {sync.localCount} postulaciones locales que todavía no están en tu cuenta. Podés incorporarlas sin reemplazar las que ya están sincronizadas.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button disabled={!sync.canEdit} onClick={() => { if (sync.importLocal()) setDismissedImport(sync.user!.uid); }} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 disabled:opacity-50">Importar a mi cuenta</button>
            <button onClick={() => setDismissedImport(sync.user!.uid)} className="text-xs text-zinc-400 hover:text-zinc-200">Ahora no</button>
          </div>
        </div>
      )}
      {[...sync.conflicts].map(id => {
        const application = sync.applications.find(app => app.id === id) || sync.pending.find(change => change.applicationId === id)?.base;
        return (
          <div key={id} className="mt-3 border-t border-[#353944] pt-3" role="alert">
            <p className="text-xs leading-relaxed text-amber-300"><strong>{application?.company || 'Una postulación'}</strong> cambió también en otro dispositivo. Elegí qué versión conservar para esta postulación.</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button onClick={() => sync.resolveConflict(id, false)} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">Conservar versión de la nube</button>
              <button onClick={() => sync.resolveConflict(id, true)} className="text-xs font-semibold text-amber-300 hover:text-amber-200">Conservar mis cambios locales</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
