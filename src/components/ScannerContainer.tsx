/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Camera, RefreshCw, Volume2, VolumeX, Eye, EyeOff, Clipboard, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { feedback } from '../utils/feedback';
import { extractParcelId } from '../utils/parser';

interface ScannerContainerProps {
  onScanSuccess: (rawText: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  vibrateEnabled: boolean;
  setVibrateEnabled: (value: boolean) => void;
}

export default function ScannerContainer({
  onScanSuccess,
  soundEnabled,
  setSoundEnabled,
  vibrateEnabled,
  setVibrateEnabled,
}: ScannerContainerProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [manualId, setManualId] = useState<string>('');
  const [isManualInputActive, setIsManualInputActive] = useState<boolean>(false);
  const [manualInputError, setManualInputError] = useState<string>('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-qr-scanner-element';

  // Load available cameras
  useEffect(() => {
    let mounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera initially
          const backCam = devices.find(
            (device) =>
              device.label.toLowerCase().includes('back') ||
              device.label.toLowerCase().includes('environment') ||
              device.label.toLowerCase().includes('rear')
          );
          const initialCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(initialCamId);
        } else {
          setScannerError('No camera devices detected. Please verify connection or try typing manually.');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Error fetching cameras:', err);
        setScannerError('Camera access denied or blocked. Please grant camera permission to scan.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Control camera scanning loop
  useEffect(() => {
    if (!selectedCameraId || isManualInputActive) {
      stopScanning();
      return;
    }

    // Short timeout to ensure the container div is mounted before initializing
    const timer = setTimeout(() => {
      startScanning(selectedCameraId);
    }, 150);

    return () => {
      clearTimeout(timer);
      stopScanning();
    };
  }, [selectedCameraId, isManualInputActive]);

  const startScanning = async (cameraId: string) => {
    try {
      await stopScanning(); // Ensure previous is fully stopped
      
      const constraints = {
        deviceId: { exact: cameraId }
      };

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;
      setScannerError('');

      await html5QrCode.start(
        constraints,
        {
          fps: 12,
          qrbox: (width, height) => {
            // Adapt scan box to scanning viewport size
            const size = Math.min(width, height) * 0.72;
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback!
          if (soundEnabled) feedback.playSuccessBeep();
          if (vibrateEnabled) feedback.triggerHapticFeedback();
          onScanSuccess(decodedText);
        },
        () => {
          // Silent callback for frame scanning misses (perfectly normal for QR video scanning)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      // Fallback: Try with facingMode environment if exact ID failed
      try {
        if (scannerRef.current) {
          await scannerRef.current.start(
            { facingMode: 'environment' },
            { fps: 12, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (soundEnabled) feedback.playSuccessBeep();
              if (vibrateEnabled) feedback.triggerHapticFeedback();
              onScanSuccess(decodedText);
            },
            () => {}
          );
          setIsScanning(true);
          setScannerError('');
        }
      } catch (innerErr: any) {
        setScannerError(
          `Unable to access camera: ${err.message || 'Permissions error'}. You can always input parcel IDs manually below.`
        );
        setIsScanning(false);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner during cleanup:', err);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCameraId(e.target.value);
  };

  // Process a manually typed or pasted parcel identifier
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualInputError('');
    
    const parsed = extractParcelId(manualId);
    if (!parsed.isValid) {
      if (soundEnabled) feedback.playErrorBeep();
      setManualInputError('Invalid code format. Parcel codes contain letters, digits, and hyphens (e.g. 002-0002-001-00257716055).');
      return;
    }

    if (soundEnabled) feedback.playSuccessBeep();
    if (vibrateEnabled) feedback.triggerHapticFeedback();
    onScanSuccess(manualId);
    setManualId('');
  };

  const loadDemoId = () => {
    setManualId('002-0002-001-00257716055');
  };

  return (
    <div id="scanner-view-container" className="flex flex-col gap-6 max-w-xl mx-auto">
      {/* Action buttons bar */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-full">
        <div className="flex items-center gap-2 text-xs font-mono text-[#00FF9C]">
          <Zap className="w-3.5 h-3.5 animate-pulse text-[#00FF9C]" />
          <span className="font-bold tracking-wider">SCANNER ACTIVE</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            id="toggle-audio-bt"
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              soundEnabled ? 'hover:bg-[#00FF9C]/10 text-[#00FF9C]' : 'hover:bg-slate-800/50 text-slate-400'
            }`}
            title={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Vibrate / Haptic toggle button */}
          <button
            id="toggle-haptic-bt"
            type="button"
            onClick={() => setVibrateEnabled(!vibrateEnabled)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              vibrateEnabled ? 'hover:bg-[#00FF9C]/10 text-[#00FF9C]' : 'hover:bg-slate-800/50 text-slate-400'
            }`}
            title={vibrateEnabled ? 'Vibration feedback enabled' : 'Vibration feedback disabled'}
          >
            <div className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded ${vibrateEnabled ? 'bg-[#00FF9C]/20 text-[#00FF9C]' : 'bg-transparent text-slate-500'}`}>
              VIBE
            </div>
          </button>
        </div>
      </div>

      {/* Main QR Scanner viewport or Manual text entry */}
      <div className="relative aspect-square w-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          {!isManualInputActive ? (
            <motion.div
              key="camera-preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full flex flex-col justify-between"
            >
              {/* Dynamic Camera Stream Target */}
              <div id={containerId} className="w-full h-full overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

              {/* Glassmorphic Scavenger HUD Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-10">
                  {/* Top HUD bar with info */}
                  <div className="w-full flex justify-between items-start">
                    <span className="bg-[#0A0A0B]/90 border border-white/10 text-[10px] text-white/60 font-mono px-2 py-0.5 rounded backdrop-blur-sm shadow">
                      VIDEO STREAM: LIVE
                    </span>
                    <span className="bg-[#00FF9C]/10 border border-[#00FF9C]/30 text-[10px] text-[#00FF9C] font-mono px-2 py-0.5 rounded backdrop-blur-sm shadow flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#00FF9C] rounded-full animate-ping" />
                      AUTO-DETECT
                    </span>
                  </div>

                  {/* High Quality Scan Bracket HUD Area */}
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Glowing brackets around the center target box */}
                    <div className="absolute inset-x-0 inset-y-0 border-2 border-transparent rounded-2xl scanner-glow-target">
                      {/* Top-Left Corner Bracket Accent */}
                      <div className="scanner-corners top-left" />
                      {/* Top-Right Corner Bracket Accent */}
                      <div className="scanner-corners top-right" />
                      {/* Bottom-Left Corner Bracket Accent */}
                      <div className="scanner-corners bottom-left" />
                      {/* Bottom-Right Corner Bracket Accent */}
                      <div className="scanner-corners bottom-right" />
                      
                      {/* Interactive sliding green laser line */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00FF9C] to-transparent scanner-laser shadow-[0_0_15px_#00FF9C]" />
                    </div>
                  </div>

                  {/* Help Tip at bottom over HUD */}
                  <div className="bg-[#0A0A0B]/95 border border-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl shadow text-xs text-white/80 text-center tracking-wide font-medium">
                    Align parcel QR identifier inside markers
                  </div>
                </div>
              )}

              {/* Loader/Spinner or Errors if Camera blocks or is Loading */}
              {!isScanning && !scannerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B]/90 text-center p-6 gap-3">
                  <RefreshCw className="w-10 h-10 text-[#00FF9C] animate-spin" />
                  <p className="font-mono text-xs tracking-widest text-[#00FF9C]/70">INITIALIZING FEED...</p>
                </div>
              )}

              {scannerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B] text-center p-8 gap-4">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-slate-300 max-w-sm leading-relaxed">{scannerError}</p>
                  <button
                    id="retry-camera-bt"
                    type="button"
                    onClick={() => {
                      if (selectedCameraId) startScanning(selectedCameraId);
                    }}
                    className="cursor-pointer font-bold text-xs text-black bg-[#00FF9C] py-2.5 px-5 rounded-full hover:bg-emerald-400 transition"
                  >
                    Retry Permission
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="manual-input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col justify-center p-8 bg-slate-950/90 backdrop-blur-xl"
            >
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-5 w-full">
                <div className="flex flex-col gap-2">
                  <label htmlFor="manual-parcel-id-input" className="text-[10px] font-black uppercase tracking-widest text-[#00FF9C]">
                    PARCEL ID ENTRY
                  </label>
                  <p className="text-xs text-white/50">
                    Input raw serial numeric sequence (e.g. 002-0002-001-00257716055)
                  </p>
                </div>
                
                <div className="relative">
                  <input
                    id="manual-parcel-id-input"
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="002-0002-001-00257716055"
                    autoFocus
                    autoComplete="off"
                    className="w-full bg-black/80 border border-white/10 focus:border-[#00FF9C] rounded-xl px-4 py-3.5 text-white font-mono text-base tracking-widest placeholder-slate-700 outline-none transition shadow-inner"
                  />
                  <button
                    id="submit-manual-bt"
                    type="submit"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-[#00FF9C] hover:bg-emerald-400 text-black rounded-lg transition duration-150 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {manualInputError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-rose-400 flex items-start gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{manualInputError}</span>
                  </motion.div>
                )}

                {/* Preload demo code helper block */}
                <div className="mt-2 p-3 bg-black/40 rounded-lg border border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Demo ID: 002-0002-001-0025771...</span>
                  <button
                    id="load-demo-code-btn"
                    type="button"
                    onClick={loadDemoId}
                    className="text-[#00FF9C] border border-[#00FF9C]/30 hover:border-[#00FF9C] hover:bg-[#00FF9C]/10 transition px-2 py-0.5 rounded cursor-pointer"
                  >
                    Load Demo ID
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Switch Input Mode Tab Button & Camera Selector footer bar */}
      <div className="flex flex-col gap-4">
        {/* Toggle Manual input mode */}
        <div className="flex justify-center">
          <button
            id="switch-scanner-input-type"
            type="button"
            onClick={() => {
              setIsManualInputActive(!isManualInputActive);
              setManualInputError('');
            }}
            className="group flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-[#00FF9C] transition cursor-pointer py-1.5"
          >
            {isManualInputActive ? (
              <>
                <Camera className="w-4 h-4 text-[#00FF9C] group-hover:scale-110 transition" />
                <span>Switch to Active Viewfinder Scan</span>
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4 text-[#00FF9C] group-hover:scale-110 transition" />
                <span>Trouble scanning? Enter ID manually</span>
              </>
            )}
          </button>
        </div>

        {/* Camera device selection box */}
        {!isManualInputActive && cameras.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-[#0A0A0B] border border-white/10 p-3 rounded-xl shadow-lg"
          >
            <Camera className="w-4 h-4 text-white/60 shrink-0" />
            <span className="text-xs text-white/60 font-medium whitespace-nowrap">Scan Hardware:</span>
            <select
              id="camera-select-dropdown"
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="w-full bg-transparent border-none text-xs text-[#00FF9C] font-mono font-medium outline-none cursor-pointer focus:ring-0"
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id} className="bg-black text-white">
                  {camera.label || `LENS PROFILE ${camera.id.substring(0, 5).toUpperCase()}`}
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </div>
    </div>
  );
}
