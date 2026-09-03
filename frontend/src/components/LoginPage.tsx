import { useState } from 'react';
import axios from 'axios';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export function LoginPage() {
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          mode === 'login'
            ? 'No se pudo iniciar sesión.'
            : 'No se pudo crear la cuenta.',
        ),
      );
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Diagramador UML</h1>
        <p className="login-card__subtitle">
          {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta para empezar'}
        </p>

        {mode === 'register' && (
          <label className="login-field">
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              minLength={2}
            />
          </label>
        )}

        <label className="login-field">
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            required
          />
        </label>

        <label className="login-field">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={mode === 'register' ? 8 : undefined}
          />
        </label>

        {error && <p className="login-card__error">{error}</p>}

        <button type="submit" className="login-card__submit" disabled={loading}>
          {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
          {loading
            ? 'Un momento…'
            : mode === 'login'
              ? 'Iniciar sesión'
              : 'Crear cuenta'}
        </button>

        <button
          type="button"
          className="login-card__switch"
          onClick={() => {
            setError(null);
            setMode((m) => (m === 'login' ? 'register' : 'login'));
          }}
        >
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </form>
    </div>
  );
}
