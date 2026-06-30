import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'No data collection',
        body: 'WatermarkErase AI processes all files entirely in your browser using WebAssembly and WebCodecs. Your images and videos are never uploaded to our servers — they never leave your device.',
      },
      {
        heading: 'Local storage',
        body: 'We store your account session and theme preference in your browser\'s localStorage solely to keep you signed in between visits. No personal data is transmitted or stored server-side beyond what is needed for authentication.',
      },
      {
        heading: 'Credits',
        body: 'Daily credit usage is tracked server-side by your IP address (guests) or account ID (signed-in users) to enforce fair-use limits. This data is automatically deleted after 25 hours.',
      },
      {
        heading: 'Google Sign-In',
        body: 'If you sign in with Google, we receive your name, email, and profile picture from Google\'s OAuth2 API. This information is stored locally in your browser only and is not transmitted to our servers.',
      },
      {
        heading: 'Cookies',
        body: 'We do not use tracking cookies or third-party analytics. The site uses no advertising networks.',
      },
      {
        heading: 'Contact',
        body: 'For privacy questions, contact us at: support@watermarkeraseai.com',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    sections: [
      {
        heading: 'Acceptance',
        body: 'By using WatermarkErase AI, you agree to these terms. If you do not agree, please do not use the service.',
      },
      {
        heading: 'Permitted use',
        body: 'This tool is intended for removing watermarks from content you own or have the legal right to modify. Do not use this service to infringe copyright or intellectual property rights.',
      },
      {
        heading: 'No warranty',
        body: 'The service is provided "as is" without warranty of any kind. We do not guarantee the accuracy, completeness, or quality of watermark removal results.',
      },
      {
        heading: 'Fair use limits',
        body: 'Free accounts receive 12 credits per day. Registered accounts receive 80 credits per day. We reserve the right to adjust these limits at any time.',
      },
      {
        heading: 'Prohibited use',
        body: 'You may not use automated scripts, bots, or tools to circumvent credit limits or abuse the service. Accounts found doing so will be suspended.',
      },
      {
        heading: 'Limitation of liability',
        body: 'WatermarkErase AI and its creators are not liable for any damages arising from use of the service, including loss of data, revenue, or profits.',
      },
      {
        heading: 'Changes',
        body: 'We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.',
      },
    ],
  },
};

export default function PolicyModal({ type, onClose }) {
  const backdropRef = useRef(null);
  const content = CONTENT[type];

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="auth-backdrop"
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="auth-modal policy-modal">
        <button className="auth-close" onClick={onClose}><X size={16} /></button>
        <h2 className="policy-title">{content.title}</h2>
        <div className="policy-body">
          {content.sections.map((s, i) => (
            <div key={i} className="policy-section">
              <h3>{s.heading}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
