import React, { useState, useRef, useEffect } from 'react';
import { Download, Copy, RefreshCw, Layers, Check, AlertCircle } from 'lucide-react';
import { WatermarkEngine, detectWatermarkConfig, calculateWatermarkPosition } from '../core/watermarkEngine.js';
import { isConfirmedWatermarkDecision, resolveDisplayWatermarkInfo } from '../core/watermarkDisplay.js';
import { canvasToBlob } from '../core/canvasBlob.js';

export default function ImageWorkspace({ item, onUpdateItem, autoStart }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [copySuccess, setCopySuccess] = useState(false);
  
  const containerRef = useRef(null);
  const isDraggingSlider = useRef(false);
  const engineRef = useRef(null);

  // Initialize Watermark Engine
  useEffect(() => {
    async function initEngine() {
      try {
        engineRef.current = await WatermarkEngine.create();
      } catch (err) {
        console.error('Failed to create WatermarkEngine:', err);
        setStatusMsg({ text: 'Failed to initialize image processing engine.', type: 'error' });
      }
    }
    initEngine();
  }, []);

  // Auto-start trigger
  useEffect(() => {
    if (autoStart && item.status === 'queued') {
      processImage();
    }
  }, [autoStart, item]);

  // Manual trigger if opened and queued
  useEffect(() => {
    if (item.status === 'queued') {
      processImage();
    }
  }, [item.id]);

  const loadImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getEstimatedWatermarkInfo = (width, height) => {
    const config = detectWatermarkConfig(width, height);
    const position = calculateWatermarkPosition(width, height, config);
    return {
      size: config.logoSize,
      position,
      config
    };
  };

  // Process the image
  const processImage = async () => {
    if (item.status === 'processing' || item.status === 'completed') return;

    onUpdateItem(item.id, { status: 'processing' });
    setStatusMsg({ text: 'Suppressing watermark...', type: 'info' });

    try {
      if (!engineRef.current) {
        engineRef.current = await WatermarkEngine.create();
      }

      const img = await loadImage(item.file);
      
      // We also store originalImg on item if needed, but keeping it local or updating is fine
      const canvas = await engineRef.current.removeWatermarkFromImage(img, {});
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const meta = canvas.__watermarkMeta || null;

      // Mock update to allow functions like isConfirmedWatermarkDecision
      const mockProcessedItem = {
        ...item,
        originalImg: img,
        processedMeta: meta
      };

      const hasWatermark = isConfirmedWatermarkDecision(mockProcessedItem);
      
      onUpdateItem(item.id, {
        status: 'completed',
        processedUrl: url,
        processedBlob: blob,
        processedMeta: meta,
        // Save the loaded dimensions for displaying
        dimensions: { width: img.width, height: img.height }
      });

      setStatusMsg({
        text: hasWatermark 
          ? 'Watermark removed successfully!' 
          : 'No watermark detected. Kept original image.',
        type: hasWatermark ? 'success' : 'warn'
      });
    } catch (err) {
      console.error(err);
      onUpdateItem(item.id, { status: 'error' });
      setStatusMsg({ text: 'Image processing failed.', type: 'error' });
    }
  };

  // Slider Drag Actions
  const handleSliderMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1) * 100;
    setSliderPosition(percent);
  };

  const handleMouseDown = (e) => {
    isDraggingSlider.current = true;
    handleSliderMove(e.clientX);
  };

  const handleTouchStart = (e) => {
    isDraggingSlider.current = true;
    if (e.touches && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => { isDraggingSlider.current = false; };
    const handleMouseMove = (e) => {
      if (isDraggingSlider.current) handleSliderMove(e.clientX);
    };
    const handleTouchMove = (e) => {
      if (isDraggingSlider.current && e.touches && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const downloadImage = () => {
    if (!item.processedBlob) return;
    const baseName = item.name.replace(/\.[^.]+$/, '') || 'image';
    const filename = `unwatermarked_${baseName}.png`;
    const url = URL.createObjectURL(item.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const copyImage = async () => {
    if (!item.processedBlob || !navigator.clipboard || !window.ClipboardItem) {
      setStatusMsg({ text: 'Clipboard copying is not supported on this browser.', type: 'warn' });
      return;
    }
    try {
      const data = [new ClipboardItem({ [item.processedBlob.type]: item.processedBlob })];
      await navigator.clipboard.write(data);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setStatusMsg({ text: 'Copy to clipboard failed.', type: 'error' });
    }
  };

  // Resolve metadata display items
  const itemWidth = item.dimensions?.width;
  const itemHeight = item.dimensions?.height;

  const currentEstimatedMeta = itemWidth && itemHeight 
    ? getEstimatedWatermarkInfo(itemWidth, itemHeight)
    : null;

  // Build a dummy item that can fit the sdk display resolver contract
  const dummyItem = {
    originalImg: itemWidth ? { width: itemWidth, height: itemHeight } : null,
    processedMeta: item.processedMeta
  };

  const currentDisplayMeta = dummyItem.originalImg && currentEstimatedMeta 
    ? resolveDisplayWatermarkInfo(dummyItem, currentEstimatedMeta)
    : null;

  const isRemoved = isConfirmedWatermarkDecision(dummyItem);

  return (
    <div className="workspace-container">
      <div className="workspace-layout">
        {/* Visualizer Column */}
        <div className="image-viewer-column">
          <div className="image-viewer">
            <div 
              ref={containerRef}
              className="comparison-slider-container"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Original (Underneath) */}
              <img 
                src={item.originalUrl} 
                className="slider-img" 
                alt="Original" 
                draggable={false}
              />
              
              {/* Processed (Overlay) */}
              {item.processedUrl && (
                <div 
                  className="slider-overlay" 
                  style={{ width: `${sliderPosition}%`, borderRight: '2px solid var(--primary)' }}
                >
                  <img 
                    src={item.processedUrl} 
                    className="slider-overlay-img" 
                    style={{ width: containerRef.current?.getBoundingClientRect().width }}
                    alt="Cleaned" 
                    draggable={false}
                  />
                </div>
              )}
              
              {/* Slider Handle */}
              {item.processedUrl && (
                <div 
                  className="slider-handle" 
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="slider-handle-button">
                    <Layers size={16} />
                  </div>
                </div>
              )}

              <div className="slider-label left">Cleaned</div>
              <div className="slider-label right">Original</div>
            </div>
            
            {/* Spinner Overlay */}
            {item.status === 'processing' && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Removing watermark...</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls Column */}
        <div className="sidebar-column">
          <div className="panel">
            <div className="panel-head">Image Properties</div>
            <div className="panel-body">
              <div className="meta-list">
                <div className="meta-item">
                  <dt>Filename</dt>
                  <dd style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }} title={item.name}>
                    {item.name}
                  </dd>
                </div>
                {itemWidth && (
                  <div className="meta-item">
                    <dt>Resolution</dt>
                    <dd>{itemWidth} x {itemHeight}</dd>
                  </div>
                )}
                {currentDisplayMeta && (
                  <>
                    <div className="meta-item">
                      <dt>Watermark Size</dt>
                      <dd>{currentDisplayMeta.size} x {currentDisplayMeta.size}</dd>
                    </div>
                    <div className="meta-item">
                      <dt>Logo Position</dt>
                      <dd>({currentDisplayMeta.position.x}, {currentDisplayMeta.position.y})</dd>
                    </div>
                  </>
                )}
                {item.status === 'completed' && (
                  <div className="meta-item">
                    <dt>Status</dt>
                    <dd style={{ color: isRemoved ? 'var(--primary)' : 'var(--warn)' }}>
                      {isRemoved ? 'Watermark Subtracted' : 'Suppression Skipped'}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">Execution Tools</div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="btn primary" 
                  disabled={!item.processedUrl || item.status === 'processing'}
                  onClick={downloadImage}
                >
                  <Download size={16} /> Download Result
                </button>
                <button 
                  className="btn" 
                  disabled={!item.processedUrl || copySuccess || item.status === 'processing'}
                  onClick={copyImage}
                >
                  {copySuccess ? <Check size={16} style={{ color: 'var(--primary)' }} /> : <Copy size={16} />}
                  {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button 
                  className="btn" 
                  disabled={item.status === 'processing'}
                  onClick={processImage}
                >
                  <RefreshCw size={16} /> Re-Process
                </button>
              </div>
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
