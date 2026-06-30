import React, { useState, useRef, useEffect } from 'react';
import { Video, Play, Pause, Download, RefreshCw, Eye, AlertCircle } from 'lucide-react';
import {
    DEFAULT_ADAPTIVE_ALPHA,
    DEFAULT_ALPHA_GAIN,
    DEFAULT_DENOISE_BACKEND,
    DEFAULT_EDGE_DENOISE_STRENGTH,
    DEFAULT_HIGH_QUALITY_CLEANUP,
    DEFAULT_RESIDUAL_CLEANUP_STRENGTH,
    DEFAULT_SAMPLE_COUNT,
    DEFAULT_VIDEO_BITRATE,
    VIDEO_DENOISE_BACKENDS,
    detectGeminiVideoWatermark,
    inspectGeminiVideoFile,
    removeGeminiVideoWatermark
} from '../video/videoExport.js';
import { isReferenceGeminiVideoSize } from '../video/videoWatermarkCatalog.js';
import {
    getAutomaticVideoPresetConfig,
    getRelocatedReviewPresetConfig
} from '../video/videoPresetPolicy.js';
import { resolveAllenkFdncnnRuntimeProfile } from '../video/videoDenoiseRuntimePolicy.js';
import { createAllenkFdncnnOnnxRuntime } from '../core/allenkFdncnnOnnxRuntime.js';

const ALLENK_FDNCNN_WASM_PATHS = Object.freeze({
    mjs: './onnxruntime/ort-wasm-simd-threaded.js',
    wasm: './onnxruntime/ort-wasm-simd-threaded.wasm'
});
const ALLENK_FDNCNN_WEBGPU_WASM_PATHS = Object.freeze({
    mjs: './onnxruntime/ort-wasm-simd-threaded.asyncify.mjs',
    wasm: './onnxruntime/ort-wasm-simd-threaded.asyncify.wasm'
});

