import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Globe, Moon, Sun, ChevronDown, LogOut } from 'lucide-react';
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
  const langRef = useRef(null);
  const userMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Apply dark mode to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAuth = (session) => {
    setUser(session);
    setShowAuth(false);
  };

  const handleSignOut = () => {
    try { localStorage.removeItem('we_session'); } catch {}
    setUser(null);
    setUserMenuOpen(false);
  };

  const isVideo = (f) =>
    f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(f.name);
  const isImage = (f) =>
    f.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|bmp)$/i.test(f.name);

  const handleFiles = (incoming) => {
    const next = Array.from(incoming)
      .filter(f => isVideo(f) || isImage(f))
      .map(f => ({
        id: Date.now() + Math.random(),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        isImage: isImage(f),
        isVideo: isVideo(f),
        originalUrl: URL.createObjectURL(f)
      }));
    if (next.length) setFiles(prev => [...prev, ...next]);
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item?.originalUrl) URL.revokeObjectURL(item.originalUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
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
  }, []);

  const videoCount = files.filter(f => f.isVideo).length;
  const imageCount = files.filter(f => f.isImage).length;
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

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
          {/* Brand */}
          <a
            href="#"
            className="brand"
            onClick={(e) => { e.preventDefault(); clearAll(); }}
          >
            <Sparkles fill="currentColor" />
            <span>WatermarkErase<span>AI</span></span>
          </a>

          {/* Nav right */}
          <div className="nav-right">
            {/* Language picker */}
            <div className="nav-lang-wrap" ref={langRef}>
              <button
                className="nav-lang-btn"
                onClick={() => setLangOpen(o => !o)}
                aria-label="Select language"
              >
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

            {/* Dark mode toggle */}
            <button
              className="nav-icon-btn"
              onClick={() => setDarkMode(d => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* User / Sign In */}
            {user ? (
              <div className="nav-user-wrap" ref={userMenuRef}>
                <button
                  className="nav-avatar-btn"
                  onClick={() => setUserMenuOpen(o => !o)}
                  aria-label="User menu"
                >
                  {user.picture
                    ? <img src={user.picture} className="nav-avatar-img" alt={user.name} referrerPolicy="no-referrer" />
                    : <span className="nav-avatar">{user.avatar}</span>
                  }
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
              <button className="nav-signin" onClick={() => setShowAuth(true)}>
                Sign In
              </button>
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

        {/* Upload Zone */}
        <div
          className={`uploader-box ${dragActive ? 'dragging' : ''}`}
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
          <p>or click to browse files &nbsp;·&nbsp; paste (Ctrl+V)</p>
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
            multiple
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
                  <span className="files-count">
                    {imageCount} image{imageCount !== 1 ? 's' : ''}
                  </span>
                )}
                {videoCount > 0 && (
                  <span className="files-count">
                    {videoCount} video{videoCount !== 1 ? 's' : ''}
                  </span>
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
