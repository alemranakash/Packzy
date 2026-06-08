/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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
    if (isAutoSubmit) {
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
      <div className="flex-1 overflow-y-auto scrolling-touch px-4 py-4 flex flex-col gap-4">
        
        {/* Banner Toast Notification */}
        <AnimatePresence>
          {recentScanNotification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-neutral-900 border border-neutral-800 text-slate-200 py-2 px-3 rounded-lg text-xs font-mono tracking-wide shadow-xl flex items-center justify-between"
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

        {/* ACTIVE RESOLVED ACTION BOARD: Shows scanned item prominently with large touch trigger */}
        <div className="bg-neutral-950 border border-white/5 rounded-xl p-4 flex flex-col gap-3 relative">
          <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase text-[#00FF9C] tracking-widest">
            <span>CURRENT SCAN STREAM</span>
            {activeParcelId && (
              <span className="bg-[#00FF9C]/10 px-2 py-0.5 rounded text-[9px] border border-[#00FF9C]/20">
                READY
              </span>
            )}
          </div>

          {activeParcelId ? (
            <motion.div
              key="active-parcel-filled"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-3"
            >
              <div className="bg-black/60 border border-white/10 rounded-lg p-3">
                <div className="text-[10px] font-mono text-white/40 font-bold uppercase">PARCEL ID</div>
                <div className="text-sm font-mono font-black text-white selection:bg-[#00FF9C] selection:text-black mt-1 break-all">
                  {activeParcelId}
                </div>
              </div>

              {/* GIANT ACTION REDIRECT TRIGGER (Solves Popup Blockers elegantly) */}
              <button
                type="button"
                onClick={handleOpenDirect}
                className="w-full bg-[#00FF9C] text-black font-black py-3 rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-emerald-400 transition cursor-pointer shadow-[0_4px_16px_rgba(0,255,156,0.25)] animate-bounce"
              >
                <span>Open in Packzy</span>
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              </button>
            </motion.div>
          ) : (
            <div className="border border-white/5 bg-black/40 rounded-lg p-6 text-center">
              <Camera className="w-8 h-8 text-neutral-600 mx-auto stroke-[1.5]" />
              <p className="text-[11px] font-mono text-white/40 font-bold mt-2.5">
                Camera viewfinder ready. Scan or type a parcel ID code to redirect instantly.
              </p>
            </div>
          )}
        </div>

        {/* ALWAYS-ACTIVE STREAM SCANNER MODULE */}
        <div className="bg-neutral-950 border border-white/5 rounded-xl p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-1 gap-2 border-b border-white/5 pb-2">
            <span className="text-[10px] font-mono font-black uppercase text-white/50 tracking-widest select-none">
              LIVE VIEWPORT CAMERA
            </span>

            {/* Submit Trigger Mode Switcher */}
            <div className="flex bg-black p-0.5 rounded-lg border border-white/10 text-[9px] font-mono font-bold shrink-0">
              <button
                type="button"
                onClick={() => handleSetAutoSubmit(true)}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  isAutoSubmit ? 'bg-[#00FF9C] text-black font-black' : 'text-white/60 hover:text-white'
                }`}
                title="Automatically redirect to webpage upon scan detection"
              >
                Auto Open
              </button>
              <button
                type="button"
                onClick={() => handleSetAutoSubmit(false)}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  !isAutoSubmit ? 'bg-[#00FF9C] text-black font-black' : 'text-white/60 hover:text-white'
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
            isCompact={true}
          />
        </div>

        {/* CUSTOM WEBPAGE LINK CONTROLLER / CONFIGURATION */}
        <div className="bg-neutral-950 border border-white/5 rounded-xl p-3 flex flex-col gap-3">
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
                className="w-full bg-black border border-white/10 focus:border-[#00FF9C] text-xs font-mono text-[#00FF9C] px-3 py-2 rounded-lg outline-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 text-[10px] font-mono font-bold font-black">
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(false)}
                  className="px-3 py-1.5 bg-neutral-900 border border-white/10 hover:border-white/20 active:bg-neutral-800 rounded-md transition cursor-pointer text-white/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#00FF9C] text-black rounded-md hover:bg-emerald-400 transition cursor-pointer"
                >
                  Save & Open
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-black/60 border border-white/5 rounded-lg p-2 px-3">
              <div className="flex flex-col overflow-hidden leading-tight">
                <span className="text-[9px] font-mono font-bold text-white/30 uppercase">CURRENT URL</span>
                <span className="text-[10px] font-mono text-[#00FF9C] truncate max-w-[200px] sm:max-w-md mt-0.5" title={activeUrl}>
                  {activeUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempUrlInput(activeUrl);
                  setIsEditingUrl(true);
                }}
                className="text-[10px] font-mono font-black uppercase text-white bg-white/5 border border-white/10 hover:bg-white/10 px-2.5 py-1.5 rounded transition cursor-pointer shrink-0"
              >
                Edit Link
              </button>
            </div>
          )}
        </div>

        {/* LOG LOGISTICS REGISTRY (SCAN HISTORY) */}
        <div className="bg-neutral-950 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1 text-[10px] font-mono font-black uppercase tracking-widest text-white/40">
            <span>SCAN REGISTRY ({history.length})</span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-rose-400 hover:text-rose-300 transition shrink-0 uppercase font-black"
              >
                Clear Log
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-6 text-center text-xs text-white/30 font-mono flex flex-col items-center justify-center gap-1.5">
              <Inbox className="w-5 h-5 text-neutral-800" />
              <span>Empty registry</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto scrolling-touch">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectHistoryItem(item)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5 hover:border-[#00FF9C]/30 hover:bg-[#00FF9C]/5 transition duration-150 text-left cursor-pointer"
                >
                  <div className="flex flex-col leading-tight overflow-hidden mr-2">
                    <span className="text-[11px] font-mono font-bold tracking-tight text-white/95 truncate">
                      {item.parcelId}
                    </span>
                    <span className="text-[8px] font-mono text-white/30 mt-0.5">
                      {new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, item.id, item.parcelId)}
                      className={`p-1.5 rounded border transition cursor-pointer ${
                        copiedId === item.id 
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' 
                          : 'border-white/5 bg-black/60 text-white/50 hover:text-white hover:border-white/10'
                      }`}
                      title="Copy raw parcel ID string"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveHistoryItem(e, item.id)}
                      className="p-1.5 rounded border border-white/5 bg-black/60 text-white/40 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
                      title="Delete record from memory"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STEP BY STEP NATIVE INSTRUCTION MODULE */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-amber-400">
            <Info className="w-3.5 h-3.5" />
            <span>HOW TO RUN WITH CHROME TABS</span>
          </div>
          <ol className="text-[10px] font-mono text-white/50 space-y-1.5 leading-relaxed list-decimal list-inside pl-1">
            <li>Open the Portal Login using the header button to log in once.</li>
            <li>Align parcel QR codes with your camera; scanned IDs open directly.</li>
            <li>If redirects are locked by popups, tap the beautiful pulsing green link.</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
