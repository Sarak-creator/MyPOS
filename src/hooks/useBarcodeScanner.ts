"use client";

import { useEffect, useRef } from "react";
import { usePOSStore } from "@/store/posStore";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minBarcodeLength?: number;
  maxKeyIntervalMs?: number;
}

/**
 * Custom React hook for capturing USB and Bluetooth Hardware Barcode & QR Scanner Guns (HID).
 * Distinguishes rapid hardware scanner keystrokes (< 50ms) from manual human keyboard typing.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minBarcodeLength = 3,
  maxKeyIntervalMs = 60,
}: UseBarcodeScannerOptions) {
  const { scannerMode } = usePOSStore();
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const isHardwareScannerActive =
    enabled && (scannerMode === "SCANNER_DEVICE" || scannerMode === "BOTH");

  useEffect(() => {
    if (!isHardwareScannerActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // If user presses Enter
      if (e.key === "Enter") {
        const scanned = bufferRef.current.trim();
        bufferRef.current = "";

        if (scanned.length >= minBarcodeLength) {
          // If rapid keystroke sequence was detected
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(scanned);
        }
        return;
      }

      // We only care about single printable characters (letters, numbers, punctuation)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If interval between characters is greater than maxKeyIntervalMs, reset buffer
        // (unless it's the very first character of the scan sequence)
        if (timeSinceLastKey > maxKeyIntervalMs && bufferRef.current.length > 0) {
          // Not a barcode gun scan, reset buffer
          bufferRef.current = "";
        }

        // If an input is focused, only buffer if typing speed is superhuman (< maxKeyIntervalMs)
        if (isInputFocused) {
          if (timeSinceLastKey <= maxKeyIntervalMs || bufferRef.current.length === 0) {
            bufferRef.current += e.key;
          } else {
            bufferRef.current = "";
          }
        } else {
          // If no input is focused, buffer all rapid characters
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isHardwareScannerActive, minBarcodeLength, maxKeyIntervalMs]);
}
