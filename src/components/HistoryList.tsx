/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScanHistoryItem } from '../types';
import { Trash2, ExternalLink, Copy, Check, Calendar, ArrowUpRight, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryListProps {
  history: ScanHistoryItem[];
  onSelectResult: (item: ScanHistoryItem) => void;
  onRemoveItem: (id: string) => void;
  onClearHistory: () => void;
}

export default function HistoryList({
  history,
  onSelectResult,
  onRemoveItem,
  onClearHistory,
}: HistoryListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation(); // Stop navigation click handler
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case 'URL':
        return 'bg-[#00FF9C]/10 text-[#00FF9C] border-[#00FF9C]/30 font-bold';
      case 'MANUAL':
        return 'bg-slate-900 text-white/70 border-white/10 font-bold';
      default:
        return 'bg-[#00FF9C]/20 text-[#00FF9C] border-[#00FF9C]/40 font-bold';
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto">
      {/* Header operations bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black tracking-widest text-[#00FF9C] uppercase font-mono">
          REGISTRY DATABASE ({history.length})
        </h3>
        {history.length > 0 && (
          <button
            id="clear-all-history-btn"
            type="button"
            onClick={() => {
              if (window.confirm('Do you want to wipe all stored scan logs from local memory?')) {
                onClearHistory();
              }
            }}
            className="text-[10px] font-black tracking-widest text-rose-400 uppercase hover:text-white transition flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full hover:bg-rose-500/25 cursor-pointer font-mono"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wipe Registry</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {history.length === 0 ? (
          <motion.div
            key="empty-registry-prompt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 bg-slate-950/40 rounded-2xl border border-white/5 text-center gap-4 shadow-xl"
          >
            <div className="p-4 bg-slate-900 border border-white/10 text-slate-500 rounded-full">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h4 className="text-sm font-bold text-white/90">No logs on local storage</h4>
              <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                Start scanning Packzy barcode id QRs or write a tracking sequence manually above to populate listings.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="registry-container-list"
            className="flex flex-col gap-3"
            initial="hidden"
            animate="show"
            variants={{
              show: {
                transition: {
                  staggerChildren: 0.04,
                },
              },
            }}
          >
            {history.map((item) => (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  show: { opacity: 1, x: 0 },
                }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                onClick={() => onSelectResult(item)}
                className="group flex items-center justify-between p-4 bg-black/40 border border-white/10 hover:border-[#00FF9C]/60 rounded-xl transition-all shadow-md cursor-pointer relative overflow-hidden"
              >
                {/* Background soft glow hover effect in green */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00FF9C]/0.04 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

                <div className="flex flex-col gap-2 relative z-10 select-none">
                  {/* Status, source & Time badge line */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] tracking-wider px-2 py-0.5 rounded border font-mono uppercase ${getFormatBadgeColor(item.format)}`}>
                      {item.format === 'URL' ? 'QR URL' : item.format === 'MANUAL' ? 'MANUAL' : 'PARCEL QR'}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.scannedAt)}
                    </span>
                  </div>

                  {/* Parcel ID display */}
                  <h4 className="text-sm font-bold tracking-widest font-mono text-white/90 group-hover:text-[#00FF9C] transition-colors">
                    {item.parcelId}
                  </h4>
                </div>

                {/* Operations column */}
                <div className="flex items-center gap-2 relative z-10">
                  {/* Copy code tool */}
                  <button
                    id={`copy-id-${item.id}`}
                    type="button"
                    onClick={(e) => handleCopy(e, item.id, item.parcelId)}
                    className={`p-2 rounded-lg border transition cursor-pointer ${
                      copiedId === item.id
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-black/40 border-white/10 hover:border-white/25 text-white/50 hover:text-white'
                    }`}
                    title="Copy Parcel ID"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Launch direct link */}
                  <a
                    id={`open-detail-${item.id}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()} // Stop row trigger, load target directly in new tab
                    className="p-2 rounded-lg border bg-black/40 border-white/10 hover:border-[#00FF9C]/40 text-white/50 hover:text-[#00FF9C] transition cursor-pointer"
                    title="Inspect on admin.packzy.com"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>

                  {/* Quick delete item */}
                  <button
                    id={`delete-record-${item.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="p-2 rounded-lg border bg-black/40 border-white/10 hover:border-rose-500/40 text-white/40 hover:text-rose-400 transition cursor-pointer"
                    title="Remove from memory logs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
