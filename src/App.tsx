/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  JobApplication,
  ApplicationStatus,
  ViewMode,
  ReminderItem
} from './types/job';
import { loadApplications, saveApplications } from './utils/storage';
import { INITIAL_JOB_APPLICATIONS } from './data/mockData';
import { StarsBackground } from './components/StarsBackground';
import { MobileHeader } from './components/MobileHeader';
import { BottomNav } from './components/BottomNav';
import { SimplifiedJobsList } from './components/SimplifiedJobsList';
import { SimplifiedInterviewsList } from './components/SimplifiedInterviewsList';
import { SimplifiedRemindersList } from './components/SimplifiedRemindersList';
import { MobileJobModal } from './components/MobileJobModal';
import { MobileJobDetailModal } from './components/MobileJobDetailModal';
import { EmailTemplateModal } from './components/EmailTemplateModal';

export default function App() {
  const [applications, setApplications] = useState<JobApplication[]>(() => loadApplications());
  const [viewMode, setViewMode] = useState<ViewMode>('jobs');

  // Modals state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);

  const [selectedApplicationForDetail, setSelectedApplicationForDetail] = useState<JobApplication | null>(null);

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [templateApp, setTemplateApp] = useState<JobApplication | null>(null);
  const [templateInitialKey, setTemplateInitialKey] = useState<string | undefined>(undefined);

  // Sync with localStorage
  useEffect(() => {
    saveApplications(applications);
  }, [applications]);

  // Update selectedApplicationForDetail when applications list changes
  useEffect(() => {
    if (selectedApplicationForDetail) {
      const refreshed = applications.find((a) => a.id === selectedApplicationForDetail.id);
      setSelectedApplicationForDetail(refreshed || null);
    }
  }, [applications]);

  // Counters
  const pendingRemindersCount = applications.reduce((total, app) => {
    return total + (app.reminders?.filter((r) => !r.completed).length || 0);
  }, 0);

  const upcomingInterviewsCount = applications.reduce((total, app) => {
    return total + (app.interviews?.filter((i) => !i.completed).length || 0);
  }, 0);

  // Handler: Save or Update Application
  const handleSaveApplication = (savedApp: JobApplication) => {
    setApplications((prev) => {
      const exists = prev.some((a) => a.id === savedApp.id);
      if (exists) {
        return prev.map((a) => (a.id === savedApp.id ? savedApp : a));
      } else {
        return [savedApp, ...prev];
      }
    });
  };

  // Handler: Quick Update Status
  const handleUpdateStatus = (id: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus, updatedAt: new Date().toISOString() } : app))
    );
  };

  // Handler: Delete Application
  const handleDeleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  // Handler: Toggle Interview Complete
  const handleToggleInterviewComplete = (appId: string, interviewId: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const updatedInterviews = (app.interviews || []).map((i) =>
          i.id === interviewId ? { ...i, completed: !i.completed } : i
        );
        return { ...app, interviews: updatedInterviews, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Handler: Toggle Reminder Complete
  const handleToggleReminder = (appId: string, reminderId: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const updatedReminders = (app.reminders || []).map((r) =>
          r.id === reminderId ? { ...r, completed: !r.completed } : r
        );
        return { ...app, reminders: updatedReminders, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Handler: Delete Reminder
  const handleDeleteReminder = (appId: string, reminderId: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          reminders: (app.reminders || []).filter((r) => r.id !== reminderId),
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Handler: Add Reminder
  const handleAddReminder = (appId: string, reminder: Omit<ReminderItem, 'id'>) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const newRem: ReminderItem = {
          ...reminder,
          id: 'rem-' + Date.now()
        };
        return {
          ...app,
          reminders: [...(app.reminders || []), newRem],
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Handler: Postpone Reminder
  const handlePostponeReminder = (appId: string, reminderId: string, daysToAdd: number) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const updatedReminders = (app.reminders || []).map((r) => {
          if (r.id !== reminderId) return r;
          const currDate = new Date(r.dueDate);
          currDate.setDate(currDate.getDate() + daysToAdd);
          return {
            ...r,
            dueDate: currDate.toISOString().slice(0, 10)
          };
        });
        return { ...app, reminders: updatedReminders, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Handler: Open Templates Modal
  const handleOpenEmailTemplate = (app: JobApplication, templateKey?: string) => {
    setTemplateApp(app);
    setTemplateInitialKey(templateKey);
    setIsTemplatesModalOpen(true);
  };

  // Handler: Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingApplication(null);
    setIsJobModalOpen(true);
  };

  // Handler: Open Edit Modal
  const handleOpenEditModal = (app: JobApplication) => {
    setEditingApplication(app);
    setIsJobModalOpen(true);
  };

  // Handler: Reset to Initial Data
  const handleResetData = () => {
    setApplications(INITIAL_JOB_APPLICATIONS);
  };

  return (
    <div className="min-h-screen bg-[#202227] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white relative">
      {/* Animated Stars Background */}
      <StarsBackground />

      {/* Mobile Top Header (Centered Title, No Logo) */}
      <MobileHeader
        applications={applications}
        onImportApplications={(imported) => setApplications(imported)}
        onResetData={handleResetData}
      />

      {/* Main Content Area - Mobile Optimized Width */}
      <main className="flex-1 max-w-md sm:max-w-xl md:max-w-2xl w-full mx-auto px-4 pt-4 pb-28 relative z-10">
        {viewMode === 'jobs' && (
          <SimplifiedJobsList
            applications={applications}
            onSelectApplication={(app) => setSelectedApplicationForDetail(app)}
            onUpdateStatus={handleUpdateStatus}
            onOpenNewModal={handleOpenCreateModal}
          />
        )}

        {viewMode === 'interviews' && (
          <SimplifiedInterviewsList
            applications={applications}
            onToggleInterview={handleToggleInterviewComplete}
            onSelectApplication={(app) => setSelectedApplicationForDetail(app)}
            onOpenTemplate={(app, interview) => handleOpenEmailTemplate(app, 'thank_you_initial')}
          />
        )}

        {viewMode === 'reminders' && (
          <SimplifiedRemindersList
            applications={applications}
            onToggleReminder={handleToggleReminder}
            onDeleteReminder={handleDeleteReminder}
            onAddReminder={handleAddReminder}
            onPostponeReminder={handlePostponeReminder}
            onOpenTemplate={handleOpenEmailTemplate}
            onSelectApplication={(app) => setSelectedApplicationForDetail(app)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Centered Add Button) */}
      <BottomNav
        currentView={viewMode}
        onViewChange={setViewMode}
        onOpenNewModal={handleOpenCreateModal}
        onOpenTemplatesModal={() => {
          setTemplateApp(applications[0] || null);
          setTemplateInitialKey(undefined);
          setIsTemplatesModalOpen(true);
        }}
        pendingRemindersCount={pendingRemindersCount}
        upcomingInterviewsCount={upcomingInterviewsCount}
      />

      {/* Modal: Create or Edit Job */}
      <MobileJobModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSave={handleSaveApplication}
        initialData={editingApplication}
      />

      {/* Modal: Job Details Viewer */}
      <MobileJobDetailModal
        application={selectedApplicationForDetail}
        isOpen={!!selectedApplicationForDetail}
        onClose={() => setSelectedApplicationForDetail(null)}
        onEdit={(app) => {
          setSelectedApplicationForDetail(null);
          handleOpenEditModal(app);
        }}
        onDelete={(id) => {
          handleDeleteApplication(id);
          setSelectedApplicationForDetail(null);
        }}
        onUpdateStatus={handleUpdateStatus}
        onToggleInterview={handleToggleInterviewComplete}
        onToggleReminder={handleToggleReminder}
        onOpenTemplate={(app, key) => handleOpenEmailTemplate(app, key)}
      />

      {/* Modal: Email Templates */}
      <EmailTemplateModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        selectedApplication={templateApp}
        applications={applications}
        initialTemplateKey={templateInitialKey}
      />
    </div>
  );
}
