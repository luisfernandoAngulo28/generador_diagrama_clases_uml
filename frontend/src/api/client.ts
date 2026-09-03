import axios from 'axios';
import type { Diagram, EditDiagramResult, UmlModel, ValidationResult } from '../types/uml';
import type { AuthResult } from '../types/auth';
import type { DiagramHistoryEntry } from '../types/history';
import type { Attachment } from '../types/attachment';

export const AUTH_TOKEN_KEY = 'case-tool.auth-token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

/** Registered by AuthContext so a 401 anywhere logs the user out and shows the login screen. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/register', { name, email, password });
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/login', { email, password });
  return data;
}

export async function listDiagrams(): Promise<Diagram[]> {
  const { data } = await api.get<Diagram[]>('/diagrams');
  return data;
}

export async function getDiagram(id: string): Promise<Diagram> {
  const { data } = await api.get<Diagram>(`/diagrams/${id}`);
  return data;
}

export async function getDiagramHistory(id: string): Promise<DiagramHistoryEntry[]> {
  const { data } = await api.get<DiagramHistoryEntry[]>(`/diagrams/${id}/history`);
  return data;
}

export async function listAttachments(diagramId: string): Promise<Attachment[]> {
  const { data } = await api.get<Attachment[]>(`/diagrams/${diagramId}/attachments`);
  return data;
}

export async function uploadAttachment(diagramId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<Attachment>(`/diagrams/${diagramId}/attachments`, formData);
  return data;
}

export async function getAttachmentDownloadUrl(
  id: string,
): Promise<{ url: string; fileName: string }> {
  const { data } = await api.get<{ url: string; fileName: string }>(`/attachments/${id}/url`);
  return data;
}

export async function deleteAttachment(id: string): Promise<void> {
  await api.delete(`/attachments/${id}`);
}

export async function createDiagram(
  name: string,
  model: UmlModel,
): Promise<Diagram> {
  const { data } = await api.post<Diagram>('/diagrams', { name, model });
  return data;
}

export async function updateDiagram(
  id: string,
  name: string,
  model: UmlModel,
): Promise<Diagram> {
  const { data } = await api.patch<Diagram>(`/diagrams/${id}`, {
    name,
    model,
  });
  return data;
}

export async function downloadGeneratedBackend(diagramId: string): Promise<void> {
  const response = await api.post(
    `/generator/${diagramId}/zip`,
    {},
    { responseType: 'blob' },
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${diagramId}.zip`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function importXmi(xml: string): Promise<Diagram> {
  const { data } = await api.post<Diagram>('/diagrams/import-xmi', { xml });
  return data;
}

export async function downloadXmi(diagramId: string): Promise<void> {
  const response = await api.get(`/diagrams/${diagramId}/xmi`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${diagramId}.xmi`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function openDocumentation(diagramId: string): Promise<void> {
  const response = await api.get(`/diagrams/${diagramId}/documentation`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(
    new Blob([response.data], { type: 'text/html' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function validateDiagram(diagramId: string): Promise<ValidationResult> {
  const { data } = await api.get<ValidationResult>(`/diagrams/${diagramId}/validate`);
  return data;
}

export async function editDiagramWithAi(
  message: string,
  model: UmlModel,
): Promise<EditDiagramResult> {
  const { data } = await api.post<EditDiagramResult>('/ai/edit', { message, model });
  return data;
}

export async function interpretDiagramPhoto(
  imageBase64: string,
  mediaType: string,
): Promise<UmlModel> {
  const { data } = await api.post<UmlModel>('/ai/interpret-photo', {
    imageBase64,
    mediaType,
  });
  return data;
}
