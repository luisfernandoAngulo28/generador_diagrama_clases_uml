import { useEffect, useRef, useState } from 'react';
import { BookOpen, Bot, ClipboardCheck, FolderPlus, History, Lightbulb, Mic, PencilRuler, Send, Sparkles, Users } from 'lucide-react';
import { getSocket } from '../api/socket';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { AuthUser } from '../types/auth';
import type { AiProviderReason, AiSettingsEvent, AiStatusEvent, GroupChatMessage } from '../types/chat';
import type { DiagramOperation } from '../types/uml';

interface ChatPanelProps {
  diagramId: string | null;
  currentUser: AuthUser | null;
  /** Room setting loaded with the diagram: may the AI modify the canvas? */
  initialAiCanEdit: boolean;
  /** Modo IA: every message goes to the AI and the panel offers its shortcuts. */
  aiMode: boolean;
  /** Saves the diagram (creating it if needed) so the AI sees the latest canvas; returns its id. */
  onEnsureSaved: () => Promise<string | undefined>;
  /** Applies the AI's canvas operations; only called on the asker's own client. */
  onApplyAiOperations: (operations: DiagramOperation[]) => void;
}

/**
 * Shortcuts of Modo IA. `send: false` only fills the input, because the request
 * still needs the user's part. The read-only prompts avoid change verbs on purpose:
 * the server's intent guard must not treat them as a request to edit the canvas.
 */
const AI_SHORTCUTS = [
  {
    key: 'review',
    icon: ClipboardCheck,
    label: 'Revisar diagrama',
    prompt: 'Revisa nuestro diagrama: dime qué problemas de modelado ves y cómo resolverlos, sin tocar el lienzo todavía.',
    send: true,
  },
  {
    key: 'project',
    icon: FolderPlus,
    label: 'Crear proyecto',
    prompt: 'Crea el diagrama de clases completo para un sistema de ',
    send: false,
  },
  {
    key: 'explain',
    icon: BookOpen,
    label: 'Explicar diagrama',
    prompt: 'Explícame este diagrama como a alguien nuevo en el equipo: qué representa cada clase y por qué se relacionan así.',
    send: true,
  },
  {
    key: 'team',
    icon: History,
    label: '¿Qué hizo el equipo?',
    prompt: '¿Qué hizo cada integrante del equipo en este diagrama últimamente?',
    send: true,
  },
];

interface ProviderBadge {
  label: string;
  className: string;
  title: string;
}

const LOCAL_BADGE: ProviderBadge = {
  label: '🏠 IA local',
  className: 'chat-badge--local',
  title: 'Respondido por el modelo local (Ollama, qwen2.5) en esta computadora, sin internet',
};

/**
 * The chat is answered by the local model; Gemini only steps in for the cases below, and the
 * badge says which one — it never just reads "Gemini". (Photos of diagrams, image → text, go to
 * Gemini through Archivo → Foto de pizarra, not through the chat.)
 */
const CLOUD_BADGES: Record<AiProviderReason, ProviderBadge> = {
  PROJECT: {
    label: '☁️ Gemini · proyecto completo',
    className: 'chat-badge--cloud',
    title:
      'Un proyecto completo lo resuelve Gemini: el modelo local (1,5B en CPU) no alcanza para generarlo bien. Los cambios y preguntas del día a día los responde la IA local.',
  },
  FALLBACK: {
    label: '☁️ Gemini · respaldo',
    className: 'chat-badge--cloud',
    title: 'La IA local no respondió a tiempo: respondió Gemini como respaldo.',
  },
  CLOUD_PRIMARY: {
    label: '☁️ Gemini · servidor',
    className: 'chat-badge--cloud',
    title:
      'El servidor en la nube (AWS t3.micro, 1 GB) no tiene IA local: ahí el chat usa Gemini. La IA local corre en la versión de la laptop.',
  },
};

function providerBadge(message: GroupChatMessage): ProviderBadge | undefined {
  if (message.providerUsed === 'OLLAMA_LOCAL') return LOCAL_BADGE;
  if (message.providerUsed !== 'GEMINI_CLOUD') return undefined;
  return message.providerReason
    ? CLOUD_BADGES[message.providerReason]
    : { label: '☁️ Gemini', className: 'chat-badge--cloud', title: 'Respondido por Google Gemini' };
}

/**
 * Public group chat of the diagram's room (2do Parcial): every participant
 * sees every question and every answer of the AI moderator, which always
 * addresses the asker by name. Replaces the 1er Parcial private 1-a-1 chat.
 */
