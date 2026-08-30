import { useState } from 'react';
import { sendChatMessage } from '../api/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error al contactar al asistente.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

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
      </div>
      <div className="chat-panel__input-row">
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
