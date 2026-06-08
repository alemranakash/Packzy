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
  isCompact?: boolean;
}

export default function ScannerContainer({
  onScanSuccess,
  soundEnabled,
  setSoundEnabled,
  vibrateEnabled,
  setVibrateEnabled,
  isCompact = true,
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
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

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
          setScannerError('No camera devices detected. Try typing manually.');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Error fetching cameras:', err);
        setScannerError('Camera access denied or blocked. Please grant permission.');
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
            // Generous scanning box
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size }; // Full square QR scan target
          },
          aspectRatio: isCompact ? 1.333333 : 1.0,
        },
        (decodedText) => {
          // Success callback with duplicate prevention (beep only once in 3 seconds)
          const now = Date.now();
          const isDuplicate = lastScanRef.current.text === decodedText && (now - lastScanRef.current.time) < 3000;
          if (!isDuplicate) {
            lastScanRef.current = { text: decodedText, time: now };
            if (soundEnabled) feedback.playSuccessBeep();
            if (vibrateEnabled) feedback.triggerHapticFeedback();
            onScanSuccess(decodedText);
          }
        },
        () => {
          // Silent callback for frame scanning misses
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      // Fallback
      try {
        if (scannerRef.current) {
          await scannerRef.current.start(
            { facingMode: 'environment' },
            { fps: 12, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              // Success callback with duplicate prevention (beep only once in 3 seconds)
              const now = Date.now();
              const isDuplicate = lastScanRef.current.text === decodedText && (now - lastScanRef.current.time) < 3000;
              if (!isDuplicate) {
                lastScanRef.current = { text: decodedText, time: now };
                if (soundEnabled) feedback.playSuccessBeep();
                if (vibrateEnabled) feedback.triggerHapticFeedback();
                onScanSuccess(decodedText);
              }
            },
            () => {}
          );
          setIsScanning(true);
          setScannerError('');
        }
      } catch (innerErr: any) {
        setScannerError(
          `Unable to access camera. You can input parcel IDs manually.`
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
      setManualInputError('Invalid code format.');
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
    <div id="scanner-view-container" className="flex flex-col gap-3 w-full max-w-2xl mx-auto font-sans">
      {/* Main QR Scanner viewport or Manual text entry */}
      <div className={`relative ${isCompact ? 'h-[280px] sm:h-[400px]' : 'aspect-square'} w-full bg-slate-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl`}>
        <AnimatePresence mode="wait">
          {!isManualInputActive ? (
            <motion.div
              key="camera-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full flex flex-col justify-between"
            >
              {/* Dynamic Camera Stream Target */}
              <div id={containerId} className="w-full h-full overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

              {/* Glassmorphic overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3 z-10 bg-black/10">
                  {/* Glowing brackets around the center target box */}
                  <div className="absolute inset-x-4 inset-y-4 border-2 border-transparent rounded-xl scanner-glow-target">
                    <div className="scanner-corners top-left border-t-2 border-l-2 border-[#00FF9C]" />
                    <div className="scanner-corners top-right border-t-2 border-r-2 border-[#00FF9C]" />
                    <div className="scanner-corners bottom-left border-b-2 border-l-2 border-[#00FF9C]" />
                    <div className="scanner-corners bottom-right border-b-2 border-r-2 border-[#00FF9C]" />
                    
                    {/* Sliding green laser line */}
                    <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-[#00FF9C] to-transparent scanner-laser shadow-[0_0_10px_#00FF9C]" />
                  </div>
                </div>
              )}

              {/* Loader */}
              {!isScanning && !scannerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-center p-4 gap-2">
                  <RefreshCw className="w-6 h-6 text-[#00FF9C] animate-spin" />
                  <p className="font-mono text-[10px] tracking-widest text-[#00FF9C]/70 font-bold">LOADING CAMERA FEED...</p>
                </div>
              )}

              {scannerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-center p-6 gap-3">
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{scannerError}</p>
                  <button
                    id="retry-camera-bt"
                    type="button"
                    onClick={() => {
                      if (selectedCameraId) startScanning(selectedCameraId);
                    }}
                    className="cursor-pointer font-bold text-[10px] uppercase text-black bg-[#00FF9C] py-2 px-4 rounded-lg hover:bg-emerald-400 transition"
                  >
                    Retry
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="manual-input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col justify-center p-4 sm:p-6 bg-slate-950/95"
            >
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 w-full">
                <input
                  id="manual-parcel-id-input"
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="Paste or Type raw ID (e.g. 002-0002-...)"
                  autoFocus
                  autoComplete="off"
                  className="w-full bg-black border border-white/10 focus:border-[#00FF9C] rounded-lg px-3 py-2 text-white font-mono text-xs placeholder-slate-700 outline-none transition"
                />

                {manualInputError && (
                  <div className="text-[10px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{manualInputError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mt-1">
                  <button
                    id="load-demo-code-btn"
                    type="button"
                    onClick={loadDemoId}
                    className="text-[9px] font-mono text-[#00FF9C]/80 hover:text-[#00FF9C]"
                  >
                    Load Demo ID
                  </button>

                  <button
                    id="submit-manual-bt"
                    type="submit"
                    className="cursor-pointer font-bold text-[10px] tracking-wider uppercase text-black bg-[#00FF9C] hover:bg-emerald-400 py-1.5 px-3 rounded-lg transition duration-150 flex items-center gap-1"
                  >
                    <span>Submit</span>
                    <ArrowRight className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera Swapper & controls footer */}
      <div className="flex flex-row items-center justify-between gap-3 bg-neutral-900/60 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-mono text-white/50">
        <button
          id="switch-scanner-input-type"
          type="button"
          onClick={() => {
            setIsManualInputActive(!isManualInputActive);
            setManualInputError('');
          }}
          className="hover:text-[#00FF9C] transition cursor-pointer font-bold uppercase flex items-center gap-1"
        >
          {isManualInputActive ? (
            <>
              <Camera className="w-3 h-3 text-[#00FF9C]" />
              <span>Camera View</span>
            </>
          ) : (
            <>
              <Clipboard className="w-3 h-3 text-[#00FF9C]" />
              <span>Type Manually</span>
            </>
          )}
        </button>

        {!isManualInputActive && cameras.length > 1 && (
          <div className="flex items-center gap-1.5 max-w-[150px] sm:max-w-[200px]">
            <select
              id="camera-select-dropdown"
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="bg-transparent border-none text-[9px] text-[#00FF9C] font-mono font-bold outline-none cursor-pointer focus:ring-0 truncate"
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id} className="bg-black text-white">
                  {camera.label || `LENS PROFILE ${camera.id.substring(0, 5).toUpperCase()}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            id="toggle-audio-bt"
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={` transition cursor-pointer font-bold uppercase ${soundEnabled ? 'text-[#00FF9C]' : 'text-slate-500'}`}
          >
            {soundEnabled ? 'SOUND: ON' : 'SOUND: OFF'}
          </button>
          <span>&middot;</span>
          <button
            id="toggle-haptic-bt"
            type="button"
            onClick={() => setVibrateEnabled(!vibrateEnabled)}
            className={` transition cursor-pointer font-bold uppercase ${vibrateEnabled ? 'text-[#00FF9C]' : 'text-slate-500'}`}
          >
            {vibrateEnabled ? 'VIBE: ON' : 'VIBE: OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
