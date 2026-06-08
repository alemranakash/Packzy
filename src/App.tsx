/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useState } from 'react';
import {
  Camera,
  History,
  Globe,
  KeyRound,
  Settings,
  QrCode,
  Package,
  ArrowUpRight,
  Database,
  ExternalLink,
  Volume2,
  VolumeX,
  X,
  PlusCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanHistoryItem, ActiveTab, ScanMode } from './types';
import { extractParcelId, generatePackzyUrl } from './utils/parser';
import { feedback } from './utils/feedback';
import ScannerContainer from './components/ScannerContainer';
import HistoryList from './components/HistoryList';
import PackzyExplorer from './components/PackzyExplorer';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('SCANNER');
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [activeItem, setActiveItem] = useState<ScanHistoryItem | null>(null);
  
  // App Config Settings Modifiers
  const [scanMode, setScanMode] = useState<ScanMode>('EMBEDDED');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);
  
  // Sliding Overlays & feedback states
  const [isOverlayScannerOpen, setIsOverlayScannerOpen] = useState<boolean>(false);
  const [recentScanNotification, setRecentScanNotification] = useState<string | null>(null);

  // 1. Recover scans log registry on launch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('packzy_scan_registry');
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
        if (parsed.length > 0) {
          setActiveItem(parsed[0]);
        }
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
      return;
    }

    const newItem: ScanHistoryItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      parcelId: parsed.parcelId,
      scannedAt: new Date().toISOString(),
      format: parsed.format === 'URL' ? 'URL' : 'RAW_ID',
      url: generatePackzyUrl(parsed.parcelId)
    };

    // Append to registry, clear duplicates
    const updated = [newItem, ...history.filter(item => item.parcelId !== parsed.parcelId)].slice(0, 50);
    setHistory(updated);
    saveHistoryToStorage(updated);
    
    setActiveItem(newItem);
    setIsOverlayScannerOpen(false); // Close overlay scanner if triggered

    // Configured scanning workflow dispatch
    if (scanMode === 'EMBEDDED') {
      setActiveTab('EXPLORER');
      triggerToastNotification(`Consignment ${parsed.parcelId} embedded!`);
    } else {
      // Direct redirection in secondary browser window
      window.open(newItem.url, '_blank', 'noreferrer,noopener');
      triggerToastNotification(`Opened ${parsed.parcelId} in new tab!`);
    }
  };

  const handleManualScanReceived = (rawText: string) => {
    const parsed = extractParcelId(rawText);
    
    const newItem: ScanHistoryItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      parcelId: parsed.parcelId,
      scannedAt: new Date().toISOString(),
      format: 'MANUAL',
      url: generatePackzyUrl(parsed.parcelId)
    };

    const updated = [newItem, ...history.filter(item => item.parcelId !== parsed.parcelId)].slice(0, 50);
    setHistory(updated);
    saveHistoryToStorage(updated);
    
    setActiveItem(newItem);
    setIsOverlayScannerOpen(false);

    if (scanMode === 'EMBEDDED') {
      setActiveTab('EXPLORER');
      triggerToastNotification(`Consignment ${parsed.parcelId} embedded!`);
    } else {
      window.open(newItem.url, '_blank', 'noreferrer,noopener');
      triggerToastNotification(`Opened ${parsed.parcelId} in new tab!`);
    }
  };

  const triggerToastNotification = (message: string) => {
    setRecentScanNotification(message);
    setTimeout(() => {
      setRecentScanNotification(null);
    }, 4000);
  };

  // Re-load a history item
  const handleSelectRegistryItem = (item: ScanHistoryItem) => {
    setActiveItem(item);
    if (scanMode === 'EMBEDDED') {
      setActiveTab('EXPLORER');
    } else {
      window.open(item.url, '_blank', 'noreferrer,noopener');
      triggerToastNotification(`Loaded parcel ${item.parcelId} in tab!`);
    }
  };

  // Delete individual record
  const handleRemoveRegistryItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    saveHistoryToStorage(updated);
    
    if (activeItem && activeItem.id === id) {
      setActiveItem(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('packzy_scan_registry');
    setActiveItem(null);
  };

  const handleOpenPackzyAdminHome = () => {
    window.open('https://admin.packzy.com/admin', '_blank', 'noreferrer,noopener');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col font-sans relative">
      {/* Dynamic ambient color glowing nodes to create professional, unique vibe to match Bold Typography theme */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00FF9C]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Primary header bar */}
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand/Product Name literal identification: Bold Typography Theme matching Design HTML */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black border border-white/10 text-[#00FF9C] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,255,156,0.1)]">
              <QrCode className="w-5 h-5 animate-pulse text-[#00FF9C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black font-mono tracking-widest bg-[#00FF9C]/10 text-[#00FF9C] border border-[#00FF9C]/30 px-1.5 py-0.5 rounded">AUTO V1.2</span>
                <span className="text-[9px] text-white/40 font-black font-mono uppercase tracking-widest">LOGISTICS ENGINE</span>
              </div>
              <h1 className="font-display font-black text-2xl tracking-tighter text-white">
                PACKZY <span className="text-[#00FF9C] italic">SCAN</span>
              </h1>
            </div>
          </div>

          {/* Admin portal authentication & quick guidelines widgets */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* Direct Login Redirection helper */}
            <button
              id="login-redirect-btn"
              type="button"
              onClick={handleOpenPackzyAdminHome}
              className="cursor-pointer group relative overflow-hidden bg-black border border-white/10 hover:border-[#00FF9C]/40 font-black tracking-widest uppercase font-mono text-[10px] py-2.5 px-4 rounded-xl flex items-center gap-2 transition duration-200"
              title="Navigate directly to administrator panel to secure password login"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00FF9C]/0 via-[#00FF9C]/05 to-[#00FF9C]/0 group-hover:from-[#00FF9C]/05 transition duration-300" />
              <KeyRound className="w-3.5 h-3.5 text-[#00FF9C]" />
              <span className="text-[#00FF9C]">Log in</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </button>

            {/* Quick manual scan status badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-black border border-white/10 rounded-xl text-xs font-mono text-white/50">
              <Clock className="w-3.5 h-3.5 text-[#00FF9C]" />
              <span>LOGS TODAY: <b className="text-white">{history.length}</b></span>
            </div>
          </div>

        </div>
      </header>

      {/* Main navigation layouts: Bold black tactile tabs */}
      <nav id="view-tabs-navigation" className="bg-[#0A0A0B] border-b border-white/5 py-3 px-4">
        <div className="max-w-md mx-auto flex bg-black p-1 rounded-xl border border-white/10">
          <button
            id="tab-scanner-trigger"
            type="button"
            onClick={() => setActiveTab('SCANNER')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'SCANNER'
                ? 'bg-[#00FF9C]/10 border border-[#00FF9C]/30 text-[#00FF9C]'
                : 'text-white/40 hover:text-white hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scanner</span>
          </button>

          <button
            id="tab-history-trigger"
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-[#00FF9C]/10 border border-[#00FF9C]/30 text-[#00FF9C]'
                : 'text-white/40 hover:text-white hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Logs ({history.length})</span>
          </button>

          <button
            id="tab-explorer-trigger"
            type="button"
            onClick={() => setActiveTab('EXPLORER')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'EXPLORER'
                ? 'bg-[#00FF9C]/10 border border-[#00FF9C]/30 text-[#00FF9C]'
                : 'text-white/40 hover:text-white hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Portal</span>
          </button>
        </div>
      </nav>

      {/* Primary body section content viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start relative z-10">
        
        {/* Dynamic global Toast/Alert Banner */}
        <AnimatePresence>
          {recentScanNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-6 mx-auto w-full max-w-lg bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 py-3 px-4 rounded-xl flex items-center justify-between shadow-lg backdrop-blur-md relative z-35"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4.5 h-4.5 text-[#00FF9C] shrink-0" />
                <span className="text-xs font-medium">{recentScanNotification}</span>
              </div>
              <button
                id="close-toast-btn"
                type="button"
                onClick={() => setRecentScanNotification(null)}
                className="text-emerald-500 hover:text-emerald-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multi-screen route simulated content displays */}
        <AnimatePresence mode="wait">
          {activeTab === 'SCANNER' && (
            <motion.div
              key="scanner-layout-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {/* Scan Configuration control dashboard slider card */}
              <div className="max-w-xl mx-auto w-full bg-neutral-900/60 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#00FF9C] mb-4 flex items-center gap-1.5 font-mono">
                  <Settings className="w-3.5 h-3.5" />
                  <span>WORKFLOW CONTROL</span>
                </h3>

                <div className="flex flex-col gap-4 font-mono">
                  {/* Redirect/Embedded routing style */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Processing Mode</h4>
                      <p className="text-[10px] text-white/40 mt-0.5 font-sans leading-relaxed">Where scanned parcel details are targeted</p>
                    </div>

                    <div className="flex bg-black p-1 rounded-lg border border-white/10 self-start">
                      <button
                        id="set-mode-embedded-btn"
                        type="button"
                        onClick={() => setScanMode('EMBEDDED')}
                        className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer ${
                          scanMode === 'EMBEDDED' ? 'bg-[#00FF9C] text-black' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        Embed Frame
                      </button>
                      <button
                        id="set-mode-direct-btn"
                        type="button"
                        onClick={() => setScanMode('DIRECT_LINK')}
                        className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer ${
                          scanMode === 'DIRECT_LINK' ? 'bg-[#00FF9C] text-black' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        New Tab
                      </button>
                    </div>
                  </div>

                  {/* Settings diagnostics status */}
                  <div className="text-[10px] text-white/55 font-mono flex items-center gap-1.5 bg-black/50 p-2.5 rounded border border-white/5">
                    <Database className="w-3.5 h-3.5 text-[#00FF9C] shrink-0" />
                    <span><b>REGISTRY:</b> Auto-commit serial codes to Client LocalStorage. Secure sandbox active.</span>
                  </div>
                </div>
              </div>

              {/* The Live Scanner Frame */}
              <ScannerContainer
                onScanSuccess={handleQRScanReceived}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                vibrateEnabled={vibrateEnabled}
                setVibrateEnabled={setVibrateEnabled}
              />
            </motion.div>
          )}

          {activeTab === 'HISTORY' && (
            <motion.div
              key="history-layout-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <HistoryList
                history={history}
                onSelectResult={handleSelectRegistryItem}
                onRemoveItem={handleRemoveRegistryItem}
                onClearHistory={handleClearHistory}
              />
            </motion.div>
          )}

          {activeTab === 'EXPLORER' && (
            <motion.div
              key="explorer-layout-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <PackzyExplorer
                activeItem={activeItem}
                onTriggerFloatingScan={() => setIsOverlayScannerOpen(true)}
                onNavigateBack={() => setActiveTab('SCANNER')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BESPOKE FLOATING SCAN DRAWER MODAL ATTACHMENT */}
      {/* Enables lightning fast scanning of secondary items directly on the Packzy explorer frame overlay */}
      <AnimatePresence>
        {isOverlayScannerOpen && (
          <motion.div
            key="fullscreen-overlay-scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-6 backdrop-blur-md"
          >
            <div className="absolute top-4 right-4 z-55">
              <button
                id="close-overlay-scanner-btn"
                type="button"
                onClick={() => setIsOverlayScannerOpen(false)}
                className="p-3 bg-neutral-900 border border-white/10 text-white/50 hover:text-white rounded-full transition-all cursor-pointer flex items-center justify-center shadow"
              >
                <X className="w-5 h-5 font-black" />
              </button>
            </div>

            <div className="w-full max-w-lg flex flex-col gap-4">
              <div className="text-center mb-2">
                <span className="text-[9px] font-black font-mono text-[#00FF9C] tracking-widest uppercase bg-[#00FF9C]/10 border border-[#00FF9C]/30 px-2.5 py-1 rounded">
                  OVERLAY ADAPTER SCANNER
                </span>
                <h3 className="font-display text-md font-black text-white mt-2.5 tracking-wide uppercase font-mono">Scan Next Parcel ID</h3>
                <p className="text-xs text-white/40 max-w-xs mx-auto mt-1 leading-relaxed">
                  Decoded ID automatically overrides active Packzy portal view
                </p>
              </div>

              {/* The Live Video Cam container rendering right inside the dialog spacer */}
              <div className="bg-neutral-950 p-6 rounded-2xl border border-white/10 shadow-2xl relative">
                <ScannerContainer
                  onScanSuccess={handleQRScanReceived}
                  soundEnabled={soundEnabled}
                  setSoundEnabled={setSoundEnabled}
                  vibrateEnabled={vibrateEnabled}
                  setVibrateEnabled={setVibrateEnabled}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aesthetic status footer bar */}
      <footer className="bg-black/60 border-t border-white/5 py-5 px-6 text-center text-[10px] text-white/30 font-mono flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto w-full">
        <span>PACKZY SCAN &bull; ADMIN SECTOR COOPERATIVE AUXILIARY</span>
        <span>SECURE OFFLINE-FIRST REGISTRY PROCESSED LOCALLY</span>
      </footer>
    </div>
  );
}
