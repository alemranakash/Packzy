/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Camera,
  History,
  ArrowUpRight,
  ExternalLink,
  X,
  Sparkles,
  Clipboard,
  Trash2,
  Copy,
  Check,
  Globe,
  Inbox,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanHistoryItem } from './types';
import { extractParcelId, generatePackzyUrl } from './utils/parser';
import { feedback } from './utils/feedback';
import ScannerContainer from './components/ScannerContainer';

export default function App() {
  const [activeParcelId, setActiveParcelId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>('https://admin.packzy.com/admin/login');
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // App settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);
  const [recentScanNotification, setRecentScanNotification] = useState<string | null>(null);
  
  // Custom Webpage link editing
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [tempUrlInput, setTempUrlInput] = useState<string>('https://admin.packzy.com/admin/');

  // Auto-submit vs click-to-submit setting
  const [isAutoSubmit, setIsAutoSubmit] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('packzy_auto_submit');
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  // Keep a mutable ref synchronized with our configuration state
  const isAutoSubmitRef = useRef<boolean>(isAutoSubmit);
  useEffect(() => {
    isAutoSubmitRef.current = isAutoSubmit;
  }, [isAutoSubmit]);

  const handleSetAutoSubmit = (val: boolean) => {
    setIsAutoSubmit(val);
    try {
      localStorage.setItem('packzy_auto_submit', JSON.stringify(val));
    } catch {}
  };

  // 1. Recover scans log registry on launch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('packzy_scan_registry');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not restore scan logs from local memory', e);
    }
  }, []);

  // 2. Persist whenever history is updated
  const saveHistoryToStorage = (newHistory: ScanHistoryItem[]) => {
    try {
      localStorage.setItem('packzy_scan_registry', JSON.stringify(newHistory));
    } catch (e) {
      console.warn('Could not save scan logs to local memory', e);
    }
  };

  // 3. Central scan parser dispatch
  const handleQRScanReceived = (rawText: string) => {
    const parsed = extractParcelId(rawText);
    if (!parsed.isValid) {
      if (soundEnabled) feedback.playErrorBeep();
      triggerToastNotification('Invalid parcel ID format scanned.');
      return;
    }

    const targetUrl = generatePackzyUrl(parsed.parcelId);

    const newItem: ScanHistoryItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      parcelId: parsed.parcelId,
      scannedAt: new Date().toISOString(),
      format: parsed.format === 'URL' ? 'URL' : 'RAW_ID',
      url: targetUrl
    };

    // Append to registry, remove duplicates
    const updated = [newItem, ...history.filter(item => item.parcelId !== parsed.parcelId)].slice(0, 50);
    setHistory(updated);
    saveHistoryToStorage(updated);
    
    setActiveParcelId(parsed.parcelId);
    setActiveUrl(targetUrl);
    
    // Play sound / haptics feedback (handled already once in ScannerContainer with the single beep mode!)
    triggerToastNotification(`Scanned ID: ${parsed.parcelId}`);

    // Try starting instant redirection in a new tab if Auto Submit is enabled
    if (isAutoSubmitRef.current) {
      try {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Silent redirect blocked by browser popup blockers.', err);
      }
    }
  };

  const triggerToastNotification = (message: string) => {
    setRecentScanNotification(message);
    setTimeout(() => {
      setRecentScanNotification(null);
    }, 4000);
  };

  // Re-open/dispatch a history item
  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    setActiveParcelId(item.parcelId);
    setActiveUrl(item.url);
    try {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('Redirect blocked.', err);
    }
  };

  const handleCopy = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    triggerToastNotification('ID copied to clipboard.');
  };

  // Delete individual record
  const handleRemoveHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    saveHistoryToStorage(updated);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all local scan logs?')) {
      setHistory([]);
      localStorage.removeItem('packzy_scan_registry');
    }
  };

  const handleOpenDirect = () => {
    window.open(activeUrl, '_blank', 'noreferrer,noopener');
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUrlInput.trim()) {
      let formattedUrl = tempUrlInput.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      setActiveUrl(formattedUrl);
      
      const parsed = extractParcelId(formattedUrl);
      if (parsed.isValid) {
        setActiveParcelId(parsed.parcelId);
      } else {
        setActiveParcelId(null);
      }
      
      setIsEditingUrl(false);
      triggerToastNotification('Webpage link updated.');
      
      // Auto open updated URL in new tab as requested
      try {
        window.open(formattedUrl, '_blank', 'noreferrer,noopener');
      } catch (err) {}
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black text-white flex flex-col font-sans overflow-hidden select-none">
      {/* 1. Header Bar: Minimal, Premium Accent */}
      <header className="h-[52px] bg-neutral-950 border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gradient-to-tr from-emerald-600 to-[#00FF9C] rounded flex items-center justify-center">
            <Globe className="w-3 text-black stroke-[3]" />
          </div>
          <span className="text-xs font-black tracking-widest text-[#00FF9C] uppercase font-mono">PACKZY NODE</span>
        </div>

        {/* Quick Login Shortcut */}
        <button
          type="button"
          onClick={() => {
            window.open('https://admin.packzy.com/admin/login', '_blank');
            triggerToastNotification('Opening Portal Login...');
          }}
          className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 px-2.5 py-1 rounded transition duration-150 flex items-center gap-1.5 cursor-pointer text-white/90"
        >
          <Lock className="w-3 h-3 text-[#00FF9C]" />
          <span>Login Portal</span>
        </button>
      </header>

      {/* 2. Scrollable Utility Interface */}
      <div className="flex-1 overflow-y-auto scrolling-touch px-4 py-4 md:py-6 flex flex-col justify-start items-center">
        <div className="w-full max-w-3xl flex flex-col gap-5">
          
          {/* Banner Toast Notification */}
          <AnimatePresence>
            {recentScanNotification && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-neutral-900 border border-neutral-800 text-slate-200 py-2.5 px-4 rounded-xl text-xs font-mono tracking-wide shadow-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00FF9C] shrink-0" />
                  <span>{recentScanNotification}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRecentScanNotification(null)}
                  className="text-white/40 hover:text-white cursor-pointer ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE DETECTION PORTAL ACTION BAR */}
          {activeParcelId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-neutral-950 border-2 border-[#00FF9C]/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,255,156,0.1)]"
            >
              <div className="flex flex-col text-center sm:text-left leading-tight">
                <span className="text-[10px] font-mono uppercase text-[#00FF9C] tracking-widest font-black">
                  DETECTION CAPTURED
                </span>
                <span className="text-sm font-mono font-black text-white mt-1 break-all select-all">
                  ID: {activeParcelId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenDirect}
                className="w-full sm:w-auto bg-[#00FF9C] text-black font-black px-6 py-3 rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-emerald-400 transition cursor-pointer shadow-[0_4px_16px_rgba(0,255,156,0.25)] shrink-0 active:scale-95"
              >
                <span>Open Link</span>
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              </button>
            </motion.div>
          )}

          {/* ALWAYS-ACTIVE STREAM SCANNER MODULE */}
          <div className="bg-neutral-950 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 gap-4 border-b border-white/5">
              <span className="text-[10px] font-mono font-black uppercase text-white/50 tracking-wider select-none">
                LIVE VIEWPORT CAMERA
              </span>

              {/* Submit Trigger Mode Switcher */}
              <div className="flex bg-black p-0.5 rounded-lg border border-white/10 text-[9px] font-mono font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetAutoSubmit(true)}
                  className={`px-3 py-1.5 rounded transition cursor-pointer ${
                    isAutoSubmit ? 'bg-[#00FF9C] text-black font-black font-extrabold' : 'text-white/60 hover:text-white'
                  }`}
                  title="Automatically redirect to webpage upon scan detection"
                >
                  Auto Open
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAutoSubmit(false)}
                  className={`px-3 py-1.5 rounded transition cursor-pointer ${
                    !isAutoSubmit ? 'bg-[#00FF9C] text-black font-black font-extrabold' : 'text-white/60 hover:text-white'
                  }`}
                  title="Hold scan and show Click to Submit button instead"
                >
                  Click to Open
                </button>
              </div>
            </div>

            <ScannerContainer
              onScanSuccess={handleQRScanReceived}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              vibrateEnabled={vibrateEnabled}
              setVibrateEnabled={setVibrateEnabled}
              isCompact={false}
            />
          </div>

          {/* CUSTOM WEBPAGE LINK CONTROLLER / CONFIGURATION (At the bottom) */}
          <div className="bg-neutral-950 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <div className="text-[10px] font-mono font-black uppercase text-white/40 tracking-widest">
              TARGET PORTAL SETTING
            </div>

            {isEditingUrl ? (
              <form onSubmit={handleSaveCustomUrl} className="flex flex-col gap-2 mt-1">
                <input
                  id="edit-portal-url-input"
                  type="text"
                  value={tempUrlInput}
                  onChange={(e) => setTempUrlInput(e.target.value)}
                  placeholder="https://admin.packzy.com/admin/..."
                  className="w-full bg-black border border-white/10 focus:border-[#00FF9C] text-xs font-mono text-[#00FF9C] px-3 py-2.5 rounded-lg outline-none"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2 text-[10px] font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setIsEditingUrl(false)}
                    className="px-3 py-1.5 bg-neutral-900 border border-white/10 hover:border-white/20 active:bg-neutral-800 rounded-md transition cursor-pointer text-white/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#00FF9C] text-black rounded-md hover:bg-emerald-400 transition cursor-pointer font-black"
                  >
                    Save & Open
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3 bg-black/60 border border-white/5 rounded-lg p-3">
                <div className="flex flex-col overflow-hidden leading-tight">
                  <span className="text-[9px] font-mono font-bold text-white/30 uppercase">CURRENT URL</span>
                  <span className="text-[10px] font-mono text-[#00FF9C] truncate max-w-[180px] sm:max-w-lg mt-0.5" title={activeUrl}>
                    {activeUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTempUrlInput(activeUrl);
                    setIsEditingUrl(true);
                  }}
                  className="text-[10px] font-mono font-black uppercase text-white bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded transition cursor-pointer shrink-0"
                >
                  Edit Link
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
