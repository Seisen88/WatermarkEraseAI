import React, { useState, useRef, useEffect } from 'react';
import { Download, X, ImageIcon } from 'lucide-react';
import { WatermarkEngine } from '../core/watermarkEngine.js';
import { canvasToBlob } from '../core/canvasBlob.js';

export default function ImageCard({ item, onRemove, onDone }) {
  const [status, setStatus] = useState('processing');
  const [processedUrl, setProcessedUrl] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => { run(); }, []);

  useEffect(() => {
    const up = () => { isDragging.current = false; };
    const move = (e) => { if (isDragging.current) slide(e.clientX); };
    const touch = (e) => { if (isDragging.current && e.touches?.[0]) slide(e.touches[0].clientX); };
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchend', up);
    window.addEventListener('touchmove', touch, { passive: true });
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchmove', touch);
    };
  }, []);

  const slide = (clientX) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setSliderPos(Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * 100);
  };

  const run = async () => {
    try {
      const engine = await WatermarkEngine.create();
      const img = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const i = new window.Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = e.target.result;
        };
        reader.onerror = rej;
        reader.readAsDataURL(item.file);
      });
      const canvas = await engine.removeWatermarkFromImage(img, {});
      const blob = await canvasToBlob(canvas);
      setProcessedBlob(blob);
      setProcessedUrl(URL.createObjectURL(blob));
      setStatus('done');
      onDone?.(blob, `unwatermarked_${item.name.replace(/\.[^.]+$/, '') || 'image'}.png`);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const download = () => {
    if (!processedBlob) return;
    const name = `unwatermarked_${item.name.replace(/\.[^.]+$/, '') || 'image'}.png`;
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const cw = containerRef.current?.getBoundingClientRect().width;

  return (
    <div className="file-card">
      <div className="card-topbar">
        <span className="card-type-badge"><ImageIcon size={11} /> Image</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {status === 'done' && <span className="clean-badge">Clean</span>}
          {status === 'error' && <span className="err-badge">Error</span>}
          <button className="card-x" onClick={onRemove}><X size={13} /></button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="card-media"
        style={{ cursor: processedUrl ? 'ew-resize' : 'default' }}
        onMouseDown={(e) => { isDragging.current = true; slide(e.clientX); }}
        onTouchStart={(e) => { isDragging.current = true; if (e.touches?.[0]) slide(e.touches[0].clientX); }}
      >
        <img src={item.originalUrl} className="card-img-base" alt="" draggable={false} />

        {processedUrl && (
          <div className="card-img-overlay" style={{ width: `${sliderPos}%` }}>
            <img
              src={processedUrl}
              className="card-img-top"
              style={{ width: cw ? `${cw}px` : '100%' }}
              alt=""
              draggable={false}
            />
          </div>
        )}

        {processedUrl && (
          <div className="card-divider" style={{ left: `${sliderPos}%` }}>
            <div className="card-divider-knob" />
          </div>
        )}

        {status === 'processing' && (
          <div className="card-spinner-overlay">
            <div className="spinner" style={{ width: 26, height: 26, borderWidth: 2, margin: '0 0 8px' }} />
            <span>Removing watermark…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="card-spinner-overlay">
            <span style={{ color: '#f87171' }}>Processing failed</span>
          </div>
        )}

        {processedUrl && (
          <>
            <span className="clabel" style={{ left: 8, zIndex: 6 }}>Cleaned</span>
            <span className="clabel" style={{ right: 8 }}>Original</span>
          </>
        )}
      </div>

      <div className="card-footer">
        <div className="card-info">
          <span className="card-name" title={item.name}>{item.name}</span>
          <span className="card-size">{fmtSize(item.size)}</span>
        </div>
        <button className="save-btn" onClick={download} disabled={!processedBlob}>
          <Download size={13} /> Save
        </button>
      </div>
    </div>
  );
}

function fmtSize(b) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
}
