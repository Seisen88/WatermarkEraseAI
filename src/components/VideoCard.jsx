import React, { useState, useRef, useEffect } from 'react';
import { Download, X, Video } from 'lucide-react';
import {
  DEFAULT_ADAPTIVE_ALPHA,
  DEFAULT_ALPHA_GAIN,
  DEFAULT_DENOISE_BACKEND,
  DEFAULT_EDGE_DENOISE_STRENGTH,
  DEFAULT_HIGH_QUALITY_CLEANUP,
  DEFAULT_RESIDUAL_CLEANUP_STRENGTH,
  DEFAULT_SAMPLE_COUNT,
  DEFAULT_VIDEO_BITRATE,
  detectGeminiVideoWatermark,
  removeGeminiVideoWatermark
} from '../video/videoExport.js';
import { resolveAllenkFdncnnRuntimeProfile } from '../video/videoDenoiseRuntimePolicy.js';

export default function VideoCard({ item, onRemove, onDone }) {
  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('Scanning…');
  const [processedUrl, setProcessedUrl] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
  const jobId = useRef(0);

  useEffect(() => { run(); }, []);

  const run = async () => {
    const jid = ++jobId.current;
    try {
      setProgressText('Scanning watermark…');
      setProgress(0.05);

      const scanRes = await detectGeminiVideoWatermark(item.file, {
        sampleCount: DEFAULT_SAMPLE_COUNT,
        yieldToMainThread: () => new Promise(r => setTimeout(r, 0))
      });
      if (jid !== jobId.current) return;

      setProgressText('Cleaning frames…');
      setProgress(0.15);

      const result = await removeGeminiVideoWatermark(item.file, {
        alphaGain: DEFAULT_ALPHA_GAIN,
        adaptiveAlpha: DEFAULT_ADAPTIVE_ALPHA,
        highQualityCleanup: DEFAULT_HIGH_QUALITY_CLEANUP,
        denoiseBackend: DEFAULT_DENOISE_BACKEND,
        edgeDenoiseStrength: DEFAULT_EDGE_DENOISE_STRENGTH,
        residualCleanupStrength: DEFAULT_RESIDUAL_CLEANUP_STRENGTH,
        videoBitrate: DEFAULT_VIDEO_BITRATE,
        sampleCount: DEFAULT_SAMPLE_COUNT,
        detection: { metadata: scanRes.metadata, detection: scanRes.detection },
        allowLowConfidence: true,
        yieldToMainThread: () => new Promise(r => setTimeout(r, 0)),
        onProgress: ({ phase, progress: pg }) => {
          if (jid !== jobId.current) return;
          if (phase === 'detect') {
            setProgress(0.05 + pg * 0.1);
          } else if (phase === 'export') {
            const total = 0.15 + pg * 0.85;
            setProgress(total);
            setProgressText(`Cleaning frames… ${Math.round(total * 100)}%`);
          }
        }
      });

      if (jid !== jobId.current) return;
      const url = URL.createObjectURL(result.blob);
      setProcessedBlob(result.blob);
      setProcessedUrl(url);
      setProgress(1);
      setStatus('done');
      onDone?.();
    } catch (err) {
      console.error(err);
      setStatus('error');
      setProgressText('Failed');
    }
  };

  const download = () => {
    if (!processedBlob) return;
    const name = `${item.name.replace(/\.[^.]+$/, '') || 'video'}_cleaned.mp4`;
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="file-card">
      <div className="card-topbar">
        <span className="card-type-badge"><Video size={11} /> Video</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {status === 'done' && <span className="clean-badge">Clean</span>}
          {status === 'error' && <span className="err-badge">Error</span>}
          <button className="card-x" onClick={onRemove}><X size={13} /></button>
        </div>
      </div>

      <div className="card-media card-media-video">
        <video
          src={processedUrl || item.originalUrl}
          className="card-video"
          controls
          playsInline
        />
        {status === 'processing' && (
          <div className="card-spinner-overlay">
            <div className="spinner" style={{ width: 26, height: 26, borderWidth: 2, margin: '0 0 8px' }} />
            <span>{progressText}</span>
            <div className="card-progress-bar">
              <div className="card-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="card-spinner-overlay">
            <span style={{ color: '#f87171' }}>Processing failed</span>
          </div>
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