export default function VideoWorkspace({ item, onUpdateItem, autoStart }) {
    // Status and Progress
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('Ready');
    const [isExporting, setIsExporting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    
    // Metadata / Detection
    const [metadata, setMetadata] = useState(item.processedMeta?.metadata || null);
    const [detection, setDetection] = useState(item.processedMeta?.detection || null);
    
    // Advanced Controls
    const [alphaGain, setAlphaGain] = useState(DEFAULT_ALPHA_GAIN);
    const [adaptiveAlpha, setAdaptiveAlpha] = useState(DEFAULT_ADAPTIVE_ALPHA);
    const [highQualityCleanup, setHighQualityCleanup] = useState(DEFAULT_HIGH_QUALITY_CLEANUP);
    const [denoiseBackend, setDenoiseBackend] = useState(DEFAULT_DENOISE_BACKEND);
    const [edgeDenoiseStrength, setEdgeDenoiseStrength] = useState(DEFAULT_EDGE_DENOISE_STRENGTH);
    const [residualCleanup, setResidualCleanup] = useState(DEFAULT_RESIDUAL_CLEANUP_STRENGTH);
    const [videoBitrateMbps, setVideoBitrateMbps] = useState(15);
    const [sampleCount, setSampleCount] = useState(DEFAULT_SAMPLE_COUNT);
    const [allowLowConfidence, setAllowLowConfidence] = useState(false);
    const [autoPresetLabel, setAutoPresetLabel] = useState('AI Auto Preset');
    const [autoPresetDesc, setAutoPresetDesc] = useState('Applies local ONNX models for visible logo suppression upon export.');

    // Video Players Sync refs
    const originalVideoRef = useRef(null);
    const processedVideoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [scrubberVal, setScrubberVal] = useState(0);

    const jobIdRef = useRef(0);
    const allenkRuntimeMap = useRef(new Map());

    // Inspect metadata on load
    useEffect(() => {
        async function loadMeta() {
            if (metadata) return; // already loaded
            try {
                setStatusMsg({ text: 'Reading video metadata...', type: 'info' });
                const meta = await inspectGeminiVideoFile(item.file);
                setMetadata(meta);
                applyAutomaticPreset(null, meta);
                setStatusMsg({ text: 'Video loaded. Ready to scan or export.', type: 'info' });
            } catch (err) {
                console.error(err);
                setStatusMsg({ text: 'Failed to read video metadata.', type: 'error' });
            }
        }
        loadMeta();
    }, [item.id]);

    // Auto-start trigger for batch processing
    useEffect(() => {
        if (autoStart && item.status === 'queued') {
            handleExportCleanVideo();
        }
    }, [autoStart, item]);

    const applyAutomaticPreset = (det, meta) => {
        const preset = getAutomaticVideoPresetConfig(det, meta);
        if (preset) {
            setAutoPresetLabel(preset.label);
            setAutoPresetDesc(preset.description);
            if (preset.options) {
                if (Number.isFinite(preset.options.alphaGain)) setAlphaGain(preset.options.alphaGain);
                if (typeof preset.options.adaptiveAlpha === 'boolean') setAdaptiveAlpha(preset.options.adaptiveAlpha);
                if (preset.options.denoiseBackend) setDenoiseBackend(preset.options.denoiseBackend);
                if (Number.isFinite(preset.options.edgeDenoiseStrength)) setEdgeDenoiseStrength(preset.options.edgeDenoiseStrength);
                if (Number.isFinite(preset.options.residualCleanupStrength)) setResidualCleanup(preset.options.residualCleanupStrength);
            }
        }
    };

    const handlePresetAdjust = () => {
        const preset = getRelocatedReviewPresetConfig(detection, metadata);
        if (preset) {
            setAutoPresetLabel(preset.label);
            setAutoPresetDesc(preset.description);
            if (preset.options) {
                if (Number.isFinite(preset.options.alphaGain)) setAlphaGain(preset.options.alphaGain);
                if (typeof preset.options.adaptiveAlpha === 'boolean') setAdaptiveAlpha(preset.options.adaptiveAlpha);
                if (preset.options.denoiseBackend) setDenoiseBackend(preset.options.denoiseBackend);
                if (Number.isFinite(preset.options.edgeDenoiseStrength)) setEdgeDenoiseStrength(preset.options.edgeDenoiseStrength);
                if (Number.isFinite(preset.options.residualCleanupStrength)) setResidualCleanup(preset.options.residualCleanupStrength);
            }
            setStatusMsg({ text: 'Preset adjustments applied successfully.', type: 'success' });
        }
    };

    // ONNX loaders
    const isMimeJavascript = (contentType) => {
        const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
        return ['application/javascript', 'text/javascript', 'application/ecmascript', 'text/ecmascript'].includes(mime) || mime.endsWith('+javascript');
    };

    const preflightWebGpuAssets = async (paths) => {
        try {
            const resp = await fetch(paths.mjs, { cache: 'no-store' });
            if (!resp.ok) return { ok: false, reason: `WebGPU runtime module not found: ${resp.status}` };
            const type = resp.headers.get('content-type') || '';
            if (!isMimeJavascript(type)) return { ok: false, reason: `WebGPU served as invalid type ${type}` };
            return { ok: true };
        } catch (err) {
            return { ok: false, reason: err.message };
        }
    };

    const loadAllenkFdncnnRuntime = async (profile) => {
        if (allenkRuntimeMap.current.has(profile.id)) {
            return allenkRuntimeMap.current.get(profile.id);
        }

        const promise = (async () => {
            const resp = await fetch(profile.modelUrl);
            if (!resp.ok) throw new Error(`Failed to load AI model: ${resp.status}`);
            const modelBytes = new Uint8Array(await resp.arrayBuffer());

            if (navigator.gpu && window.__gwrDisableWebGpuDenoise !== true) {
                try {
                    const preflight = await preflightWebGpuAssets(ALLENK_FDNCNN_WEBGPU_WASM_PATHS);
                    if (!preflight.ok) throw new Error(preflight.reason);
                    
                    setStatusMsg({ text: 'Initializing WebGPU accelerated AI model...', type: 'info' });
                    const webgpuOrt = await import('onnxruntime-web/webgpu');
                    return await createAllenkFdncnnOnnxRuntime({
                        ort: webgpuOrt,
                        modelBytes,
                        executionProvider: 'webgpu',
                        wasmPaths: ALLENK_FDNCNN_WEBGPU_WASM_PATHS,
                        inputName: 'fdncnn_input',
                        outputName: 'fdncnn_output',
                        inputShape: profile.inputShape,
                        outputShape: profile.outputShape
                    });
                } catch (gpuError) {
                    console.warn('WebGPU unavailable, falling back to WASM CPU:', gpuError);
                }
            }

            setStatusMsg({ text: 'Initializing WASM CPU AI model...', type: 'info' });
            const wasmOrt = await import('onnxruntime-web');
            return createAllenkFdncnnOnnxRuntime({
                modelBytes,
                executionProvider: 'wasm',
                wasmPaths: ALLENK_FDNCNN_WASM_PATHS,
                inputName: 'fdncnn_input',
                outputName: 'fdncnn_output',
                inputShape: profile.inputShape,
                outputShape: profile.outputShape
            });
        })();

        allenkRuntimeMap.current.set(profile.id, promise);
        return promise;
    };

    const resolveExportDenoiseRuntime = async (backend, profile) => {
        if (backend !== VIDEO_DENOISE_BACKENDS.ALLENK_FDNCNN_BROWSER_SPIKE) {
            return null;
        }
        setStatusMsg({ text: 'Loading AI model...', type: 'info' });
        return loadAllenkFdncnnRuntime(profile);
    };

    const getAllenkFdncnnTemporalReuseConfig = (runtime) => {
        if (!runtime || runtime.executionProvider !== 'wasm') return null;
        const hasThreaded = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';
        return {
            maxFrames: hasThreaded ? 1 : 2,
            threshold: hasThreaded ? 4.5 : 6.5
        };
    };

    const resolveDetectionAllenkSigma = (det) => {
        if (det?.watermarkKind === 'veo-text') {
            return det.template?.cleanup?.runtimeFdncnnSigma ?? 75;
        }
        return 75;
    };

    const resolveDetectionAllenkPadding = (det, profile) => {
        if (det?.watermarkKind === 'veo-text' && Number.isFinite(det.template?.cleanup?.allenkFdncnnPadding)) {
            return det.template.cleanup.allenkFdncnnPadding;
        }
        return profile.padding;
    };

    // Scan Watermark
    const handleScanWatermark = async () => {
        if (isScanning || isExporting) return;
        const jobId = ++jobIdRef.current;
        setIsScanning(true);
        setProgress(0.05);
        setProgressText('Scanning');
        setStatusMsg({ text: 'Scanning video frames for watermark templates...', type: 'info' });

        try {
            const result = await detectGeminiVideoWatermark(item.file, {
                sampleCount: Number(sampleCount) || DEFAULT_SAMPLE_COUNT,
                onProgress: ({ progress: pg = 0, step = 'detect', sampledFrames = 0, sampleCount: sc = 0 }) => {
                    if (jobId !== jobIdRef.current) return;
                    const safeProg = Number.isFinite(pg) ? Math.max(0, Math.min(1, pg)) : 0;
                    setProgress(0.05 + safeProg * 0.9);
                    
                    const labelMap = {
                        metadata: 'Metadata Read',
                        sample: sc > 0 ? `Sampled ${sampledFrames}/${sc}` : 'Sampling',
                        score: 'Scoring Templates',
                        done: 'Done'
                    };
                    setProgressText(labelMap[step] || 'Analyzing');
                },
                yieldToMainThread: () => new Promise(res => setTimeout(res, 0))
            });

            if (jobId !== jobIdRef.current) return;
            setMetadata(result.metadata);
            setDetection(result.detection);
            applyAutomaticPreset(result.detection, result.metadata);
            setProgress(1);
            setProgressText(result.detection.isConfident ? 'Scanning Done' : 'Low Confidence');
            
            setStatusMsg({ 
                text: result.detection.isConfident 
                    ? 'Watermark scanned successfully! Ready to clean.' 
                    : 'Watermark scan returned low confidence, you may still attempt export.', 
                type: result.detection.isConfident ? 'success' : 'warn' 
            });
        } catch (err) {
            console.error('Scan failed:', err);
            setStatusMsg({ text: err.message || 'Scanning process failed.', type: 'error' });
            setProgress(0);
            setProgressText('Failed');
        } finally {
            setIsScanning(false);
        }
    };

    // Export Pipeline
    const handleExportCleanVideo = async () => {
        if (isExporting || isScanning) return;
        const jobId = ++jobIdRef.current;
        setIsExporting(true);
        setProgress(0);
        setProgressText('Starting');
        onUpdateItem(item.id, { status: 'processing' });
        setStatusMsg({ text: 'Starting frame scrubbing...', type: 'info' });

        try {
            let activeDet = detection ? { metadata, detection } : null;
            if (!activeDet) {
                // Auto scan first
                setStatusMsg({ text: 'Auto scanning watermark position first...', type: 'info' });
                const scanRes = await detectGeminiVideoWatermark(item.file, {
                    sampleCount: Number(sampleCount) || DEFAULT_SAMPLE_COUNT,
                    yieldToMainThread: () => new Promise(res => setTimeout(res, 0))
                });
                if (jobId !== jobIdRef.current) return;
                setMetadata(scanRes.metadata);
                setDetection(scanRes.detection);
                activeDet = { metadata: scanRes.metadata, detection: scanRes.detection };
                applyAutomaticPreset(scanRes.detection, scanRes.metadata);
            }

            const profile = resolveAllenkFdncnnRuntimeProfile(activeDet.detection.position);
            const runtime = await resolveExportDenoiseRuntime(denoiseBackend, profile);
            if (jobId !== jobIdRef.current) return;

            const sigma = resolveDetectionAllenkSigma(activeDet.detection);
            const padding = resolveDetectionAllenkPadding(activeDet.detection, profile);
            const reuse = getAllenkFdncnnTemporalReuseConfig(runtime);

            const result = await removeGeminiVideoWatermark(item.file, {
                alphaGain: Number(alphaGain) || DEFAULT_ALPHA_GAIN,
                adaptiveAlpha,
                highQualityCleanup,
                denoiseBackend,
                edgeDenoiseStrength: Number(edgeDenoiseStrength) || 0,
                residualCleanupStrength: Number(residualCleanup) || 0,
                videoBitrate: videoBitrateMbps > 0 ? videoBitrateMbps * 1000 * 1000 : DEFAULT_VIDEO_BITRATE,
                sampleCount: Number(sampleCount) || DEFAULT_SAMPLE_COUNT,
                detection: activeDet,
                allowLowConfidence,
                allenkFdncnnRuntime: runtime,
                allenkFdncnnSigma: sigma,
                allenkFdncnnPadding: padding,
                allenkFdncnnTemporalReuse: reuse,
                yieldToMainThread: () => new Promise(res => setTimeout(res, 0)),
                onProgress: ({ phase, progress: pg, processedFrames }) => {
                    if (jobId !== jobIdRef.current) return;
                    if (phase === 'detect') {
                        setProgress(pg * 0.12);
                        setProgressText('Preflight');
                    } else if (phase === 'export') {
                        const totalPg = 0.12 + pg * 0.88;
                        setProgress(totalPg);
                        const frameLabel = Number.isFinite(processedFrames) ? `${processedFrames} frames` : 'processing';
                        setProgressText(`Clean Export (${frameLabel})`);
                        setStatusMsg({ text: `Processing frames... ${frameLabel}`, type: 'info' });
                    }
                }
            });

            if (jobId !== jobIdRef.current) return;
            const cleanUrl = URL.createObjectURL(result.blob);
            
            onUpdateItem(item.id, {
                status: 'completed',
                processedUrl: cleanUrl,
                processedBlob: result.blob,
                processedMeta: { metadata: activeDet.metadata, detection: activeDet.detection }
            });

            setProgress(1);
            setProgressText('Done');

            const audioNote = result.audioCopied 
                ? 'Audio preserved.' 
                : `Audio skipped: ${result.audioSkipReason || 'unknown codec'}.`;
            setStatusMsg({ 
                text: `Export finished successfully! Processed ${result.processedFrames} frames. ${audioNote}`, 
                type: 'success' 
            });
        } catch (err) {
            console.error('Export failed:', err);
            onUpdateItem(item.id, { status: 'error' });
            setStatusMsg({ text: err.message || 'Export process failed.', type: 'error' });
            setProgress(0);
            setProgressText('Failed');
        } finally {
            setIsExporting(false);
        }
    };

    const downloadVideo = () => {
        if (!item.processedBlob) return;
        const baseName = item.name.replace(/\.[^.]+$/, '') || 'video';
        const filename = `${baseName}_cleaned.mp4`;
        const url = URL.createObjectURL(item.processedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    // Video Sync playback controls (original video has NO muted attribute)
    const togglePlayback = () => {
        if (!originalVideoRef.current) return;
        const nextPlayingState = !isPlaying;
        setIsPlaying(nextPlayingState);

        if (nextPlayingState) {
            originalVideoRef.current.play().catch(e => console.warn(e));
            if (processedVideoRef.current && item.processedUrl) {
                processedVideoRef.current.currentTime = originalVideoRef.current.currentTime;
                processedVideoRef.current.play().catch(e => console.warn(e));
            }
        } else {
            originalVideoRef.current.pause();
            if (processedVideoRef.current) {
                processedVideoRef.current.pause();
            }
        }
    };

    const handleVideoTimeUpdate = () => {
        if (!originalVideoRef.current) return;
        const time = originalVideoRef.current.currentTime;
        setCurrentTime(time);

        if (duration > 0) {
            setScrubberVal(Math.round((time / duration) * 1000));
        }

        // Keep synced
        if (processedVideoRef.current && item.processedUrl && !originalVideoRef.current.paused) {
            const diff = Math.abs(processedVideoRef.current.currentTime - time);
            if (diff > 0.08) {
                processedVideoRef.current.currentTime = time;
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (!originalVideoRef.current) return;
        setDuration(originalVideoRef.current.duration);
    };

    const handleScrubberChange = (e) => {
        const val = Number(e.target.value);
        setScrubberVal(val);
        if (originalVideoRef.current && duration > 0) {
            const time = (val / 1000) * duration;
            originalVideoRef.current.currentTime = time;
            setCurrentTime(time);
            if (processedVideoRef.current) {
                processedVideoRef.current.currentTime = time;
            }
        }
    };

    const formatPlaybackTime = (val) => {
        if (!Number.isFinite(val) || val < 0) return '0:00';
        const totalSec = Math.floor(val);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const bestDet = detection?.summary?.best || {};
    const bestScore = Number.isFinite(bestDet.meanConfidence) ? bestDet.meanConfidence : (Number.isFinite(bestDet.meanNcc) ? bestDet.meanNcc : null);
    const refText = metadata && isReferenceGeminiVideoSize(metadata.width, metadata.height) ? '1920x1080 Confirmed' : 'Proportional Inference';

    return (
        <div className="workspace-container">
            <div className="workspace-layout">
                {/* Visualizer Column */}
                <div className="video-player-column">
                    <div className="video-preview-box">
                        <div className={`video-container ${item.processedUrl ? 'split' : ''}`}>
                            <div className="video-player-wrapper">
                                <video 
                                    ref={originalVideoRef}
                                    src={item.originalUrl}
                                    onTimeUpdate={handleVideoTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    playsInline
                                    style={{ width: '100%', height: '100%' }}
                                />
                                <div className="video-badge-overlay">Original (Audio)</div>
                            </div>

                            {item.processedUrl && (
                                <div className="video-player-wrapper">
                                    <video 
                                        ref={processedVideoRef}
                                        src={item.processedUrl}
                                        muted
                                        playsInline
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                    <div className="video-badge-overlay" style={{ color: 'var(--primary)' }}>Cleaned</div>
                                </div>
                            )}
                        </div>

                        {/* Scrubber panel */}
                        <div className="video-controls">
                            <button className="play-btn" onClick={togglePlayback} disabled={!item.originalUrl}>
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                            </button>
                            <input 
                                type="range" 
                                className="scrubber-slider" 
                                min={0} 
                                max={1000} 
                                value={scrubberVal}
                                onChange={handleScrubberChange}
                                disabled={!item.originalUrl}
                            />
                            <div className="time-display">
                                {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
                            </div>
                        </div>
                    </div>

                    {/* Progress details */}
                    <div className="panel">
                        <div className="panel-head">Export Progress</div>
                        <div className="panel-body">
                            <div className="progress-bar-wrapper">
                                <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                                <span>Phase: <strong style={{ color: 'var(--text-main)' }}>{progressText}</strong></span>
                                <span>{Math.round(progress * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="sidebar-column">
                    <div className="panel">
                        <div className="panel-head">Processing Control</div>
                        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'var(--primary-soft)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(13,211,187,0.2)' }}>
                                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px', color: 'var(--primary)' }}>{autoPresetLabel}</strong>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{autoPresetDesc}</span>
                            </div>

                            <button 
                                className="btn primary" 
                                onClick={handleExportCleanVideo} 
                                disabled={isExporting || isScanning}
                            >
                                <Video size={16} /> Clean & Export Video
                            </button>
                            
                            <button 
                                className="btn" 
                                onClick={handleScanWatermark} 
                                disabled={isScanning || isExporting}
                            >
                                <Eye size={16} /> Scan Watermark
                            </button>

                            <button 
                                className="btn"
                                onClick={downloadVideo}
                                disabled={!item.processedUrl}
                            >
                                <Download size={16} /> Download Result
                            </button>

                            <details className="advanced-settings">
                                <summary>Advanced Parameters</summary>
                                <div className="settings-content">
                                    <div className="control-group">
                                        <label className="control-label">
                                            <span>Alpha Gain Boost</span>
                                            <span>{alphaGain.toFixed(2)}</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min={0.25} 
                                            max={1.35} 
                                            step={0.05} 
                                            value={alphaGain} 
                                            onChange={(e) => setAlphaGain(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="control-group">
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={adaptiveAlpha} 
                                                onChange={(e) => setAdaptiveAlpha(e.target.checked)}
                                            />
                                            Adaptive Alpha Calculations
                                        </label>
                                    </div>

                                    <div className="control-group">
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={highQualityCleanup} 
                                                onChange={(e) => setHighQualityCleanup(e.target.checked)}
                                            />
                                            Temporal Stabilization
                                        </label>
                                    </div>

                                    <div className="control-group">
                                        <label className="control-label">Denoise Backend</label>
                                        <select value={denoiseBackend} onChange={(e) => setDenoiseBackend(e.target.value)}>
                                            <option value="none">Off</option>
                                            <option value="canvas-edge-denoise">Canvas Edge Denoise</option>
                                            <option value="canvas-edge-band-denoise">Canvas Edge Band Denoise</option>
                                            <option value="canvas-edge-core-denoise">Canvas Edge Core Denoise</option>
                                            <option value="canvas-footprint-polish">Canvas Footprint Polish</option>
                                            <option value="canvas-temporal-delta-stabilize">Canvas Temporal Delta Stabilize</option>
                                            <option value="canvas-temporal-match-delta-stabilize">Canvas Match Delta Stabilize</option>
                                            <option value="canvas-temporal-stabilize">Canvas Temporal Stabilize</option>
                                            <option value="canvas-texture-repair">Canvas Texture Repair</option>
                                            <option value="allenk-fdncnn-browser-spike">AI FDnCNN ONNX</option>
                                        </select>
                                    </div>

                                    <div className="control-group">
                                        <label className="control-label">
                                            <span>Edge Denoise Strength</span>
                                            <span>{edgeDenoiseStrength.toFixed(2)}</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min={0} 
                                            max={1} 
                                            step={0.05} 
                                            value={edgeDenoiseStrength} 
                                            onChange={(e) => setEdgeDenoiseStrength(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="control-group">
                                        <label className="control-label">
                                            <span>Residual Denoise Cleanup</span>
                                            <span>{residualCleanup.toFixed(2)}</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min={0} 
                                            max={1.80} 
                                            step={0.05} 
                                            value={residualCleanup} 
                                            onChange={(e) => setResidualCleanup(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="control-group">
                                        <label className="control-label">
                                            <span>Bitrate (Mbps)</span>
                                            <span>{videoBitrateMbps}</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min={1} 
                                            max={80} 
                                            step={0.5} 
                                            value={videoBitrateMbps} 
                                            onChange={(e) => setVideoBitrateMbps(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="control-group">
                                        <label className="control-label">Scan Sample Count</label>
                                        <select value={sampleCount} onChange={(e) => setSampleCount(Number(e.target.value))}>
                                            <option value={4}>4 Frames (Speed)</option>
                                            <option value={8}>8 Frames</option>
                                            <option value={12}>12 Frames (Balanced)</option>
                                            <option value={16}>16 Frames</option>
                                            <option value={24}>24 Frames (Deep Scan)</option>
                                        </select>
                                    </div>

                                    <div className="control-group">
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={allowLowConfidence} 
                                                onChange={(e) => setAllowLowConfidence(e.target.checked)}
                                            />
                                            Force Export on Low Confidence
                                        </label>
                                    </div>

                                    {detection && (
                                        <button className="btn" type="button" onClick={handlePresetAdjust}>
                                            Force Relocated Preset
                                        </button>
                                    )}
                                </div>
                            </details>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-head">Video Metadata</div>
                        <div className="panel-body">
                            {metadata ? (
                                <div className="meta-list">
                                    <div className="meta-item">
                                        <dt>Resolution</dt>
                                        <dd>{metadata.width} x {metadata.height}</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Duration</dt>
                                        <dd>{metadata.duration.toFixed(2)}s</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Framerate</dt>
                                        <dd>{metadata.frameRate.toFixed(2)} fps</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Avg Bitrate</dt>
                                        <dd>{(metadata.averageBitrate / 1000 / 1000).toFixed(2)} Mbps</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Watermark Spec</dt>
                                        <dd>{refText}</dd>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No metadata. Loading...</p>
                            )}
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-head">Watermark Detection</div>
                        <div className="panel-body">
                            {detection ? (
                                <div className="meta-list">
                                    <div className="meta-item">
                                        <dt>Best Match</dt>
                                        <dd>{detection.watermarkKind === 'veo-text' ? (bestDet.templateId || 'Veo Text') : (bestDet.label || 'Unknown logo')}</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Position</dt>
                                        <dd>({detection.position.x}, {detection.position.y})</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Size</dt>
                                        <dd>{detection.position.width} x {detection.position.height}</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Confidence Score</dt>
                                        <dd>{Number.isFinite(bestScore) ? bestScore.toFixed(3) : '-'}</dd>
                                    </div>
                                    <div className="meta-item">
                                        <dt>Scan Verdict</dt>
                                        <dd style={{ color: detection.isConfident ? 'var(--primary)' : 'var(--warn)' }}>
                                            {detection.isConfident ? 'Ready for Suppress' : 'Low Confidence'}
                                        </dd>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Scan or export to check.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {statusMsg.text && (
                <div className={`status-msg ${statusMsg.type}`}>
                    <div className="inner">
                        <AlertCircle size={15} />
                        <span>{statusMsg.text}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
