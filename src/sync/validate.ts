import type { JobApplication } from '../types/job';

const statuses = ['draft', 'applied', 'review', 'interviewing', 'technical_test', 'offer', 'accepted', 'rejected', 'withdrawn'];
const reminderTypes = ['thank_you_note', 'follow_up_status', 'submit_assignment', 'interview_prep', 'custom'];
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: Record<string, any>, keys: string[]) => keys.every(key => typeof value[key] === 'string');
const optionalStrings = (value: Record<string, any>, keys: string[]) => keys.every(key => value[key] === undefined || typeof value[key] === 'string');
const validId = (id: unknown): id is string => typeof id === 'string' && !!id && id.length <= 500 && !id.includes('/') && id !== '.' && id !== '..';
const uniqueIds = (items: Array<{ id: string }>) => new Set(items.map(item => item.id)).size === items.length;

export function isApplication(value: unknown): value is JobApplication {
  if (!object(value) || !validId(value.id)) return false;
  if (!strings(value, ['company', 'position', 'location', 'salary', 'jobUrl', 'appliedDate', 'notes', 'createdAt', 'updatedAt'])) return false;
  if (!optionalStrings(value, ['expectedResponseDate', 'contactName', 'contactEmail', 'contactRole'])) return false;
  if (!statuses.includes(value.status) || !['remote', 'hybrid', 'onsite'].includes(value.modality) || !['high', 'medium', 'low'].includes(value.priority)) return false;
  if (!Array.isArray(value.tags) || !value.tags.every((tag: unknown) => typeof tag === 'string')) return false;
  if (!Array.isArray(value.interviews) || !value.interviews.every((item: unknown) => object(item) && validId(item.id)
    && strings(item, ['title', 'date', 'time', 'interviewers']) && optionalStrings(item, ['meetingLink', 'notes', 'feedback'])
    && Number.isFinite(item.durationMinutes) && typeof item.completed === 'boolean') || !uniqueIds(value.interviews)) return false;
  return Array.isArray(value.reminders) && value.reminders.every((item: unknown) => object(item) && validId(item.id)
    && strings(item, ['title', 'dueDate']) && optionalStrings(item, ['notes', 'suggestedTemplateKey'])
    && reminderTypes.includes(item.type) && typeof item.completed === 'boolean') && uniqueIds(value.reminders);
}
