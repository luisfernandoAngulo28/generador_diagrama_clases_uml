import axios from 'axios';
import type { Diagram, UmlModel } from '../types/uml';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

export async function listDiagrams(): Promise<Diagram[]> {
  const { data } = await api.get<Diagram[]>('/diagrams');
  return data;
}

export async function getDiagram(id: string): Promise<Diagram> {
  const { data } = await api.get<Diagram>(`/diagrams/${id}`);
  return data;
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

export async function sendChatMessage(message: string): Promise<string> {
  const { data } = await api.post<{ reply: string }>('/ai/chat', { message });
  return data.reply;
}
