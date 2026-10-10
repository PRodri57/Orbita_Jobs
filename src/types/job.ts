export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'review'
  | 'interviewing'
  | 'technical_test'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type WorkModality = 'remote' | 'hybrid' | 'onsite';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface InterviewItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  interviewers: string;
  meetingLink?: string;
  completed: boolean;
  notes?: string;
  feedback?: string;
}

export type ReminderType =
  | 'thank_you_note'
  | 'follow_up_status'
  | 'submit_assignment'
  | 'interview_prep'
  | 'custom';

export interface ReminderItem {
  id: string;
  type: ReminderType;
  title: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
  suggestedTemplateKey?: string;
}

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  location: string;
  modality: WorkModality;
  salary: string;
  jobUrl: string;
  status: ApplicationStatus;
  priority: PriorityLevel;
  appliedDate: string; // YYYY-MM-DD
  expectedResponseDate?: string; // YYYY-MM-DD
  contactName?: string;
  contactEmail?: string;
  contactRole?: string;
  notes: string;
  interviews: InterviewItem[];
  reminders: ReminderItem[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'jobs' | 'interviews' | 'reminders';
