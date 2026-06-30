import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Globe, Moon, Sun, ChevronDown, LogOut, Layers, ImageIcon, VideoIcon, AlertCircle } from 'lucide-react';
import ImageCard from './components/ImageCard';
import VideoCard from './components/VideoCard';
import AuthModal from './components/AuthModal';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
];

const CREDIT_COST_IMAGE = 3;
const CREDIT_COST_VIDEO = 6;
const MAX_CREDITS_GUEST = 20;
const MAX_CREDITS_USER = 80;
const MAX_SIZE_IMAGE = 60 * 1024 * 1024;   // 60 MB
const MAX_SIZE_VIDEO = 120 * 1024 * 1024;  // 120 MB

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function loadCredits(user) {
  const key = user ? `we_cr_${user.id}` : 'we_cr_guest';
  const max = user ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
  try {
    const s = JSON.parse(localStorage.getItem(key) || 'null');
    if (!s || s.date !== getTodayKey()) {
      return { remaining: max, used: 0, date: getTodayKey() };
    }
    return s;
  } catch {
    return { remaining: max, used: 0, date: getTodayKey() };
  }
}

function saveCredits(user, cr) {
  const key = user ? `we_cr_${user.id}` : 'we_cr_guest';
  try { localStorage.setItem(key, JSON.stringify(cr)); } catch {}
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark'; } catch { return false; }
  });
  const [lang, setLang] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('we_session') || 'null'); } catch { return null; }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [credits, setCredits] = useState(() => loadCredits(
    (() => { try { return JSON.parse(localStorage.getItem('we_session') || 'null'); } catch { return null; } })()
  ));
  const [uploadError, setUploadError] = useState('');

  const langRef = useRef(null);
  const userMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setCredits(loadCredits(user));
    if (!user) setBatchMode(false);
  }, [user]);

  // Auto-clear upload error after 4s
  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(''), 4000);
    return () => clearTimeout(t);
  }, [uploadError]);

  const handleAuth = (session) => {
    setUser(session);
    setShowAuth(false);
    setCredits(loadCredits(session));
  };

  const handleSignOut = () => {
    try { localStorage.removeItem('we_session'); } catch {}
    setUser(null);
    setCredits(loadCredits(null));
    setBatchMode(false);
    setUserMenuOpen(false);
  };

  const isVideo = (f) =>
    f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(f.name);
  const isImage = (f) =>
    f.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|bmp)$/i.test(f.name);

  const handleFiles = (incoming) => {
    setUploadError('');
    let candidates = Array.from(incoming).filter(f => isVideo(f) || isImage(f));
    if (!candidates.length) return;

    // Single mode: only first file
    if (!batchMode || !user) candidates = candidates.slice(0, 1);

    // Size check — filter out oversized, warn
    const errors = [];
    candidates = candidates.filter(f => {
      if (isImage(f) && f.size > MAX_SIZE_IMAGE) {
        errors.push(`"${f.name}" exceeds the 60 MB image limit.`);
        return false;
      }
      if (isVideo(f) && f.size > MAX_SIZE_VIDEO) {
        errors.push(`"${f.name}" exceeds the 120 MB video limit.`);
        return false;
      }
      return true;
    });
    if (errors.length) { setUploadError(errors[0]); }
    if (!candidates.length) return;

    // Credit check
    const cost = candidates.reduce((sum, f) =>
      sum + (isVideo(f) ? CREDIT_COST_VIDEO : CREDIT_COST_IMAGE), 0);

    if (cost > credits.remaining) {
      const max = user ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
      setUploadError(
        credits.remaining === 0
          ? 'You\'ve used all your credits for today. They reset at midnight.'
          : `Not enough credits — need ${cost}, you have ${credits.remaining} remaining.`
      );
      return;
    }

    // Deduct credits
    const newCredits = {
      remaining: credits.remaining - cost,
      used: credits.used + cost,
      date: getTodayKey(),
    };
    setCredits(newCredits);
    saveCredits(user, newCredits);

    const next = candidates.map(f => ({
      id: Date.now() + Math.random(),
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      isImage: isImage(f),
      isVideo: isVideo(f),
      originalUrl: URL.createObjectURL(f),
    }));
    setFiles(prev => [...prev, ...next]);
  };

  const refundCredits = (items) => {
    const refund = items.reduce((sum, f) =>
      sum + (f.isVideo ? CREDIT_COST_VIDEO : CREDIT_COST_IMAGE), 0);
    if (!refund) return;
    setCredits(prev => {
      const max = user ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
      const next = {
        remaining: Math.min(prev.remaining + refund, max),
        used: Math.max(prev.used - refund, 0),
        date: getTodayKey(),
      };
      saveCredits(user, next);
      return next;
    });
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item) {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        refundCredits([item]);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    refundCredits(files);
    files.forEach(f => { if (f.originalUrl) URL.revokeObjectURL(f.originalUrl); });
    setFiles([]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || [];
    const fs = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') fs.push(items[i].getAsFile());
    }
    if (fs.length) handleFiles(fs);
  };

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [credits, batchMode, user]);

  const videoCount = files.filter(f => f.isVideo).length;
  const imageCount = files.filter(f => f.isImage).length;
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const maxCredits = user ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
  const creditPct = Math.max(0, (credits.remaining / maxCredits) * 100);

  return (
    <div className="app-container" onDragEnter={handleDrag} onDragOver={handleDrag}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}

      {dragActive && (
        <div
          className="drag-overlay"
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="drag-overlay-card">
            <Upload size={44} />
            <h3>Drop files here</h3>
            <p>Images and Videos supported</p>
          </div>
        </div>
      )}

      <header className="main-header">
        <div className="header-container">
          <a href="#" className="brand" onClick={(e) => { e.preventDefault(); clearAll(); }}>
            <Sparkles fill="currentColor" />
            <span>WatermarkErase<span>AI</span></span>
          </a>

          <div className="nav-right">
            <div className="nav-lang-wrap" ref={langRef}>
              <button className="nav-lang-btn" onClick={() => setLangOpen(o => !o)} aria-label="Select language">
                <Globe size={14} />
                <span>{currentLang.label}</span>
                <ChevronDown size={12} className={langOpen ? 'chevron-open' : ''} />
              </button>
              {langOpen && (
                <div className="lang-dropdown">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      className={`lang-option${l.code === lang ? ' active' : ''}`}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="nav-icon-btn"
              onClick={() => setDarkMode(d => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <div className="nav-user-wrap" ref={userMenuRef}>
                <button className="nav-avatar-btn" onClick={() => setUserMenuOpen(o => !o)}>
                  {user.picture
                    ? <img src={user.picture} className="nav-avatar-img" alt={user.name} referrerPolicy="no-referrer" />
                    : <span className="nav-avatar">{user.avatar}</span>}
                  <span className="nav-user-name">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={12} className={userMenuOpen ? 'chevron-open' : ''} />
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-info">
                      <span className="user-dropdown-name">{user.name}</span>
                      <span className="user-dropdown-email">{user.email}</span>
                    </div>
                    <div className="user-dropdown-divider" />
                    <button className="user-dropdown-item danger" onClick={handleSignOut}>
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="nav-signin" onClick={() => setShowAuth(true)}>Sign In</button>
            )}
          </div>
        </div>
      </header>

      <main className="shell">
        <div className="hero-section">
          <div className="hero-badge">Online Tool</div>
          <h1>Remove Gemini Watermarks Online</h1>
          <p>
            Remove Gemini Sparkle, Gemini Omni, Google Flow, and AI Studio watermarks
            from images and videos instantly — right in your browser.
          </p>
        </div>

        {/* ── Mode + Quota Controls ── */}
        <div className="upload-controls">
          {/* Mode bar */}
          <div className="mode-bar">
            <div className="mode-pills">
              <button
                className={`mode-pill${!batchMode ? ' active' : ''}`}
                onClick={() => setBatchMode(false)}
              >
                <ImageIcon size={12} />
                Single
              </button>
              <button
                className={`mode-pill${batchMode ? ' active' : ''}${!user ? ' locked' : ''}`}
                onClick={() => user ? setBatchMode(true) : setShowAuth(true)}
              >
                <Layers size={12} />
                {user
                  ? 'Batch'
                  : <><span>Batch</span><span className="mode-lock-text"> — sign in to unlock</span></>
                }
              </button>
            </div>
            <div className="mode-meta">
              <span className="mode-size-info">Images 60 MB · MP4 120 MB</span>
              <span className="credit-tag">
                <ImageIcon size={11} /> Image — {CREDIT_COST_IMAGE} credits
              </span>
              <span className="credit-tag">
                <VideoIcon size={11} /> Video — {CREDIT_COST_VIDEO} credits
              </span>
            </div>
          </div>

          {/* Quota bar */}
          <div className="quota-bar">
            <div className="quota-top">
              <span className="quota-text">
                <span className="quota-label">{user ? 'Account' : 'Guest'} quota:</span>
                {' '}<strong>{maxCredits}</strong> / day
                <span className="quota-sep">·</span>
                Used <strong>{credits.used}</strong>
                <span className="quota-sep">·</span>
                Remaining{' '}
                <strong className={credits.remaining === 0 ? 'quota-zero' : credits.remaining <= 5 ? 'quota-low' : 'quota-ok'}>
                  {credits.remaining}
                </strong>
              </span>
              {!user && (
                <button className="quota-signin-btn" onClick={() => setShowAuth(true)}>
                  Sign in
                </button>
              )}
            </div>
            <div className="quota-progress">
              <div className="quota-progress-fill" style={{ width: `${creditPct}%` }} />
            </div>
            {!user && (
              <p className="quota-hint">
                Sign in to remove watermarks from more images and videos and unlock bulk processing &amp; downloads.
              </p>
            )}
          </div>

          {/* Upload error */}
          {uploadError && (
            <div className="upload-error-bar">
              <AlertCircle size={13} />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <div
          className={`uploader-box${dragActive ? ' dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="uploader-icon">
            <Upload size={22} />
          </div>
          <h3>Drop images/videos here</h3>
          <p>or click to browse &nbsp;·&nbsp; paste (Ctrl+V)</p>
          <div className="uploader-formats">
            <span>PNG</span><span>JPG</span><span>WebP</span><span>BMP</span><span>MP4</span>
          </div>
          <p style={{ fontSize: '11.5px', marginTop: '14px', color: 'var(--text-light)' }}>
            Everything processed locally — files never leave your browser.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple={batchMode && !!user}
            onChange={e => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>

        {/* File cards */}
        {files.length > 0 && (
          <div className="files-section">
            <div className="files-section-header">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {imageCount > 0 && (
                  <span className="files-count">{imageCount} image{imageCount !== 1 ? 's' : ''}</span>
                )}
                {videoCount > 0 && (
                  <span className="files-count">{videoCount} video{videoCount !== 1 ? 's' : ''}</span>
                )}
              </div>
              <button className="clear-btn" onClick={clearAll}>Clear All</button>
            </div>
            <div className="files-grid">
              {files.map(f =>
                f.isImage
                  ? <ImageCard key={f.id} item={f} onRemove={() => removeFile(f.id)} />
                  : <VideoCard key={f.id} item={f} onRemove={() => removeFile(f.id)} />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="main-footer">
        <p>
          &copy; 2026 WatermarkErase AI — Client-side processing via WebCodecs &amp; WebAssembly.
          Files never leave your device.
        </p>
      </footer>
    </div>
  );
}
