/**
 * LoginPage — authentication gate.
 *
 * Shown when the user is not authenticated. Supports Sign In and Register.
 * On success, AuthContext is updated and the protected app renders.
 *
 * Design: matches existing light Apple-inspired glassmorphic theme.
 * No mock fallbacks — real errors are surfaced to the user.
 */
import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

type Mode = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (mode === 'register' && password.trim().length < 12) {
      setErrorMessage('Password must be at least 12 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, fullName.trim() || undefined);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.userMessage);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setErrorMessage(null);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, hsl(210 40% 98%) 0%, hsl(214 32% 93%) 50%, hsl(220 30% 95%) 100%)',
      }}
    >
      {/* Decorative blurred orbs */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-5%',
            width: '40vw',
            height: '40vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(42,157,143,0.10) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-5%',
            width: '35vw',
            height: '35vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(105,56,239,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-md"
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(41, 56, 77, 0.10), 0 4px 16px rgba(41, 56, 77, 0.06)',
          padding: '40px 40px 36px',
        }}
      >
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(42,157,143,0.18) 0%, rgba(105,56,239,0.12) 100%)',
              border: '1px solid rgba(42,157,143,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={22} style={{ color: '#2A9D8F' }} />
          </div>
          <div className="text-center">
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#29384D',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              PQC Security Platform
            </h1>
            <p style={{ fontSize: 13, color: '#687587', marginTop: 4 }}>
              {mode === 'login'
                ? 'Sign in to your account'
                : 'Create a new account'}
            </p>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]"
            style={{
              background: 'rgba(220, 38, 38, 0.07)',
              border: '1px solid rgba(220, 38, 38, 0.20)',
              color: '#b91c1c',
            }}
          >
            <AlertCircle size={15} className="mt-px shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-fullname"
                style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}
              >
                Full Name (optional)
              </label>
              <input
                id="auth-fullname"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                disabled={isSubmitting}
                style={{
                  height: 38,
                  borderRadius: 10,
                  border: '1px solid rgba(226, 232, 240, 0.95)',
                  background: 'rgba(255,255,255,0.85)',
                  padding: '0 12px',
                  fontSize: 13,
                  color: '#29384D',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2A9D8F')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(226, 232, 240, 0.95)')}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-email"
              style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@organisation.io"
              disabled={isSubmitting}
              style={{
                height: 38,
                borderRadius: 10,
                border: '1px solid rgba(226, 232, 240, 0.95)',
                background: 'rgba(255,255,255,0.85)',
                padding: '0 12px',
                fontSize: 13,
                color: '#29384D',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2A9D8F')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(226, 232, 240, 0.95)')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-password"
              style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}
            >
              Password {mode === 'register' && <span style={{ fontWeight: 400, color: '#94a3b8' }}>(min 12 characters)</span>}
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 12 characters' : '••••••••'}
                disabled={isSubmitting}
                style={{
                  height: 38,
                  width: '100%',
                  borderRadius: 10,
                  border: '1px solid rgba(226, 232, 240, 0.95)',
                  background: 'rgba(255,255,255,0.85)',
                  padding: '0 38px 0 12px',
                  fontSize: 13,
                  color: '#29384D',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2A9D8F')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(226, 232, 240, 0.95)')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 4,
              height: 40,
              borderRadius: 10,
              background: isSubmitting
                ? 'rgba(42,157,143,0.50)'
                : 'linear-gradient(135deg, #2A9D8F 0%, #237F74 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            {isSubmitting
              ? mode === 'login'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        {/* Mode switcher */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#687587',
            marginTop: 20,
          }}
        >
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            id="auth-mode-toggle"
            type="button"
            onClick={switchMode}
            style={{
              color: '#2A9D8F',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: 12,
            }}
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
