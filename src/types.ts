/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScanHistoryItem {
  id: string;
  parcelId: string;
  scannedAt: string;
  format: 'RAW_ID' | 'URL' | 'MANUAL';
  url: string;
  notes?: string;
}

export type ScanMode = 'EMBEDDED' | 'DIRECT_LINK';

export interface AppConfig {
  scanMode: ScanMode;
  autoRedirect: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  preferredCameraId?: string;
}

export type ActiveTab = 'SCANNER' | 'HISTORY' | 'EXPLORER';
