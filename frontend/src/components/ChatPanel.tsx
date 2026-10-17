import { useEffect, useRef, useState } from 'react';
import { Bot, Mic, Send, Users } from 'lucide-react';
import { getSocket } from '../api/socket';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { AuthUser } from '../types/auth';
import type { AiStatusEvent, GroupChatMessage } from '../types/chat';
import type { DiagramOperation } from '../types/uml';

interface ChatPanelProps {
  diagramId: string | null;
  currentUser: AuthUser | null;
  /** Saves the diagram (creating it if needed) so the AI sees the latest canvas; returns its id. */
  onEnsureSaved: () => Promise<string | undefined>;
  /** Applies the AI's canvas operations; only called on the asker's own client. */
  onApplyAiOperations: (operations: DiagramOperation[]) => void;
}

const PROVIDER_BADGE: Record<string, { label: string; className: string; title: string }> = {
  OLLAMA_LOCAL: {
    label: '🏠 Ollama Local',
    className: 'chat-badge--local',
    title: 'Respondido por el modelo local qwen2.5 (sin internet)',
  },
  GEMINI_CLOUD: {
    label: '☁️ Gemini Cloud',
    className: 'chat-badge--cloud',
    title: 'Respondido por Google Gemini (Google AI Studio)',
  },
};

/**
 * Public group chat of the diagram's room (2do Parcial): every participant
 * sees every question and every answer of the AI moderator, which always
 * addresses the asker by name. Replaces the 1er Parcial private 1-a-1 chat.
 */
export function ChatPanel({ diagramId, currentUser, onEnsureSaved, onApplyAiOperations }: ChatPanelProps) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [thinking, setThinking] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [askAi, setAskAi] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
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

    socket.on('session:init-state', onInitState);
    socket.on('chat:new-message', onNewMessage);
    socket.on('ai:status', onAiStatus);
    socket.on('chat:error', onChatError);
    return () => {
      socket.off('session:init-state', onInitState);
      socket.off('chat:new-message', onNewMessage);
      socket.off('ai:status', onAiStatus);
      socket.off('chat:error', onChatError);
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
      getSocket().emit('chat:send', { diagramId: id, text: trimmed, askAi });
      setInput('');
    } catch {
      setError('No se pudo guardar el diagrama antes de enviar el mensaje.');
    } finally {
      setSending(false);
    }
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

      <div className="chat-panel__messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-panel__empty">
            Todo el equipo ve este chat. Pregunta a la IA conceptos de ingeniería de software o pídele
            cambios al diagrama: siempre responde nombrando a quien preguntó.
          </div>
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

      <div className="chat-panel__input-row">
        <button
          type="button"
          className={`chat-panel__ai-toggle${askAi ? ' chat-panel__ai-toggle--on' : ''}`}
          onClick={() => setAskAi((v) => !v)}
          aria-pressed={askAi}
          title={askAi ? 'El mensaje se envía a la IA (todos ven la respuesta)' : 'Mensaje solo para el equipo (sin IA)'}
        >
          <Bot size={15} />
        </button>
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
          className="chat-panel__input"
          value={input}
          maxLength={2000}
          placeholder={askAi ? 'Pregunta a la IA… (todos lo verán)' : 'Escribe al equipo…'}
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
  const badge = message.providerUsed ? PROVIDER_BADGE[message.providerUsed] : undefined;
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
