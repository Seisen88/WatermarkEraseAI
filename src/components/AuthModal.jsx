import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = '617067144053-qlbuu7secchcttqs2ouhv22l1d2psvi1.apps.googleusercontent.com';

const isGmail = (email) => /^[^\s@]+@gmail\.com$/i.test(email.trim());

export default function AuthModal({ onClose, onAuth }) {
  const [tab, setTab] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const backdropRef = useRef(null);
  const tokenClientRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const init = () => {
      if (!window.google?.accounts?.oauth2) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setError('Google sign-in was cancelled or failed.');
            setGoogleLoading(false);
            return;
          }
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            if (!res.ok) throw new Error('Profile fetch failed');
            const profile = await res.json();
            const user = {
              id: `google_${profile.sub}`,
              name: profile.name || profile.email,
              email: profile.email,
              avatar: (profile.name || profile.email)[0].toUpperCase(),
              picture: profile.picture || null,
              googleAuth: true,
            };
            try { localStorage.setItem('we_session', JSON.stringify(user)); } catch {}
            onAuth(user);
          } catch {
            setError('Could not load your Google profile. Please try again.');
            setGoogleLoading(false);
          }
        },
      });
    };

    if (window.google?.accounts?.oauth2) {
      init();
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.oauth2) { clearInterval(t); init(); }
      }, 150);
      return () => clearInterval(t);
    }
  }, []);

  const handleGoogleClick = () => {
    if (!tokenClientRef.current) {
      setError('Google Sign-In is still loading. Please try again.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
  };

  const getAccounts = () => {
    try { return JSON.parse(localStorage.getItem('we_accounts') || '[]'); } catch { return []; }
  };
  const saveAccounts = (a) => {
    try { localStorage.setItem('we_accounts', JSON.stringify(a)); } catch {}
  };

  const validate = () => {
    if (tab === 'signup' && !name.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!isGmail(email)) return 'Please use a Gmail address (you@gmail.com).';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);

    setTimeout(() => {
      const accounts = getAccounts();
      if (tab === 'signup') {
        const exists = accounts.find(a => a.email === email.trim().toLowerCase());
        if (exists) { setError('An account with this Gmail already exists.'); setLoading(false); return; }
        const user = {
          id: Date.now(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          avatar: name.trim()[0].toUpperCase(),
          picture: null,
          googleAuth: false,
        };
        saveAccounts([...accounts, user]);
        const session = { id: user.id, name: user.name, email: user.email, avatar: user.avatar, picture: null };
        try { localStorage.setItem('we_session', JSON.stringify(session)); } catch {}
        onAuth(session);
      } else {
        const user = accounts.find(a => a.email === email.trim().toLowerCase());
        if (!user) { setError('No account found with this Gmail address.'); setLoading(false); return; }
        if (user.googleAuth) { setError('This account uses Google sign-in. Use the button above.'); setLoading(false); return; }
        if (user.password !== password) { setError('Incorrect password.'); setLoading(false); return; }
        const session = { id: user.id, name: user.name, email: user.email, avatar: user.avatar, picture: null };
        try { localStorage.setItem('we_session', JSON.stringify(session)); } catch {}
        onAuth(session);
      }
      setLoading(false);
    }, 350);
  };

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div
      className="auth-backdrop"
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Sparkles size={18} fill="currentColor" />
          </div>
          <span>WatermarkErase<b>AI</b></span>
        </div>

        <h2 className="auth-title">
          {tab === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="auth-subtitle">
          {tab === 'signin'
            ? 'Sign in to continue removing watermarks'
            : 'Get started — it\'s free'}
        </p>

        <button
          className="google-btn"
          onClick={handleGoogleClick}
          disabled={googleLoading}
          type="button"
        >
          {googleLoading ? <span className="auth-spinner google-spinner" /> : <GoogleSVG />}
          <span>{googleLoading ? 'Connecting…' : 'Continue with Google'}</span>
        </button>

        <div className="auth-divider"><span>or</span></div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => switchTab('signin')}>
            Sign In
          </button>
          <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => switchTab('signup')}>
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {tab === 'signup' && (
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-wrap">
                <User size={14} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label>Gmail Address</label>
            <div className="auth-input-wrap">
              <Mail size={14} className="auth-input-icon" />
              <input
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus={tab === 'signin'}
                autoComplete="email"
              />
            </div>
            {email.length > 4 && !isGmail(email) && (
              <p className="auth-field-hint">Must be a @gmail.com address</p>
            )}
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={14} className="auth-input-icon" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={13} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading && <span className="auth-spinner" />}
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          {tab === 'signin'
            ? <><span>No account? </span><button onClick={() => switchTab('signup')}>Sign up free</button></>
            : <><span>Already have an account? </span><button onClick={() => switchTab('signin')}>Sign in</button></>
          }
        </p>
      </div>
    </div>
  );
}

function GoogleSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
