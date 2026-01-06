export interface Company {
  id: string
  name: string
  representative_name: string
  address: string
  phone?: string
  email?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  company_id: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface SubsidyApplication {
  id: string
  company_id: string
  subsidy_type: 'career_up' | 'work_life_balance' | 'other'
  status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
  deadline_date?: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  application_id: string
  document_type: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  upload_status: 'uploading' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  ai_check_result?: any
  ai_check_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_check_score?: number
  ai_checked_at?: string
}

export interface FileUploadData {
  documentType: string
  file: File
  status: 'pending' | 'uploading' | 'completed' | 'error'
  fileName?: string
  uploadDate?: string
}