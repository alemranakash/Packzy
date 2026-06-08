/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedScanResult {
  parcelId: string;
  format: 'RAW_ID' | 'URL';
  isValid: boolean;
}

/**
 * Robustly parses and extracts parcel IDs from a range of possible scanned QR inputs.
 * Supports:
 * 1. Raw parcel IDs (e.g. 002-0002-001-00257716055)
 * 2. Full URLs (e.g. https://admin.packzy.com/admin/consignment/single/002-0002-001-00257716055)
 * 3. Fallback: returns the trimmed scanned string
 */
export function extractParcelId(scannedText: string): ParsedScanResult {
  const trimmed = scannedText.trim();
  if (!trimmed) {
    return { parcelId: '', format: 'RAW_ID', isValid: false };
  }

  // 1. Check for URL signatures
  try {
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('packzy.com') ||
      trimmed.includes('/consignment/') ||
      trimmed.includes('admin')
    ) {
      // Standardize protocol for URL class parsing
      const urlString = trimmed.startsWith('http') ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
      const parsedUrl = new URL(urlString);
      const paths = parsedUrl.pathname.split('/').filter(Boolean);
      
      // The parcel ID is usually the last path parameter or in query strings
      if (paths.length > 0) {
        let potentialId = paths[paths.length - 1];
        
        // Handle trailing query params or hashes (URL parses pathname without them, so just verification check)
        potentialId = potentialId.split('?')[0].split('#')[0];
        
        if (potentialId && potentialId.length >= 4) {
          return {
            parcelId: potentialId,
            format: 'URL',
            isValid: true
          };
        }
      }
    }
  } catch (err) {
    // Parser fallback-safe
  }

  // 2. Check for standard parcel ID pattern: multi-part hyphenated strings (e.g. 002-0002-001-00257716055)
  // Let's check if the text contains a sequence of alphanumeric pieces parted by hyphens
  const hyphenPattern = /[a-zA-Z0-9]{2,10}(-[a-zA-Z0-9]{2,15})+/;
  const match = trimmed.match(hyphenPattern);
  if (match) {
    return {
      parcelId: match[0],
      format: 'RAW_ID',
      isValid: true
    };
  }

  // 3. Fallback to raw pruned input (general alphanumeric string)
  const isAlphanumeric = /^[a-zA-Z0-9-]+$/.test(trimmed);
  return {
    parcelId: trimmed,
    format: 'RAW_ID',
    isValid: isAlphanumeric && trimmed.length > 3
  };
}

/**
 * Returns the target Packzy consignment administration URL for a given parcel ID
 */
export function generatePackzyUrl(parcelId: string): string {
  return `https://admin.packzy.com/admin/consignment/single/${encodeURIComponent(parcelId)}`;
}
