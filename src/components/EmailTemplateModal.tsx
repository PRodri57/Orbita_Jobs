import React, { useState, useEffect } from 'react';
import { JobApplication } from '../types/job';
import { EMAIL_TEMPLATES, fillTemplate } from '../data/templates';
import { X, Copy, Check, Mail, ExternalLink } from 'lucide-react';

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplication?: JobApplication | null;
  applications: JobApplication[];
  initialTemplateKey?: string;
}

export const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({
  isOpen,
  onClose,
  selectedApplication,
  applications,
  initialTemplateKey
}) => {
  if (!isOpen) return null;

  const [currentAppId, setCurrentAppId] = useState<string>(
    selectedApplication?.id || applications[0]?.id || ''
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateKey && EMAIL_TEMPLATES.some((t) => t.id === initialTemplateKey)
      ? initialTemplateKey
      : EMAIL_TEMPLATES[0].id
  );

  const [candidateName, setCandidateName] = useState('Mi Nombre');
  const [copied, setCopied] = useState(false);

  const currentApp = applications.find((a) => a.id === currentAppId) || selectedApplication;
  const currentTemplate = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) || EMAIL_TEMPLATES[0];

  const generated = fillTemplate(currentTemplate, {
    empresa: currentApp?.company || '[Empresa]',
    posicion: currentApp?.position || '[Puesto]',
    reclutador: currentApp?.contactName || 'Equipo de Selección',
    miNombre: candidateName,
    fechaInicio: '1 de Noviembre de 2026'
  });

  const [editableSubject, setEditableSubject] = useState(generated.subject);
  const [editableBody, setEditableBody] = useState(generated.body);

  useEffect(() => {
    setEditableSubject(generated.subject);
    setEditableBody(generated.body);
  }, [selectedTemplateId, currentAppId, candidateName]);

  const handleCopy = async () => {
    try {
      const fullText = `Asunto: ${editableSubject}\n\n${editableBody}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Por favor copia el texto manualmente.');
    }
  };

  const handleOpenMailto = () => {
    const to = currentApp?.contactEmail || '';
    const subjectEncoded = encodeURIComponent(editableSubject);
    const bodyEncoded = encodeURIComponent(editableBody);
    window.location.href = `mailto:${to}?subject=${subjectEncoded}&body=${bodyEncoded}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-[#272a31] border border-[#3b404d] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 shadow-2xl">
        {/* Header - Larger */}
        <div className="px-5 py-4 border-b border-[#353944] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-zinc-100 text-base">Plantillas de Correo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#323640] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Larger text */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Target Application & Template Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1 text-sm">Empresa destino</label>
              <select
                value={currentAppId}
                onChange={(e) => setCurrentAppId(e.target.value)}
                className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1 text-sm">Tipo de mensaje</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
              >
                {EMAIL_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1 text-sm">Tu nombre para la firma</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-sm text-zinc-100 focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1 text-sm">Asunto del correo</label>
            <input
              type="text"
              value={editableSubject}
              onChange={(e) => setEditableSubject(e.target.value)}
              className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-sm text-zinc-100 font-semibold focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1 text-sm">Cuerpo del mensaje</label>
            <textarea
              rows={8}
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              className="w-full bg-[#1e2026] border border-[#373b45] rounded-xl p-3 text-zinc-200 font-mono text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#353944] bg-[#1e2026] flex items-center justify-between gap-3 text-sm">
          <button
            onClick={handleCopy}
            className={`flex-1 py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-black/30'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                <span>¡Texto Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copiar texto</span>
              </>
            )}
          </button>

          {currentApp?.contactEmail && (
            <button
              onClick={handleOpenMailto}
              className="p-3.5 bg-[#2d3038] hover:bg-[#373b45] border border-[#3c404d] text-zinc-200 font-semibold rounded-xl flex items-center justify-center gap-2"
              title="Abrir en tu cliente de correo"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="hidden sm:inline">Abrir correo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
