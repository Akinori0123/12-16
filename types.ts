export enum TaskStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  AI_PROCESSING = 'AI_PROCESSING',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  COMPLETED = 'COMPLETED',
}

export interface DocumentTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  required: boolean;
  dueDate?: string;
  feedback?: string;
  fileType?: 'pdf' | 'image' | 'form';
}

export interface ProcessPhase {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  tasks: DocumentTask[];
}

export interface SubsidyProgram {
  id: string;
  name: string;
  category: string;
  description: string;
  phases: ProcessPhase[];
}

export interface UserProfile {
  companyName: string;
  representative: string;
}