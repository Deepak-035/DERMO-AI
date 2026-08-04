export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PredictionResult {
  prediction: string;
  code: string;
  confidence: number;
  image_url: string;
}

export interface PredictionResponse {
  success: boolean;
  message: string;
  filename: string;
  result: PredictionResult;
}

export interface HistoryItem {
  id: number;
  filename: string;
  image_url: string;
  prediction: string;
  code: string;
  confidence: number;
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

  const response = await fetch(`${API_BASE_URL}/predict`, {
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
  const response = await fetch(`${API_BASE_URL}/history?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch history (${response.status})`);
  }

  const data: HistoryResponse = await response.json();
  return data.predictions || [];
}

export async function deleteHistory(id: number): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/history/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete prediction (${response.status})`);
  }

  const data = await response.json();
  return data.success;
}