export function ChatPanel({ diagramId, currentUser, initialAiCanEdit, aiMode, onEnsureSaved, onApplyAiOperations }: ChatPanelProps) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [thinking, setThinking] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [askAi, setAskAi] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "IA edita el lienzo" vs "solo sugerencias": shared by the whole room, enforced by the server.
  const [aiCanEdit, setAiCanEdit] = useState(initialAiCanEdit);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  // The diagram finishes loading after mount: adopt its stored setting when it arrives.
  const [loadedSetting, setLoadedSetting] = useState(initialAiCanEdit);
  if (loadedSetting !== initialAiCanEdit) {
    setLoadedSetting(initialAiCanEdit);
    setAiCanEdit(initialAiCanEdit);
  }
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendsToAi = askAi || aiMode;
  // Latest callback without re-subscribing the socket listeners on every render.
  const applyRef = useRef(onApplyAiOperations);
  useEffect(() => {
    applyRef.current = onApplyAiOperations;
  }, [onApplyAiOperations]);

  // State is per diagram: the parent remounts this panel (key={diagramId}) when it changes.
  useEffect(() => {
    if (!diagramId) return;
    const socket = getSocket();

    function onInitState(state: { chat?: GroupChatMessage[] }) {
      setMessages(state.chat ?? []);
    }
    function onNewMessage(message: GroupChatMessage) {
      if (message.diagramId !== diagramId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      const forMe = message.isAiResponse && message.addressedTo?.userId === currentUser?.id;
      if (forMe && message.operations?.length) applyRef.current(message.operations);
    }
    function onAiStatus(status: AiStatusEvent) {
      setThinking((prev) => {
        const next = { ...prev };
        if (status.isThinking) next[status.requestId] = status.promptBy;
        else delete next[status.requestId];
        return next;
      });
    }
    function onChatError(payload: { message: string }) {
      setError(payload.message);
    }
    function onAiSettings(settings: AiSettingsEvent) {
      if (settings.diagramId !== diagramId) return;
      setAiCanEdit(settings.canEditCanvas);
      setSettingsNotice(
        settings.canEditCanvas
          ? `${settings.changedBy} permitió que la IA modifique el lienzo`
          : `${settings.changedBy} puso a la IA en modo solo sugerencias`,
      );
    }

    socket.on('session:init-state', onInitState);
    socket.on('chat:new-message', onNewMessage);
    socket.on('ai:status', onAiStatus);
    socket.on('chat:error', onChatError);
    socket.on('ai:settings', onAiSettings);
    return () => {
      socket.off('session:init-state', onInitState);
      socket.off('chat:new-message', onNewMessage);
      socket.off('ai:status', onAiStatus);
      socket.off('chat:error', onChatError);
      socket.off('ai:settings', onAiSettings);
    };
  }, [diagramId, currentUser?.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      // The moderator reads the diagram from the database: save first so it sees the current canvas.
      const id = await onEnsureSaved();
      if (!id) throw new Error('no diagram');
      getSocket().emit('chat:send', { diagramId: id, text: trimmed, askAi: sendsToAi });
      setInput('');
    } catch {
      setError('No se pudo guardar el diagrama antes de enviar el mensaje.');
    } finally {
      setSending(false);
    }
  }

  async function toggleAiCanEdit() {
    setError(null);
    try {
      // A brand-new diagram has no room yet: save it first so the setting has a home.
      const id = diagramId ?? (await onEnsureSaved());
      if (!id) throw new Error('no diagram');
      getSocket().emit('ai:settings', { diagramId: id, canEditCanvas: !aiCanEdit });
    } catch {
      setError('No se pudo cambiar la configuración de la IA.');
    }
  }

  function runShortcut(shortcut: (typeof AI_SHORTCUTS)[number]) {
    if (shortcut.send) {
      void sendText(shortcut.prompt);
      return;
    }
    setInput(shortcut.prompt);
    inputRef.current?.focus();
  }

  const { isSupported: voiceSupported, isListening, start: startListening } = useSpeechRecognition({
    lang: 'es-ES',
    onResult: (transcript) => void sendText(transcript),
  });

  const thinkingFor = Object.values(thinking);

  return (
    <aside className="chat-panel">
      <div className="chat-panel__header">
        <Users size={15} /> Chat del equipo
        <span className="chat-panel__header-hint">público · Moderador IA</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={aiCanEdit}
        className={`chat-panel__mode${aiCanEdit ? ' chat-panel__mode--edit' : ' chat-panel__mode--suggest'}`}
        onClick={() => void toggleAiCanEdit()}
        title={
          aiCanEdit
            ? 'La IA puede modificar el lienzo cuando se lo piden. Clic para pasar a «solo sugerencias» (para toda la sala).'
            : 'La IA solo explica y sugiere; no toca el lienzo. Clic para permitir que lo modifique (para toda la sala).'
        }
      >
        {aiCanEdit ? <PencilRuler size={14} /> : <Lightbulb size={14} />}
        <span className="chat-panel__mode-label">{aiCanEdit ? 'IA edita el lienzo' : 'IA solo sugiere'}</span>
        <span className="chat-panel__mode-switch" aria-hidden="true">
          <span className="chat-panel__mode-knob" />
        </span>
      </button>
      {settingsNotice && <div className="chat-panel__notice">{settingsNotice}</div>}

      <div className="chat-panel__messages" ref={listRef}>
        {messages.length === 0 && (
          aiMode ? (
            <div className="ai-mode-hero">
              <Sparkles size={22} />
              <h2>¿En qué trabajamos?</h2>
              <p>
                Pídele a la IA que cree un proyecto, revise el diagrama, haga cambios o explique un concepto. Todo el
                equipo ve la conversación y el diagrama se actualiza solo.
              </p>
            </div>
          ) : (
            <div className="chat-panel__empty">
              Todo el equipo ve este chat. Pregunta a la IA conceptos de ingeniería de software o pídele
              cambios al diagrama: siempre responde nombrando a quien preguntó.
            </div>
          )
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} isMine={!m.isAiResponse && m.sender.userId === currentUser?.id} />
        ))}
        {thinkingFor.map((name, i) => (
          <div key={`${name}-${i}`} className="chat-thinking" aria-live="polite">
            <Bot size={14} /> La IA está pensando la respuesta para <strong>{name}</strong>
            <span className="chat-thinking__dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        ))}
        {isListening && (
          <div className="chat-thinking">
            <Mic size={14} /> Escuchando…
          </div>
        )}
      </div>

      {error && <div className="chat-panel__error">{error}</div>}

      {aiMode && (
        <div className="ai-shortcuts">
          {AI_SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.key}
              type="button"
              className="ai-shortcuts__btn"
              disabled={sending}
              onClick={() => runShortcut(shortcut)}
            >
              <shortcut.icon size={14} /> {shortcut.label}
            </button>
          ))}
        </div>
      )}

      <div className="chat-panel__input-row">
        {!aiMode && (
          <button
            type="button"
            className={`chat-panel__ai-toggle${askAi ? ' chat-panel__ai-toggle--on' : ''}`}
            onClick={() => setAskAi((v) => !v)}
            aria-pressed={askAi}
            title={askAi ? 'El mensaje se envía a la IA (todos ven la respuesta)' : 'Mensaje solo para el equipo (sin IA)'}
          >
            <Bot size={15} />
          </button>
        )}
        {voiceSupported && (
          <button
            type="button"
            className={`chat-panel__mic${isListening ? ' chat-panel__mic--active' : ''}`}
            onClick={startListening}
            disabled={isListening || sending}
            title="Dictar por voz"
          >
            <Mic size={16} />
          </button>
        )}
        <input
          ref={inputRef}
          className="chat-panel__input"
          value={input}
          maxLength={2000}
          placeholder={sendsToAi ? 'Pregunta a la IA… (todos lo verán)' : 'Escribe al equipo…'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void sendText(input);
          }}
        />
        <button className="chat-panel__send" onClick={() => void sendText(input)} disabled={sending}>
          <Send size={14} />
        </button>
      </div>
    </aside>
  );
}

