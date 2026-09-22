import { useMemo, useState } from 'react';
import { Check, Code2, Copy, FileCode, Layers, Search, X } from 'lucide-react';
import type { CodePreviewResult } from '../api/client';

interface CodePreviewModalProps {
  previewData: CodePreviewResult;
  initialClassName?: string;
  onClose: () => void;
}

export function CodePreviewModal({
  previewData,
  initialClassName,
  onClose,
}: CodePreviewModalProps) {
  const filePaths = useMemo(() => Object.keys(previewData.files), [previewData.files]);

  // Encuentra un archivo por defecto relacionado a la clase seleccionada, o el primer archivo java
  const defaultFile = useMemo(() => {
    if (initialClassName) {
      const match = filePaths.find(
        (p) =>
          p.endsWith(`/${initialClassName}.java`) ||
          p.endsWith(`/${initialClassName}Entity.java`) ||
          p.endsWith(`/${initialClassName}Controller.java`),
      );
      if (match) return match;
    }
    return (
      filePaths.find((p) => p.includes('/entity/') || p.includes('/model/')) ??
      filePaths[0] ??
      ''
    );
  }, [filePaths, initialClassName]);

  const [selectedFile, setSelectedFile] = useState<string>(defaultFile);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredFiles = useMemo(() => {
    if (!filter.trim()) return filePaths;
    const q = filter.toLowerCase();
    return filePaths.filter((p) => p.toLowerCase().includes(q));
  }, [filePaths, filter]);

  const currentContent = previewData.files[selectedFile] ?? '// Sin contenido';

  // Categorías de archivos para agrupar
  const categorizedFiles = useMemo(() => {
    const groups: Record<string, string[]> = {
      'Entidades & Modelos': [],
      'Controladores REST': [],
      'Servicios de Negocio': [],
      'Repositorios JPA': [],
      'Configuración & Proyecto': [],
    };

    for (const f of filteredFiles) {
      if (f.includes('/entity/') || f.includes('/model/')) {
        groups['Entidades & Modelos'].push(f);
      } else if (f.includes('/controller/')) {
        groups['Controladores REST'].push(f);
      } else if (f.includes('/service/')) {
        groups['Servicios de Negocio'].push(f);
      } else if (f.includes('/repository/')) {
        groups['Repositorios JPA'].push(f);
      } else {
        groups['Configuración & Proyecto'].push(f);
      }
    }
    return groups;
  }, [filteredFiles]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  }

  function getFileBasename(path: string): string {
    return path.split('/').pop() ?? path;
  }

  return (
    <div className="code-preview-modal-backdrop" onClick={onClose}>
      <div
        className="code-preview-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="code-preview-modal__header">
          <div className="code-preview-modal__title-group">
            <Code2 size={20} className="code-preview-modal__icon" />
            <div>
              <h2 className="code-preview-modal__title">
                Vista Previa de Código Java (Spring Boot)
              </h2>
              <span className="code-preview-modal__subtitle">
                Proyecto: <strong>{previewData.projectName}</strong> · Arquitectura de 4 Capas
              </span>
            </div>
          </div>
          <div className="code-preview-modal__header-actions">
            <button
              className="code-preview-modal__copy-btn"
              onClick={() => void handleCopy()}
              title="Copiar código del archivo seleccionado"
            >
              {copied ? (
                <>
                  <Check size={15} color="#48bb78" /> ¡Copiado!
                </>
              ) : (
                <>
                  <Copy size={15} /> Copiar código
                </>
              )}
            </button>
            <button className="code-preview-modal__close-btn" onClick={onClose} title="Cerrar (Esc)">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="code-preview-modal__body">
          <aside className="code-preview-modal__sidebar">
            <div className="code-preview-modal__search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar archivo…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              {filter && (
                <button onClick={() => setFilter('')}>
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="code-preview-modal__file-tree">
              {Object.entries(categorizedFiles).map(([category, files]) => {
                if (files.length === 0) return null;
                return (
                  <div key={category} className="code-preview-modal__group">
                    <div className="code-preview-modal__group-title">
                      <Layers size={13} /> {category} ({files.length})
                    </div>
                    {files.map((file) => {
                      const isSelected = file === selectedFile;
                      return (
                        <button
                          key={file}
                          className={`code-preview-modal__file-btn ${
                            isSelected ? 'code-preview-modal__file-btn--active' : ''
                          }`}
                          onClick={() => setSelectedFile(file)}
                          title={file}
                        >
                          <FileCode size={14} />
                          <span className="code-preview-modal__file-name">
                            {getFileBasename(file)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </aside>

          <main className="code-preview-modal__content">
            <div className="code-preview-modal__file-bar">
              <span className="code-preview-modal__path">{selectedFile}</span>
              <span className="code-preview-modal__lines">
                {currentContent.split('\n').length} líneas
              </span>
            </div>
            <pre className="code-preview-modal__code">
              <code>{currentContent}</code>
            </pre>
          </main>
        </div>
      </div>
    </div>
  );
}
