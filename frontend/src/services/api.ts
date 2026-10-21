import { supabase } from '@/lib/supabase';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

// ==============================================================================
// Types & Schemas
// ==============================================================================

export interface PredictionResult {
  prediction: string;
  code: string;
  confidence: number;
  image_url: string;
  image_storage_path?: string;
  user_id?: string;

  // Report details
  prediction_id?: number;
  report_id?: number;
  report_number?: string;
  report_download_url?: string;

  // Stage 2 probabilities
  normal_skin_probability?: number;
  lesion_skin_probability?: number;

  // Optional classification details
  classification?: string;
  skin_probability?: number;
  non_skin_probability?: number;
  threshold?: number;
}

export interface PredictionResponse {
  success: boolean;
  message: string;
  filename: string;
  stage?: number;
  result: PredictionResult;
  warnings: string[];
}

export interface HistoryItem {
  id: number;
  filename: string;
  image_url: string;
  image_storage_path?: string;
  prediction: string;
  code: string;
  confidence: number;
  user_id?: string;
  created_at: string;
}

export interface HistoryResponse {
  success: boolean;
  count: number;
  predictions: HistoryItem[];
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface DoctorProfile {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  role: string;
}

export interface AccessGrant {
  id: string;
  patient_id: string;
  doctor_id: string;
  granted_at: string;
  revoked_at?: string;
  notes?: string;
  doctor?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface SharedPatient {
  grant_id: string;
  patient_id: string;
  granted_at: string;
  notes?: string;
  profile: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  predictions_count: number;
}

export interface UserAdminItem {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  created_at?: string;
  last_sign_in_at?: string;
  classifications_count: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface ClassBreakdownItem {
  code: string;
  name: string;
  count: number;
  percentage: number;
}

export interface AdminStats {
  user_stats: {
    total_registered_users: number;
    distinct_users_signed_in: number;
    total_sign_in_events: number;
    admins_count: number;
    regular_users_count: number;
    registrations_over_time: ActivityPoint[];
  };
  classification_stats: {
    total_classifications: number;
    distinct_users_classified: number;
    classification_activity_over_time: ActivityPoint[];
    breakdown_by_class: ClassBreakdownItem[];
  };
}

// ==============================================================================
// Authentication Helpers
// ==============================================================================

export async function getAuthToken(): Promise<string | null> {
  // Get active Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function authorizedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, { ...options, headers });
}

// ==============================================================================
// Core Prediction & History Endpoints
// ==============================================================================

export function getImageUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const data: HealthResponse = await response.json();
    return data.status.toLowerCase().includes('healthy');
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function predictImage(file: File): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await authorizedFetch('/predict', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(errorData.detail || `Server returned error status ${response.status}`);
  }

  return response.json();
}

export async function getHistory(limit = 20, offset = 0): Promise<HistoryItem[]> {
  const response = await authorizedFetch(`/history?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch history (${response.status})`);
  }

  const data: HistoryResponse = await response.json();
  return data.predictions || [];
}

export async function getPredictionById(id: number): Promise<PredictionResult> {
  const response = await authorizedFetch(`/history/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch prediction details (${response.status})`);
  }
  const data = await response.json();
  return data.prediction;
}

export async function deleteHistory(id: number): Promise<boolean> {
  const response = await authorizedFetch(`/history/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete prediction (${response.status})`);
  }

  const data = await response.json();
  return data.success;
}

export async function downloadReport(
  reportId?: number,
  reportDownloadUrl?: string
): Promise<{ blob: Blob; filename: string }> {
  const path =
    reportDownloadUrl ??
    (reportId ? `/reports/${reportId}/download` : undefined);

  if (!path) {
    throw new Error('Report download information is unavailable.');
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Invalid report download URL.');
  }

  const response = await authorizedFetch(path, {
    method: 'GET',
    headers: {
      Accept: 'application/pdf',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('You are not authorized to download this report.');
    }
    if (response.status === 404) {
      throw new Error('Report not found.');
    }
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.message ||
        errData?.detail ||
        `Unable to download report (Status ${response.status}).`
    );
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('The server returned an empty PDF file.');
  }

  let filename = `DERMO-AI-Report-${reportId ?? 'report'}.pdf`;
  const disposition = response.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      filename = match[1].trim();
    }
  }

  return { blob, filename };
}

