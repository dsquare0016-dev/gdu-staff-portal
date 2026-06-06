export type UserRole = 'staff' | 'accounts' | 'admin' | 'dg' | 'technical_assistant' | 'ict' | 'super_admin' | 'adhoc';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export type NotificationType = 'attendance' | 'payment' | 'leave' | 'ticket' | 'announcement' | 'chat' | 'system';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  staff_id?: string;
  readable_id?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  head_id: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffRecord {
  id: string;
  user_id: string | null;
  readable_id: string | null;
  full_name: string;
  passport_url: string | null;
  rank: string | null;
  grade_level: number | null;
  step: number | null;
  department_id: string | null;
  position: string | null;
  role: UserRole;
  email: string;
  phone: string | null;
  username: string | null;
  employment_date: string | null;
  qualification: string | null;
  gender: 'male' | 'female' | 'other' | null;
  date_of_birth: string | null;
  state: string | null;
  lga: string | null;
  address: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_rel: string | null;
  retirement_date: string | null;
  adhoc_expiry: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'retired';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: Department;
  profile?: Profile;
}

export interface Attendance {
  id: string;
  staff_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  late_minutes: number;
  note: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  staff?: StaffRecord;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  staff?: StaffRecord;
}

export interface Payroll {
  id: string;
  staff_id: string;
  month: number;
  year: number;
  basic_salary: number;
  gross_salary: number;
  net_salary: number;
  deductions: number;
  payment_status: PaymentStatus;
  payment_date: string | null;
  payment_ref: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  staff?: StaffRecord;
}

export interface Allowance {
  id: string;
  staff_id: string;
  allowance_type: string;
  amount: number;
  month: number;
  year: number;
  payment_status: PaymentStatus;
  payment_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  staff?: StaffRecord;
}

export interface Document {
  id: string;
  staff_id: string | null;
  uploaded_by: string;
  category_id: string | null;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  status: DocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  type: 'direct' | 'group' | 'department';
  department_id: string | null;
  created_by: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
  is_read: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  link: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  department_id: string | null;
  posted_by: string;
  expires_at: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string;
}

export interface LoginPageSettings {
  id: string;
  logo_url: string | null;
  background_url: string | null;
  title: string | null;
  subtitle: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  slug: UserRole;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete';
  created_at: string;
}

export interface DashboardStats {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  totalDepartments: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  };
  pendingLeave: number;
  pendingDocuments: number;
  monthlyPayroll: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface AttendanceChartData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface StaffDistributionByDepartment {
  department: string;
  count: number;
  color: string;
}

export interface MonthlyTrendData {
  month: string;
  staff: number;
  attendance: number;
  payroll: number;
}