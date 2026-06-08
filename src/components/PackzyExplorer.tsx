/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScanHistoryItem } from '../types';
import { ExternalLink, Camera, AlertCircle, RefreshCw, KeyRound, Globe, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PackzyExplorerProps {
  activeItem: ScanHistoryItem | null;
  onTriggerFloatingScan: () => void;
  onNavigateBack: () => void;
}

export default function PackzyExplorer({
  activeItem,
  onTriggerFloatingScan,
  onNavigateBack,
}: PackzyExplorerProps) {
  const [frameKey, setFrameKey] = useState<number>(0);
  const [isIframeBlockedHelpOpen, setIsIframeBlockedHelpOpen] = useState<boolean>(true);

  const handleRefreshFrame = () => {
    setFrameKey((prev) => prev + 1);
  };

  const handleOpenDirect = () => {
    if (activeItem) {
      window.open(activeItem.url, '_blank', 'noreferrer,noopener');
    }
  };

  const handleOpenAdminLogin = () => {
    window.open('https://admin.packzy.com/admin', '_blank', 'noreferrer,noopener');
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] flex flex-col bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <AnimatePresence mode="wait">
        {!activeItem ? (
          /* Empty State: Prompt scanner */
          <motion.div
            key="explorer-empty-status"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6"
          >
            <div className="relative w-24 h-24 flex items-center justify-center bg-slate-900/60 border border-white/10 rounded-2xl text-slate-500 shadow-xl">
              <span className="text-4xl font-extrabold font-mono text-white/50">?</span>
              <div className="absolute inset-0 border-2 border-dashed border-[#00FF9C]/40 rounded-2xl animate-spin-slow" style={{ animationDuration: '24s' }} />
            </div>

            <div className="flex flex-col gap-2 max-w-sm">
              <h3 className="font-display text-lg font-black tracking-widest text-[#00FF9C] uppercase font-mono">
                EXPLORER IDLE
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Connect and embed individual parcel tracking sheets. Scan an ID code above and we will seamlessly mount the live Packzy document here.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="empty-state-scan-trigger-btn"
                type="button"
                onClick={onTriggerFloatingScan}
                className="cursor-pointer font-black text-xs uppercase tracking-widest text-black bg-[#00FF9C] hover:bg-emerald-400 py-3.5 px-6 rounded-full shadow-[0_4px_20px_rgba(0,255,156,0.35)] transition duration-150 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Launch QR Reader</span>
              </button>

              <button
                id="empty-state-login-btn"
                type="button"
                onClick={handleOpenAdminLogin}
                className="cursor-pointer font-black text-xs uppercase tracking-widest text-white/90 bg-neutral-900 hover:bg-neutral-800 py-3 whitespace-nowrap px-6 border border-white/10 hover:border-white/20 rounded-full transition duration-150 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 stroke-[2]" />
                <span>Pre-Authenticate</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Active scan visualiser pane */
          <motion.div
            key={`explorer-active-${activeItem.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {/* Header console controls */}
            <div className="px-4 py-3 bg-neutral-900 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <button
                  id="explorer-back-btn"
                  type="button"
                  onClick={onNavigateBack}
                  className="p-1.5 rounded-lg bg-black/40 text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
                  title="Close and return"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00FF9C] animate-pulse" />
                    <span className="text-[9px] text-white/50 font-mono tracking-widest font-black uppercase">LIVE COOP INJECTION</span>
                  </div>
                  <h4 className="text-xs font-mono font-bold tracking-widest text-[#00FF9C] mt-0.5 mt-1 sm:max-w-xs truncate">
                    {activeItem.parcelId}
                  </h4>
                </div>
              </div>

              {/* Synchronous Action Tools */}
              <div className="flex items-center gap-2">
                {/* Refresh frame */}
                <button
                  id="refresh-explorer-frame-btn"
                  type="button"
                  onClick={handleRefreshFrame}
                  className="p-2 text-white/70 hover:text-[#00FF9C] hover:bg-[#00FF9C]/10 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 bg-black/40 border border-white/10"
                  title="Refresh frame contents"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-mono uppercase tracking-wider text-[10px] font-bold">Reload Frame</span>
                </button>

                {/* External backup browser linkage */}
                <button
                  id="open-external-consignment-btn"
                  type="button"
                  onClick={handleOpenDirect}
                  className="p-2 text-black bg-[#00FF9C] hover:bg-emerald-400 rounded-lg transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold shadow-md"
                  title="Open consignment window directly"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="font-mono uppercase tracking-wider text-[10px] font-black">New Tab</span>
                </button>
              </div>
            </div>

            {/* Diagnostic warning of Sandbox limitations */}
            {isIframeBlockedHelpOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#00FF9C]/5 border-b border-[#00FF9C]/10 px-4 py-2.5 flex items-center justify-between text-xs text-[#00FF9C] gap-2 relative z-10"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">
                    If page is blank, security headers block cross-site frames. Hit <b>New Tab</b> to bypass sandbox issues instantly.
                  </span>
                </div>
                <button
                  id="dismiss-sandbox-info-btn"
                  type="button"
                  onClick={() => setIsIframeBlockedHelpOpen(false)}
                  className="text-[10px] text-white/50 hover:text-[#00FF9C] font-black uppercase font-mono tracking-widest cursor-pointer"
                >
                  CLOSE
                </button>
              </motion.div>
            )}

            {/* The interactive Packzy Web Portal Frame */}
            <div className="flex-1 w-full relative bg-slate-950">
              <iframe
                id="packzy-portal-inline-iframe"
                key={frameKey}
                src={activeItem.url}
                title="Packzy Consignment Console"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                className="w-full h-full border-0 bg-white"
              />

              {/* Split layout float warning */}
              <div className="absolute bottom-5 left-5 bg-black/90 border border-white/10 p-3 rounded-xl shadow-lg flex items-center gap-2.5 max-w-xs z-10 pointer-events-auto">
                <div className="p-2 bg-[#00FF9C]/10 border border-[#00FF9C]/20 text-[#00FF9C] rounded-lg">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#00FF9C] font-mono">Packzy Link</h4>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-normal font-sans">
                    Requires portal login to load console components.
                  </p>
                </div>
              </div>

              {/* IMMERSIVE PULSATING FLOATING ACTION BUTTON */}
              {/* As requested: "there will a button or floating button to scan other id even it is on webpage https://admin.packzy.com/admin/consignment/single/id." */}
              <div className="absolute bottom-6 right-6 z-30">
                <motion.button
                  id="floating-scan-interactive-btn"
                  type="button"
                  onClick={onTriggerFloatingScan}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative group w-14 h-14 flex items-center justify-center bg-[#00FF9C] hover:bg-emerald-400 text-black rounded-full shadow-[0_4px_24px_rgba(0,255,156,0.6)] cursor-pointer outline-none transition"
                  title="Scan next parcel ID QR"
                >
                  {/* Rotating decorative halo rings */}
                  <div className="absolute -inset-1 rounded-full bg-[#00FF9C]/30 blur-sm group-hover:bg-[#00FF9C]/40 transition pointer-events-none animate-pulse" />
                  <div className="absolute -inset-3 rounded-full border border-[#00FF9C]/10 group-hover:border-[#00FF9C]/30 transition pointer-events-none" />
                  
                  {/* Primary Scanner focal icon */}
                  <Camera className="w-6 h-6 stroke-[2.5]" />

                  {/* Pulsing warning identifier badge */}
                  <div className="absolute -top-1 -right-1 bg-black text-[#00FF9C] border border-[#00FF9C]/30 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full shadow">
                    Next
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