function ChatBubble({ message, isMine }: { message: GroupChatMessage; isMine: boolean }) {
  const badge = providerBadge(message);
  const time = new Date(message.timestamp).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  const name = message.isAiResponse ? 'Moderador IA' : message.sender.userName;

  return (
    <div className={`chat-msg${message.isAiResponse ? ' chat-msg--ai' : ''}${isMine ? ' chat-msg--mine' : ''}`}>
      <div className="chat-msg__avatar" style={message.isAiResponse ? undefined : { background: colorFor(message.sender.userId) }}>
        {message.isAiResponse ? <Bot size={14} /> : initials(message.sender.userName)}
      </div>
      <div className="chat-msg__body">
        <div className="chat-msg__meta">
          <span className="chat-msg__name">{name}</span>
          {message.isAiResponse && message.addressedTo && (
            <span className="chat-msg__to">→ {message.addressedTo.userName}</span>
          )}
          <span className="chat-msg__time">{time}</span>
        </div>
        <div className="chat-msg__text">{message.text}</div>
        {(badge || message.appliedOperationsCount > 0) && (
          <div className="chat-msg__footer">
            {badge && (
              <span className={`chat-badge ${badge.className}`} title={badge.title}>
                {badge.label}
              </span>
            )}
            {message.appliedOperationsCount > 0 && (
              <span className="chat-badge chat-badge--ops">
                ✏️ {message.appliedOperationsCount} cambio{message.appliedOperationsCount === 1 ? '' : 's'} en el lienzo
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Stable color per user so each teammate is recognizable at a glance. */
function colorFor(userId: string): string {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 55% 42%)`;
}
