import React, { useEffect, useRef } from 'react';
import { X, LogOut, Sparkles, Zap } from 'lucide-react';

export default function AccountModal({ user, credits, maxCredits, onClose, onSignOut }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const used = credits?.used ?? 0;
  const remaining = credits?.remaining ?? maxCredits;
  const pct = Math.max(0, (remaining / maxCredits) * 100);

  return (
    <div
      className="auth-backdrop"
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="auth-modal account-modal">
        <button className="auth-close" onClick={onClose}><X size={16} /></button>

        {/* Profile */}
        <div className="acct-profile">
          {user.picture
            ? <img src={user.picture} className="acct-avatar-img" alt={user.name} referrerPolicy="no-referrer" />
            : <div className="acct-avatar-letter">{user.avatar}</div>
          }
          <div>
            <p className="acct-name">{user.name}</p>
            <p className="acct-email">{user.email}</p>
          </div>
        </div>

        {/* Credits */}
        <div className="acct-credits-box">
          <div className="acct-credits-header">
            <span className="acct-credits-label"><Zap size={13} /> Daily Credits</span>
            <span className="acct-credits-count">
              <strong className={remaining === 0 ? 'quota-zero' : remaining <= 10 ? 'quota-low' : 'quota-ok'}>
                {remaining}
              </strong>
              <span> / {maxCredits}</span>
            </span>
          </div>
          <div className="quota-progress" style={{ margin: '8px 0' }}>
            <div className="quota-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="acct-credits-detail">
            <span>Used today: <strong>{used}</strong></span>
            <span>Resets at midnight</span>
          </div>
        </div>

        {/* Credit costs reference */}
        <div className="acct-cost-grid">
          <div className="acct-cost-item">
            <span className="acct-cost-icon">🖼️</span>
            <span className="acct-cost-label">Image</span>
            <span className="acct-cost-val">3 credits</span>
          </div>
          <div className="acct-cost-item">
            <span className="acct-cost-icon">🎬</span>
            <span className="acct-cost-label">Video</span>
            <span className="acct-cost-val">6 credits</span>
          </div>
        </div>

        {/* Plan badge */}
        <div className="acct-plan">
          <Sparkles size={13} fill="currentColor" />
          <span>Account Plan — <strong>80 credits / day</strong></span>
        </div>

        <button className="acct-signout-btn" onClick={onSignOut}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
