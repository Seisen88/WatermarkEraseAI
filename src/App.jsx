import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Sparkles, Globe, Moon, Sun, ChevronDown, LogOut,
  Layers, ImageIcon, VideoIcon, AlertCircle, Download,
  Shield, Zap, Lock, CheckCircle, User
} from 'lucide-react';
import ImageCard from './components/ImageCard';
import VideoCard from './components/VideoCard';
import AuthModal from './components/AuthModal';
import AccountModal from './components/AccountModal';
import PolicyModal from './components/PolicyModal';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
];

const TRANSLATIONS = {
  en: {
    hero_title: 'Remove Gemini Watermarks Online',
    hero_sub: 'Remove Gemini Sparkle, Gemini Omni, Google Flow, and AI Studio watermarks from images and videos instantly — right in your browser.',
    upload_title: 'Drop images/videos here',
    upload_sub: 'or click to browse · paste (Ctrl+V)',
    sign_in: 'Sign In',
    single: 'Single',
    batch: 'Batch',
    save: 'Save',
    clear_all: 'Clear All',
    download_all: 'Download All',
    how_title: 'How it works',
    step1_title: 'Upload',
    step1_body: 'Drag & drop, paste, or browse your image or video file.',
    step2_title: 'Remove',
    step2_body: 'Our AI detects and removes the Gemini watermark locally in your browser.',
    step3_title: 'Download',
    step3_body: 'Save the clean file as PNG or MP4 — no quality loss.',
    feat1_title: '100% Private',
    feat1_body: 'Files never leave your device. All processing happens in your browser.',
    feat2_title: 'Instant Results',
    feat2_body: 'No uploads, no waiting. Watermarks removed in seconds.',
    feat3_title: 'Free to Use',
    feat3_body: '12 free removals per day. Sign in for 80 per day.',
    badge: 'Online Tool',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    footer: '© 2026 WatermarkErase AI — Files never leave your device.',
  },
  es: {
    hero_title: 'Eliminar marcas de agua de Gemini',
    hero_sub: 'Elimina marcas de agua de Gemini Sparkle, Gemini Omni, Google Flow y AI Studio de imágenes y vídeos al instante.',
    upload_title: 'Suelta imágenes/vídeos aquí',
    upload_sub: 'o haz clic para explorar · pegar (Ctrl+V)',
    sign_in: 'Iniciar sesión',
    single: 'Individual',
    batch: 'Lote',
    save: 'Guardar',
    clear_all: 'Borrar todo',
    download_all: 'Descargar todo',
    how_title: 'Cómo funciona',
    step1_title: 'Sube',
    step1_body: 'Arrastra, pega o selecciona tu imagen o vídeo.',
    step2_title: 'Elimina',
    step2_body: 'La IA detecta y elimina la marca de agua localmente en tu navegador.',
    step3_title: 'Descarga',
    step3_body: 'Guarda el archivo limpio como PNG o MP4.',
    feat1_title: '100% Privado',
    feat1_body: 'Los archivos nunca salen de tu dispositivo.',
    feat2_title: 'Resultados instantáneos',
    feat2_body: 'Sin subidas, sin espera. Marcas eliminadas en segundos.',
    feat3_title: 'Gratis',
    feat3_body: '12 eliminaciones gratis al día. Inicia sesión para 80.',
    badge: 'Herramienta online',
    privacy: 'Política de privacidad',
    terms: 'Términos de servicio',
    footer: '© 2026 WatermarkErase AI — Los archivos nunca salen de tu dispositivo.',
  },
  fr: {
    hero_title: 'Supprimer les filigranes Gemini',
    hero_sub: 'Supprimez les filigranes Gemini Sparkle, Gemini Omni, Google Flow et AI Studio de vos images et vidéos instantanément.',
    upload_title: 'Déposez images/vidéos ici',
    upload_sub: 'ou cliquez pour parcourir · coller (Ctrl+V)',
    sign_in: 'Se connecter',
    single: 'Unique',
    batch: 'Lot',
    save: 'Enregistrer',
    clear_all: 'Tout effacer',
    download_all: 'Tout télécharger',
    how_title: 'Comment ça marche',
    step1_title: 'Téléversez',
    step1_body: 'Glissez-déposez, collez ou parcourez votre fichier image ou vidéo.',
    step2_title: 'Supprimez',
    step2_body: "L'IA détecte et supprime le filigrane localement dans votre navigateur.",
    step3_title: 'Téléchargez',
    step3_body: 'Sauvegardez le fichier propre en PNG ou MP4.',
    feat1_title: '100% Privé',
    feat1_body: 'Les fichiers ne quittent jamais votre appareil.',
    feat2_title: 'Résultats instantanés',
    feat2_body: 'Pas de téléversement, pas d\'attente.',
    feat3_title: 'Gratuit',
    feat3_body: '12 suppressions gratuites par jour. Connectez-vous pour 80.',
    badge: 'Outil en ligne',
    privacy: 'Politique de confidentialité',
    terms: "Conditions d'utilisation",
    footer: '© 2026 WatermarkErase AI — Les fichiers restent sur votre appareil.',
  },
  de: {
    hero_title: 'Gemini-Wasserzeichen online entfernen',
    hero_sub: 'Entfernen Sie Gemini Sparkle, Gemini Omni, Google Flow und AI Studio Wasserzeichen sofort aus Bildern und Videos.',
    upload_title: 'Bilder/Videos hier ablegen',
    upload_sub: 'oder klicken zum Durchsuchen · einfügen (Strg+V)',
    sign_in: 'Anmelden',
    single: 'Einzeln',
    batch: 'Stapel',
    save: 'Speichern',
    clear_all: 'Alle löschen',
    download_all: 'Alle herunterladen',
    how_title: 'So funktioniert es',
    step1_title: 'Hochladen',
    step1_body: 'Ziehen Sie Ihre Bild- oder Videodatei per Drag & Drop.',
    step2_title: 'Entfernen',
    step2_body: 'KI erkennt und entfernt das Wasserzeichen lokal in Ihrem Browser.',
    step3_title: 'Herunterladen',
    step3_body: 'Speichern Sie die saubere Datei als PNG oder MP4.',
    feat1_title: '100% Privat',
    feat1_body: 'Dateien verlassen niemals Ihr Gerät.',
    feat2_title: 'Sofortige Ergebnisse',
    feat2_body: 'Kein Hochladen, kein Warten.',
    feat3_title: 'Kostenlos',
    feat3_body: '12 kostenlose Entfernungen pro Tag. Anmelden für 80.',
    badge: 'Online-Tool',
    privacy: 'Datenschutzrichtlinie',
    terms: 'Nutzungsbedingungen',
    footer: '© 2026 WatermarkErase AI — Dateien bleiben auf Ihrem Gerät.',
  },
  zh: {
    hero_title: '在线去除 Gemini 水印',
    hero_sub: '即时从图片和视频中去除 Gemini Sparkle、Gemini Omni、Google Flow 和 AI Studio 水印，直接在浏览器中完成。',
    upload_title: '将图片/视频拖放到此处',
    upload_sub: '或点击浏览文件 · 粘贴 (Ctrl+V)',
    sign_in: '登录',
    single: '单个',
    batch: '批量',
    save: '保存',
    clear_all: '清除全部',
    download_all: '全部下载',
    how_title: '使用方法',
    step1_title: '上传',
    step1_body: '拖放、粘贴或选择您的图片或视频文件。',
    step2_title: '去除',
    step2_body: 'AI 在您的浏览器中本地检测并去除 Gemini 水印。',
    step3_title: '下载',
    step3_body: '将干净的文件保存为 PNG 或 MP4。',
    feat1_title: '100% 私密',
    feat1_body: '文件永远不会离开您的设备。',
    feat2_title: '即时结果',
    feat2_body: '无需上传，无需等待，几秒内去除水印。',
    feat3_title: '免费使用',
    feat3_body: '每天 12 次免费去除。登录后每天 80 次。',
    badge: '在线工具',
    privacy: '隐私政策',
    terms: '服务条款',
    footer: '© 2026 WatermarkErase AI — 文件永远不会离开您的设备。',
  },
  ja: {
    hero_title: 'Gemini 透かしをオンラインで削除',
    hero_sub: 'Gemini Sparkle、Gemini Omni、Google Flow、AI Studio の透かしを画像や動画から即座に削除。ブラウザだけで完結。',
    upload_title: '画像/動画をここにドロップ',
    upload_sub: 'またはクリックしてファイルを選択 · 貼り付け (Ctrl+V)',
    sign_in: 'サインイン',
    single: '単体',
    batch: 'バッチ',
    save: '保存',
    clear_all: 'すべてクリア',
    download_all: 'すべてダウンロード',
    how_title: '使い方',
    step1_title: 'アップロード',
    step1_body: '画像や動画ファイルをドラッグ＆ドロップまたは貼り付け。',
    step2_title: '削除',
    step2_body: 'AIがブラウザ内でローカルにGemini透かしを検出・削除。',
    step3_title: 'ダウンロード',
    step3_body: 'クリーンなファイルをPNGまたはMP4で保存。',
    feat1_title: '完全プライベート',
    feat1_body: 'ファイルはデバイスから外に出ません。',
    feat2_title: '即座に完了',
    feat2_body: 'アップロード不要、待ち時間なし。',
    feat3_title: '無料で使用',
    feat3_body: '1日12回無料。サインインで80回。',
    badge: 'オンラインツール',
    privacy: 'プライバシーポリシー',
    terms: '利用規約',
    footer: '© 2026 WatermarkErase AI — ファイルはデバイスに留まります。',
  },
};

