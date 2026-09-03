import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Paperclip, Download, Trash2, Upload, X } from 'lucide-react';
import {
  deleteAttachment,
  getAttachmentDownloadUrl,
  listAttachments,
  uploadAttachment,
} from '../api/client';
import type { Attachment } from '../types/attachment';
import { formatFileSize, formatRelativeTime } from '../lib/format';

interface AttachmentsPanelProps {
  diagramId: string;
  onClose: () => void;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/** S3-backed documents/images attached to a diagram (specs, mockups, references). */
export function AttachmentsPanel({ diagramId, onClose }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function refresh() {
    listAttachments(diagramId)
      .then(setAttachments)
      .catch(() => setError('No se pudieron cargar los adjuntos.'));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadAttachment(diagramId, file);
      refresh();
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo subir el archivo.'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachment: Attachment) {
    try {
      const { url } = await getAttachmentDownloadUrl(attachment.id);
      window.open(url, '_blank', 'noopener');
    } catch {
      setError('No se pudo generar el enlace de descarga.');
    }
  }

  async function handleDelete(attachment: Attachment) {
    if (!window.confirm(`¿Eliminar "${attachment.fileName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteAttachment(attachment.id);
      refresh();
    } catch {
      setError('No se pudo eliminar el archivo.');
    }
  }

  return (
    <div className="diagrams-list">
      <div className="diagrams-list__backdrop" onClick={onClose} />
      <div className="diagrams-list__panel">
        <div className="diagrams-list__header">
          <span className="panel-title">
            <Paperclip size={16} /> Documentos adjuntos
          </span>
          <button className="diagrams-list__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => void handleFileSelected(e)}
        />
        <button
          className="attachments-panel__upload"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={14} /> {uploading ? 'Subiendo…' : 'Subir archivo'}
        </button>

        {error && <p className="diagrams-list__error">{error}</p>}
        {!error && attachments === null && <p>Cargando…</p>}
        {!error && attachments?.length === 0 && (
          <p className="diagrams-list__empty">Todavía no hay archivos adjuntos.</p>
        )}

        <ul className="history-panel__list">
          {attachments?.map((attachment) => (
            <li key={attachment.id} className="history-panel__item attachments-panel__item">
              <div className="attachments-panel__item-main">
                <div className="history-panel__item-top">
                  <span className="history-panel__user">{attachment.fileName}</span>
                  <span className="history-panel__time">{formatFileSize(attachment.sizeBytes)}</span>
                </div>
                <div className="history-panel__summary">
                  {attachment.uploadedByUserName} · {formatRelativeTime(attachment.createdAt)}
                </div>
              </div>
              <div className="attachments-panel__actions">
                <button onClick={() => void handleDownload(attachment)} title="Descargar">
                  <Download size={14} />
                </button>
                <button onClick={() => void handleDelete(attachment)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
