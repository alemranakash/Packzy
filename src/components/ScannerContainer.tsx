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
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-qr-scanner-element';
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const scanCooldownRef = useRef<boolean>(false);

  // Keep a mutable reference to the latest onScanSuccess callback to avoid stale closures
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Central QR processor to prevent continuous triggers, multiple beeps, or duplicate tab openings
  const handleDecodedQR = (decodedText: string) => {
    const now = Date.now();
    
    // 1. Global deaf cooldown (3s) to let the operator move the camera or handle the popup
    if (scanCooldownRef.current) {
      return;
    }

    // 2. Stricter duplicate delay (6s) for the same exact QR code to prevent accidental double reads
    const isDuplicate = lastScanRef.current.text === decodedText && (now - lastScanRef.current.time) < 6000;
    if (isDuplicate) {
      return;
    }

    // Valid scan detected! Lock duplicate registry the exact time we trigger the beep
    lastScanRef.current = { text: decodedText, time: now };
    
    // Enable global lock immediately
    scanCooldownRef.current = true;
    setTimeout(() => {
      scanCooldownRef.current = false;
    }, 3000);

    // Beep and vibrate EXACTLY ONCE
    if (soundEnabled) {
      feedback.playSuccessBeep();
    }
    if (vibrateEnabled) {
      feedback.triggerHapticFeedback();
    }

    // Execute the latest success handler (safely handles the current Auto vs Click-to-Open settings!)
    onScanSuccessRef.current(decodedText);
  };

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

  const checkTorchCapabilities = (html5QrCode: Html5Qrcode) => {
    try {
      const capabilities = html5QrCode.getRunningTrackCapabilities();
      if (capabilities && (capabilities as any).torch) {
        setIsTorchSupported(true);
      } else {
        setIsTorchSupported(false);
      }
    } catch (err) {
      console.warn('Failed to query torch capabilities:', err);
      setIsTorchSupported(false);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
    const nextTorchState = !isTorchOn;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorchState }]
      } as any);
      setIsTorchOn(nextTorchState);
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  const startScanning = async (cameraId: string) => {
    try {
      await stopScanning(); // Ensure previous is fully stopped
      setScannerError('');
      
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      // Tier 1: Relaxed camera identification without strict min/max constraints
      try {
        await html5QrCode.start(
          { deviceId: cameraId },
          {
            fps: 30,
            qrbox: (width, height) => {
              const minDim = Math.min(width, height);
              const size = Math.max(220, minDim * 0.85);
              return { width: size, height: size };
            },
            aspectRatio: undefined,
          },
          (decodedText) => {
            handleDecodedQR(decodedText);
          },
          () => {}
        );
        setIsScanning(true);
        checkTorchCapabilities(html5QrCode);
        return;
      } catch (t1Err) {
        console.warn('Tier 1 camera start failed, trying Tier 2 environment fallback:', t1Err);
      }

      // Tier 2: Standard environment/back camera preset (highly reliable on mobile devices)
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 30,
            qrbox: { width: 280, height: 280 },
            aspectRatio: undefined,
          },
          (decodedText) => {
            handleDecodedQR(decodedText);
          },
          () => {}
        );
        setIsScanning(true);
        checkTorchCapabilities(html5QrCode);
        return;
      } catch (t2Err) {
        console.warn('Tier 2 environment camera start failed, trying Tier 3 universal fallback:', t2Err);
      }

      // Tier 3: Zero-constraint direct device query (broadest compatibility)
      try {
        await html5QrCode.start(
          {},
          {
            fps: 24,
            qrbox: { width: 240, height: 240 },
          },
          (decodedText) => {
            handleDecodedQR(decodedText);
          },
          () => {}
        );
        setIsScanning(true);
        checkTorchCapabilities(html5QrCode);
        return;
      } catch (t3Err) {
        console.error('All camera initialization tiers failed:', t3Err);
        throw t3Err;
      }

    } catch (err: any) {
      console.error('Final fallback failure starting camera:', err);
      setScannerError(
        `Unable to access camera (${err?.message || 'Permission denied or iframe sandbox restriction'}). Please click the Manual Input button below to process parcel IDs.`
      );
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    setIsTorchOn(false);
    setIsTorchSupported(false);
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
      <div className="relative h-[360px] sm:h-[480px] md:h-[520px] lg:h-[580px] xl:h-[620px] w-full bg-slate-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
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

              {/* Torch Floating Controller Button (Top-Right) */}
              {isScanning && isTorchSupported && (
                <div className="absolute top-4 right-4 z-20">
                  <button
                    id="toggle-torch-floating-bt"
                    type="button"
                    onClick={toggleTorch}
                    className={`p-3 rounded-xl border backdrop-blur-md transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2 text-[10px] font-mono font-black uppercase tracking-wider ${
                      isTorchOn 
                        ? 'bg-[#00FF9C]/20 border-[#00FF9C] text-[#00FF9C] shadow-[0_0_15px_rgba(0,255,156,0.3)] scale-105' 
                        : 'bg-black/60 border-white/10 text-white hover:text-white hover:border-white/20 active:scale-95'
                    }`}
                    title={isTorchOn ? "Turn Flashlight OFF" : "Turn Flashlight ON"}
                  >
                    <Zap className={`w-4 h-4 ${isTorchOn ? 'fill-[#00FF9C] text-[#00FF9C] animate-pulse' : 'text-slate-400'}`} />
                    <span>{isTorchOn ? "Torch: On" : "Torch: Off"}</span>
                  </button>
                </div>
              )}

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