// ==============================================================================
// Patient-Doctor Access Management Endpoints
// ==============================================================================

export async function getApprovedDoctors(): Promise<DoctorProfile[]> {
  const response = await authorizedFetch('/access/doctors');
  if (!response.ok) throw new Error('Failed to load approved doctors.');
  const data = await response.json();
  return data.doctors || [];
}

export async function getMyAccessGrants(): Promise<AccessGrant[]> {
  const response = await authorizedFetch('/access/grants');
  if (!response.ok) throw new Error('Failed to load sharing grants.');
  const data = await response.json();
  return data.grants || [];
}

export async function grantDoctorAccess(doctorId: string, notes?: string): Promise<any> {
  const response = await authorizedFetch('/access/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctor_id: doctorId, notes }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to grant doctor access.');
  }
  return response.json();
}

export async function revokeDoctorAccess(grantId: string): Promise<boolean> {
  const response = await authorizedFetch(`/access/revoke/${grantId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to revoke doctor access.');
  }
  const data = await response.json();
  return data.success;
}

// ==============================================================================
// Doctor Dashboard Endpoints
// ==============================================================================

export async function getDoctorPatients(): Promise<SharedPatient[]> {
  const response = await authorizedFetch('/doctor/patients');
  if (!response.ok) throw new Error('Failed to load consenting patients.');
  const data = await response.json();
  return data.patients || [];
}

export async function getDoctorPatientPredictions(patientId: string): Promise<HistoryItem[]> {
  const response = await authorizedFetch(`/doctor/patients/${patientId}/predictions`);
  if (!response.ok) throw new Error('Failed to load patient records.');
  const data = await response.json();
  return data.predictions || [];
}

// ==============================================================================
// Admin Management Endpoints
// ==============================================================================

export async function getAdminUsers(params?: {
  query?: string;
  role?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; limit: number; offset: number; users: UserAdminItem[] }> {
  const queryParams = new URLSearchParams();
  if (params?.query) queryParams.append('query', params.query);
  if (params?.role) queryParams.append('role', params.role);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const qs = queryParams.toString();
  const url = qs ? `/admin/users?${qs}` : '/admin/users';
  const response = await authorizedFetch(url);
  if (!response.ok) throw new Error('Failed to load users.');
  return response.json();
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<any> {
  const response = await authorizedFetch(`/admin/users/${userId}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to update user role.');
  }
  return response.json();
}

export interface AuditLogItem {
  id: string;
  actor_id?: string;
  action: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export async function getAdminAuditLogs(): Promise<AuditLogItem[]> {
  const response = await authorizedFetch('/admin/audit-logs');
  if (!response.ok) throw new Error('Failed to load audit logs.');
  const data = await response.json();
  return data.logs || [];
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await authorizedFetch('/admin/stats');
  if (!response.ok) throw new Error('Failed to load system stats.');
  const data = await response.json();
  return data.stats;
}

// ==============================================================================
// Educational Guides
// ==============================================================================

export interface SkinConditionGuide {
  id?: number;
  class_key: string;
  display_name: string;
  overview: string;
  risk_factors: string[];
  warning_signs: string[];
  prevention: string[];
  recommended_actions: string[];
  treatment_overview: string;
  urgency_level: 'routine' | 'prompt' | 'urgent' | string;
  sources: string[];
  review_status: 'draft' | 'reviewed' | 'published' | string;
  reviewed_at?: string | null;
}

export async function getEducationalGuide(
  classKeyOrCode: string
): Promise<SkinConditionGuide | null> {
  if (!classKeyOrCode) return null;
  const cleanKey = classKeyOrCode.trim();

  // 1. Try FastAPI backend endpoint
  try {
    const response = await authorizedFetch(`/guides/${encodeURIComponent(cleanKey)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.guide) {
        return data.guide as SkinConditionGuide;
      }
    }
  } catch (err) {
    console.warn('Backend guide fetch error, trying direct Supabase query:', err);
  }

  // 2. Direct Supabase fallback (Row Level Security protected)
  try {
    const { data, error } = await supabase
      .from('skin_condition_guides')
      .select('*')
      .eq('class_key', cleanKey)
      .eq('review_status', 'published')
      .maybeSingle();

    if (!error && data) {
      return data as SkinConditionGuide;
    }
  } catch (supabaseErr) {
    console.debug('Direct Supabase guide query error:', supabaseErr);
  }

  return null;
}