const CREDIT_COST_IMAGE = 3;
const CREDIT_COST_VIDEO = 6;
const MAX_CREDITS_GUEST = 12;
const MAX_CREDITS_USER = 80;
const MAX_SIZE_IMAGE = 60 * 1024 * 1024;
const MAX_SIZE_VIDEO = 120 * 1024 * 1024;

// In local dev, Vercel serverless functions aren't available — use localStorage instead
const IS_DEV = import.meta.env.DEV;

function getTodayKey() { return new Date().toISOString().split('T')[0]; }

function localLoad(user) {
  const key = user ? `we_cr_${user.id}` : 'we_cr_guest';
  const max = user ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
  try {
    const s = JSON.parse(localStorage.getItem(key) || 'null');
    if (!s || s.date !== getTodayKey()) return { remaining: max, used: 0 };
    return s;
  } catch { return { remaining: max, used: 0 }; }
}

function localSave(user, cr) {
  const key = user ? `we_cr_${user.id}` : 'we_cr_guest';
  try { localStorage.setItem(key, JSON.stringify({ ...cr, date: getTodayKey() })); } catch {}
}

function creditHeaders(user) {
  const h = { 'Content-Type': 'application/json' };
  if (user?.id) h['x-user-id'] = String(user.id);
  return h;
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
  const [showAccount, setShowAccount] = useState(false);
  const [showPolicy, setShowPolicy] = useState(null); // 'privacy' | 'terms' | null
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('we_session') || 'null'); } catch { return null; }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [credits, setCredits] = useState({ remaining: null, used: 0 });
  const [uploadError, setUploadError] = useState('');

  const langRef = useRef(null);
  const userMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;

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

  const fetchCredits = async (u) => {
    if (IS_DEV) { setCredits(localLoad(u)); return; }
    try {
      const res = await fetch('/api/credits', { headers: creditHeaders(u) });
      if (res.ok) setCredits(await res.json());
    } catch {
      setCredits(localLoad(u));
    }
  };

  const callDeduct = async (cost) => {
    if (IS_DEV) {
      const cur = localLoad(user);
      if (cost > cur.remaining) throw new Error(
        cur.remaining === 0
          ? 'You\'ve used all your credits for today. They reset at midnight.'
          : `Not enough credits — need ${cost}, you have ${cur.remaining} remaining.`
      );
      const next = { remaining: cur.remaining - cost, used: cur.used + cost };
      localSave(user, next);
      setCredits(next);
      return next;
    }
    const res = await fetch('/api/credits', {
      method: 'POST',
      headers: creditHeaders(user),
      body: JSON.stringify({ action: 'deduct', cost }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Not enough credits.');
    setCredits(data);
    return data;
  };

  const callRefund = async (cost) => {
    if (IS_DEV) {
      const cur = localLoad(user);
      const max = user ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
      const next = { remaining: Math.min(cur.remaining + cost, max), used: Math.max(cur.used - cost, 0) };
      localSave(user, next);
      setCredits(next);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: creditHeaders(user),
        body: JSON.stringify({ action: 'refund', cost }),
      });
      if (res.ok) setCredits(await res.json());
    } catch { }
  };

  useEffect(() => {
    fetchCredits(user);
    if (!user) setBatchMode(false);
  }, [user]);

  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(''), 4000);
    return () => clearTimeout(t);
  }, [uploadError]);

  const handleAuth = (session) => {
    setUser(session);
    setShowAuth(false);
    fetchCredits(session);
  };

  const handleSignOut = () => {
    try { localStorage.removeItem('we_session'); } catch {}
    setUser(null);
    fetchCredits(null);
    setBatchMode(false);
    setUserMenuOpen(false);
    setShowAccount(false);
  };

  const isVideo = (f) => f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(f.name);
  const isImage = (f) => f.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|bmp)$/i.test(f.name);

  const markDone = (id, blob, filename) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, processed: true, processedBlob: blob, processedFilename: filename } : f
    ));
  };

  const refundCredits = (items) => {
    const cost = items
      .filter(f => !f.processed)
      .reduce((sum, f) => sum + (f.isVideo ? CREDIT_COST_VIDEO : CREDIT_COST_IMAGE), 0);
    if (cost) callRefund(cost);
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

  const downloadAll = () => {
    files
      .filter(f => f.processed && f.processedBlob)
      .forEach(f => {
        const url = URL.createObjectURL(f.processedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.processedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
  };

  const handleFiles = async (incoming) => {
    setUploadError('');
    let candidates = Array.from(incoming).filter(f => isVideo(f) || isImage(f));
    if (!candidates.length) return;

    if (!batchMode || !user) candidates = candidates.slice(0, 1);

    const errors = [];
    candidates = candidates.filter(f => {
      if (isImage(f) && f.size > MAX_SIZE_IMAGE) { errors.push(`"${f.name}" exceeds the 60 MB image limit.`); return false; }
      if (isVideo(f) && f.size > MAX_SIZE_VIDEO) { errors.push(`"${f.name}" exceeds the 120 MB video limit.`); return false; }
      return true;
    });
    if (errors.length) setUploadError(errors[0]);
    if (!candidates.length) return;

    const cost = candidates.reduce((sum, f) =>
      sum + (isVideo(f) ? CREDIT_COST_VIDEO : CREDIT_COST_IMAGE), 0);

    try {
      await callDeduct(cost);
    } catch (err) {
      setUploadError(err.message);
      return;
    }

    const next = candidates.map(f => ({
      id: Date.now() + Math.random(),
      file: f, name: f.name, size: f.size, type: f.type,
      isImage: isImage(f), isVideo: isVideo(f),
      originalUrl: URL.createObjectURL(f),
    }));
    setFiles(prev => [...prev, ...next]);
  };

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); };
  const handlePaste = (e) => {
    const fs = [];
    for (let i = 0; i < (e.clipboardData?.items || []).length; i++) {
      if (e.clipboardData.items[i].kind === 'file') fs.push(e.clipboardData.items[i].getAsFile());
    }
    if (fs.length) handleFiles(fs);
  };

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [batchMode, user]);

  const videoCount = files.filter(f => f.isVideo).length;
  const imageCount = files.filter(f => f.isImage).length;
  const doneCount = files.filter(f => f.processed).length;
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const maxCredits = user ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
  const creditsLoaded = credits.remaining !== null;
  const creditPct = creditsLoaded ? Math.max(0, (credits.remaining / maxCredits) * 100) : 100;

  return (
    <div className="app-container" onDragEnter={handleDrag} onDragOver={handleDrag}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}
      {showAccount && user && (
        <AccountModal
          user={user}
          credits={credits}
          maxCredits={maxCredits}
          onClose={() => setShowAccount(false)}
          onSignOut={handleSignOut}
        />
      )}
      {showPolicy && <PolicyModal type={showPolicy} onClose={() => setShowPolicy(null)} />}

      {dragActive && (
        <div className="drag-overlay" onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
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
              <button className="nav-lang-btn" onClick={() => setLangOpen(o => !o)}>
                <Globe size={14} />
                <span>{currentLang.label}</span>
                <ChevronDown size={12} className={langOpen ? 'chevron-open' : ''} />
              </button>
              {langOpen && (
                <div className="lang-dropdown">
                  {LANGUAGES.map(l => (
                    <button key={l.code} className={`lang-option${l.code === lang ? ' active' : ''}`}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="nav-icon-btn" onClick={() => setDarkMode(d => !d)}>
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
                    <button className="user-dropdown-item" onClick={() => { setShowAccount(true); setUserMenuOpen(false); }}>
                      <User size={13} /> My Account
                    </button>
                    <button className="user-dropdown-item danger" onClick={handleSignOut}>
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="nav-signin" onClick={() => setShowAuth(true)}>{t('sign_in')}</button>
            )}
          </div>
        </div>
      </header>

      <main className="shell">
        <div className="hero-section">
          <div className="hero-badge">{t('badge')}</div>
          <h1>{t('hero_title')}</h1>
          <p>{t('hero_sub')}</p>
        </div>

        {/* Mode + Quota Controls */}
        <div className="upload-controls">
          <div className="mode-bar">
            <div className="mode-pills">
              <button className={`mode-pill${!batchMode ? ' active' : ''}`} onClick={() => setBatchMode(false)}>
                <ImageIcon size={12} /> {t('single')}
              </button>
              <button
                className={`mode-pill${batchMode ? ' active' : ''}${!user ? ' locked' : ''}`}
                onClick={() => user ? setBatchMode(true) : setShowAuth(true)}
              >
                <Layers size={12} />
                {user ? t('batch') : <><span>{t('batch')}</span><span className="mode-lock-text"> — sign in to unlock</span></>}
              </button>
            </div>
            <div className="mode-meta">
              <span className="mode-size-info">Images 60 MB · MP4 120 MB</span>
              <span className="credit-tag"><ImageIcon size={11} /> Image — {CREDIT_COST_IMAGE} credits</span>
              <span className="credit-tag"><VideoIcon size={11} /> Video — {CREDIT_COST_VIDEO} credits</span>
            </div>
          </div>

          <div className="quota-bar">
            <div className="quota-top">
              <span className="quota-text">
                <span className="quota-label">{user ? 'Account' : 'Guest'} quota:</span>
                {' '}<strong>{maxCredits}</strong> / day
                <span className="quota-sep">·</span>
                Used <strong>{creditsLoaded ? credits.used : '…'}</strong>
                <span className="quota-sep">·</span>
                Remaining{' '}
                <strong className={!creditsLoaded ? '' : credits.remaining === 0 ? 'quota-zero' : credits.remaining <= 5 ? 'quota-low' : 'quota-ok'}>
                  {creditsLoaded ? credits.remaining : '…'}
                </strong>
              </span>
              {!user && (
                <button className="quota-signin-btn" onClick={() => setShowAuth(true)}>{t('sign_in')}</button>
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
          onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
        >
          <div className="uploader-icon"><Upload size={22} /></div>
          <h3>{t('upload_title')}</h3>
          <p>{t('upload_sub')}</p>
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
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {imageCount > 0 && <span className="files-count">{imageCount} image{imageCount !== 1 ? 's' : ''}</span>}
                {videoCount > 0 && <span className="files-count">{videoCount} video{videoCount !== 1 ? 's' : ''}</span>}
                {doneCount > 0 && <span className="files-count done-count"><CheckCircle size={11} /> {doneCount} done</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {doneCount > 1 && user && (
                  <button className="download-all-btn" onClick={downloadAll}>
                    <Download size={13} /> {t('download_all')}
                  </button>
                )}
                <button className="clear-btn" onClick={clearAll}>{t('clear_all')}</button>
              </div>
            </div>
            <div className="files-grid">
              {files.map(f =>
                f.isImage
                  ? <ImageCard key={f.id} item={f} onRemove={() => removeFile(f.id)} onDone={(blob, fn) => markDone(f.id, blob, fn)} />
                  : <VideoCard key={f.id} item={f} onRemove={() => removeFile(f.id)} onDone={(blob, fn) => markDone(f.id, blob, fn)} />
              )}
            </div>
          </div>
        )}

        {/* How it works */}
        <section className="landing-section">
          <h2 className="landing-section-title">{t('how_title')}</h2>
          <div className="steps-grid">
            {[
              { num: '1', title: t('step1_title'), body: t('step1_body'), icon: <Upload size={20} /> },
              { num: '2', title: t('step2_title'), body: t('step2_body'), icon: <Sparkles size={20} fill="currentColor" /> },
              { num: '3', title: t('step3_title'), body: t('step3_body'), icon: <Download size={20} /> },
            ].map(s => (
              <div className="step-card" key={s.num}>
                <div className="step-num">{s.num}</div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="landing-section">
          <div className="features-grid">
            {[
              { icon: <Lock size={22} />, title: t('feat1_title'), body: t('feat1_body') },
              { icon: <Zap size={22} />, title: t('feat2_title'), body: t('feat2_body') },
              { icon: <Shield size={22} />, title: t('feat3_title'), body: t('feat3_body') },
            ].map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="main-footer">
        <p>{t('footer')}</p>
        <div className="footer-links">
          <button onClick={() => setShowPolicy('privacy')}>{t('privacy')}</button>
          <span>·</span>
          <button onClick={() => setShowPolicy('terms')}>{t('terms')}</button>
        </div>
      </footer>
    </div>
  );
}
