import { useState } from 'react';
import { editDiagramWithAi } from '../api/client';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { DiagramOperation, UmlModel } from '../types/uml';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatPanelProps {
  model: UmlModel;
  onApplyOperations: (operations: DiagramOperation[]) => void;
}

export function ChatPanel({ model, onApplyOperations }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);
    try {
      const { reply, operations } = await editDiagramWithAi(trimmed, model);
      if (operations.length > 0) {
        onApplyOperations(operations);
      }
      const suffix =
        operations.length > 0
          ? ` (${operations.length} cambio${operations.length === 1 ? '' : 's'} aplicado${
              operations.length === 1 ? '' : 's'
            } al diagrama)`
          : '';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `${reply}${suffix}` },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error al contactar al asistente.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    await sendText(input);
  }

  const { isSupported: voiceSupported, isListening, start: startListening } =
    useSpeechRecognition({
      lang: 'es-ES',
      onResult: (transcript) => {
        void sendText(transcript);
      },
    });

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSend();
  }

  return (
    <aside className="chat-panel">
      <div className="chat-panel__header">Asistente de Ingeniería de Software</div>
      <div className="chat-panel__messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-panel__message chat-panel__message--${m.role}`}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="chat-panel__message chat-panel__message--assistant">
            Pensando…
          </div>
        )}
        {isListening && (
          <div className="chat-panel__message chat-panel__message--assistant">
            🎤 Escuchando…
          </div>
        )}
      </div>
      <div className="chat-panel__input-row">
        {voiceSupported && (
          <button
            type="button"
            className={`chat-panel__mic${isListening ? ' chat-panel__mic--active' : ''}`}
            onClick={startListening}
            disabled={isListening || loading}
            title="Dictar comando por voz"
          >
            🎤
          </button>
        )}
        <input
          className="chat-panel__input"
          value={input}
          placeholder='Ej: "crea dos clases relacionadas"'
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="chat-panel__send" onClick={() => void handleSend()}>
          Enviar
        </button>
      </div>
    </aside>
  );
}
