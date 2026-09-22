import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Clock,
  Sparkles,
  Database,
  Send,
} from 'lucide-react';
import type { UmlModel } from '../types/uml';
import {
  MockDatabase,
  getMockEndpointsForClass,
  executeMockRequest,
  generateCurlCommand,
  type MockEndpoint,
  type MockResponse,
} from '../lib/mockApiRunner';

interface MockApiModalProps {
  model: UmlModel;
  initialClassName?: string;
  onClose: () => void;
}

export function MockApiModal({ model, initialClassName, onClose }: MockApiModalProps) {
  const eligibleClasses = useMemo(
    () => model.classes.filter((c) => c.stereotype !== 'interface' && c.stereotype !== 'enum'),
    [model.classes]
  );

  const [selectedClassName, setSelectedClassName] = useState<string>(() => {
    if (initialClassName && eligibleClasses.some((c) => c.name === initialClassName)) {
      return initialClassName;
    }
    return eligibleClasses[0]?.name ?? '';
  });

  const selectedClass = useMemo(
    () => eligibleClasses.find((c) => c.name === selectedClassName) ?? eligibleClasses[0],
    [eligibleClasses, selectedClassName]
  );

  // In-memory mock database
  const [db, setDb] = useState<MockDatabase>(() => new MockDatabase(model));

  // Available endpoints for selected class
  const endpoints = useMemo(() => {
    if (!selectedClass) return [];
    return getMockEndpointsForClass(selectedClass);
  }, [selectedClass]);

  const [selectedEndpoint, setSelectedEndpoint] = useState<MockEndpoint | null>(() => endpoints[0] || null);

  // Request Body state (for POST / PUT)
  const [requestBodyText, setRequestBodyText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Response state
  const [response, setResponse] = useState<MockResponse | null>(null);
  const [executing, setExecuting] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // When class changes, reset endpoint selection
  useEffect(() => {
    if (endpoints.length > 0) {
      const first = endpoints[0];
      setSelectedEndpoint(first);
      setResponse(null);
      if (first.sampleBody) {
        setRequestBodyText(JSON.stringify(first.sampleBody, null, 2));
      } else {
        setRequestBodyText('');
      }
    }
  }, [selectedClassName, endpoints]);

  // When endpoint changes, set sample body
  const handleSelectEndpoint = (ep: MockEndpoint) => {
    setSelectedEndpoint(ep);
    setResponse(null);
    setJsonError(null);
    if (ep.sampleBody) {
      setRequestBodyText(JSON.stringify(ep.sampleBody, null, 2));
    } else {
      setRequestBodyText('');
    }
  };

  const handleResetDb = () => {
    const newDb = new MockDatabase(model);
    setDb(newDb);
    setResponse(null);
  };

  const handleExecute = () => {
    if (!selectedEndpoint) return;

    let parsedBody: any = undefined;
    if (selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') {
      try {
        parsedBody = requestBodyText.trim() ? JSON.parse(requestBodyText) : {};
        setJsonError(null);
      } catch (err: any) {
        setJsonError('JSON inválido en el cuerpo de la petición. Corrige la sintaxis.');
        return;
      }
    }

    setExecuting(true);
    setTimeout(() => {
      const res = executeMockRequest(db, selectedEndpoint, parsedBody);
      setResponse(res);
      setExecuting(false);
    }, 180);
  };

  const handleCopyCurl = async () => {
    if (!selectedEndpoint) return;
    let parsedBody: any = undefined;
    if (selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') {
      try {
        parsedBody = requestBodyText.trim() ? JSON.parse(requestBodyText) : undefined;
      } catch {
        parsedBody = undefined;
      }
    }
    const curl = generateCurlCommand(selectedEndpoint, 'http://localhost:8080', parsedBody);
    await navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleFillSample = () => {
    if (selectedEndpoint?.sampleBody) {
      setRequestBodyText(JSON.stringify(selectedEndpoint.sampleBody, null, 2));
      setJsonError(null);
    }
  };

  if (eligibleClasses.length === 0) {
    return (
      <div className="mock-api-backdrop" onClick={onClose}>
        <div className="mock-api-modal" onClick={(e) => e.stopPropagation()}>
          <header className="mock-api-modal__header">
            <div className="mock-api-modal__title-group">
              <Terminal size={20} className="mock-api-modal__icon" />
              <h3>Simulador de API Mock</h3>
            </div>
            <button className="mock-api-modal__close" onClick={onClose}>
              <X size={18} />
            </button>
          </header>
          <div className="mock-api-modal__empty">
            <Database size={40} />
            <p>Agrega al menos una clase UML en el lienzo para simular endpoints REST.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mock-api-backdrop" onClick={onClose}>
      <div
        className="mock-api-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header className="mock-api-modal__header">
          <div className="mock-api-modal__title-group">
            <Terminal size={22} className="mock-api-modal__icon" />
            <div>
              <h3>Simulador y Runner de API Mock en el Navegador</h3>
              <p className="mock-api-modal__subtitle">
                Ejecuta peticiones REST vivas sobre tu modelo UML con base de datos en memoria (Spring Boot 4 capas)
              </p>
            </div>
          </div>
          <button className="mock-api-modal__close" onClick={onClose} title="Cerrar (Esc)">
            <X size={18} />
          </button>
        </header>

        {/* Layout */}
        <div className="mock-api-modal__body">
          {/* Sidebar */}
          <aside className="mock-api-modal__sidebar">
            <div className="mock-sidebar__section">
              <label className="mock-sidebar__label">Entidad UML:</label>
              <select
                className="mock-sidebar__select"
                value={selectedClassName}
                onChange={(e) => setSelectedClassName(e.target.value)}
              >
                {eligibleClasses.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name} ({cls.attributes.length} campos)
                  </option>
                ))}
              </select>
            </div>

            <div className="mock-sidebar__section">
              <div className="mock-sidebar__header-row">
                <label className="mock-sidebar__label">Endpoints Disponibles:</label>
                <button
                  className="mock-sidebar__reset-btn"
                  onClick={handleResetDb}
                  title="Reinicia la base de datos en memoria a su estado inicial de prueba"
                >
                  <RotateCcw size={12} /> Reset BD
                </button>
              </div>

              <div className="mock-sidebar__endpoints-list">
                {endpoints.map((ep, idx) => {
                  const isSelected =
                    selectedEndpoint?.method === ep.method && selectedEndpoint?.path === ep.path;
                  return (
                    <button
                      key={idx}
                      className={`mock-endpoint-card ${isSelected ? 'mock-endpoint-card--active' : ''}`}
                      onClick={() => handleSelectEndpoint(ep)}
                    >
                      <span className={`mock-method-badge mock-method-badge--${ep.method.toLowerCase()}`}>
                        {ep.method}
                      </span>
                      <div className="mock-endpoint-card__details">
                        <span className="mock-endpoint-card__path">{ep.path}</span>
                        <span className="mock-endpoint-card__desc">{ep.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mock-sidebar__footer">
              <div className="mock-db-status">
                <Database size={14} />
                <span>In-Memory DB Activa ({eligibleClasses.length} tablas)</span>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="mock-api-modal__main">
            {selectedEndpoint && (
              <>
                {/* Request URL Bar */}
                <div className="mock-request-bar">
                  <span
                    className={`mock-method-badge mock-method-badge--large mock-method-badge--${selectedEndpoint.method.toLowerCase()}`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <div className="mock-request-bar__url">
                    <span className="mock-request-bar__host">http://localhost:8080</span>
                    <span className="mock-request-bar__path">{selectedEndpoint.path}</span>
                  </div>
                  <button
                    className="mock-request-bar__send-btn"
                    onClick={handleExecute}
                    disabled={executing}
                  >
                    {executing ? (
                      <>
                        <Clock size={15} className="mock-spin" /> Enviando…
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Enviar Petición
                      </>
                    )}
                  </button>
                  <button
                    className="mock-request-bar__curl-btn"
                    onClick={handleCopyCurl}
                    title="Copiar comando cURL completo"
                  >
                    {copiedCurl ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedCurl ? '¡Copiado!' : 'cURL'}
                  </button>
                </div>

                {/* Request Payload Editor (if POST or PUT) */}
                {(selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') && (
                  <div className="mock-payload-section">
                    <div className="mock-payload-section__header">
                      <span>Cuerpo de la Petición (Request Body JSON):</span>
                      <button
                        className="mock-payload-sample-btn"
                        onClick={handleFillSample}
                        title="Rellenar con datos sintéticos de ejemplo según el modelo UML"
                      >
                        <Sparkles size={13} /> Ejemplo Automático
                      </button>
                    </div>
                    {jsonError && <div className="mock-payload-error">{jsonError}</div>}
                    <textarea
                      className="mock-payload-textarea"
                      value={requestBodyText}
                      onChange={(e) => setRequestBodyText(e.target.value)}
                      rows={6}
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Response Section */}
                <div className="mock-response-section">
                  <div className="mock-response-header">
                    <div className="mock-response-meta">
                      <span className="mock-response-title">Respuesta del Servidor:</span>
                      {response && (
                        <>
                          <span
                            className={`mock-status-pill ${
                              response.status >= 200 && response.status < 300
                                ? 'mock-status-pill--success'
                                : 'mock-status-pill--error'
                            }`}
                          >
                            Status: {response.status} {response.statusText}
                          </span>
                          <span className="mock-time-pill">
                            <Clock size={12} /> {response.timeMs} ms
                          </span>
                        </>
                      )}
                    </div>
                    {response && (
                      <button
                        className="mock-copy-response-btn"
                        onClick={handleCopyResponse}
                        title="Copiar JSON de respuesta"
                      >
                        {copiedResponse ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        {copiedResponse ? 'Copiado' : 'Copiar JSON'}
                      </button>
                    )}
                  </div>

                  <div className="mock-response-body">
                    {executing ? (
                      <div className="mock-response-placeholder">
                        <Clock size={28} className="mock-spin" />
                        <p>Procesando petición en el simulador Spring Boot…</p>
                      </div>
                    ) : response ? (
                      <pre className="mock-response-json">
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    ) : (
                      <div className="mock-response-placeholder">
                        <Play size={28} />
                        <p>
                          Presiona <strong>"Enviar Petición"</strong> para ejecutar la llamada REST
                          simulada contra la base de datos en memoria.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
