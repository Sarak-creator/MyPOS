"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Camera,
  X,
  Volume2,
  VolumeX,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ScanBarcode,
  Sliders,
  Keyboard,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { playScanSuccessBeep, playScanErrorBeep } from "@/lib/scannerAudio";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

interface CameraDevice {
  id: string;
  label: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "ស្កេនបាកូដ / QR Code (Camera Scanner)",
}: BarcodeScannerModalProps) {
  const {
    preferredCameraId,
    scannerSoundFeedback,
    scannerContinuousMode,
    setScannerConfig,
  } = usePOSStore();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(preferredCameraId || "");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "pos-html5-qr-scanner";
  const lastScanTimestampRef = useRef<number>(0);

  // Initialize and get list of available cameras
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initCameras() {
      try {
        setErrorMsg(null);
        setPermissionDenied(false);

        // Fetch cameras using Html5Qrcode
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          const mapped = devices.map((d, index) => ({
            id: d.id,
            label: d.label || `Camera ${index + 1}`,
          }));
          setCameras(mapped);

          // Select preferred camera if saved and available, else choose back/environment camera or first camera
          const existingPreferred = mapped.find((c) => c.id === preferredCameraId);
          if (existingPreferred) {
            setSelectedCameraId(existingPreferred.id);
          } else {
            // Prefer back / environment camera on mobile
            const backCam = mapped.find((c) =>
              /back|rear|environment|ក្រោយ/i.test(c.label)
            );
            setSelectedCameraId(backCam ? backCam.id : mapped[0].id);
          }
        } else {
          setErrorMsg("រកមិនឃើញកាមេរ៉ានៅលើឧបករណ៍នេះទេ (No camera devices found).");
        }
      } catch (err: any) {
        console.error("Camera detection error:", err);
        if (
          err?.name === "NotAllowedError" ||
          err?.message?.includes("Permission") ||
          err?.name === "PermissionDeniedError"
        ) {
          setPermissionDenied(true);
          setErrorMsg("សូមអនុញ្ញាតឱ្យកម្មវិធីប្រើប្រាស់កាមេរ៉ា (Camera permission denied).");
        } else {
          setErrorMsg("មិនអាចបើកកាមេរ៉ាបានទេ: " + (err?.message || ""));
        }
      }
    }

    initCameras();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isCancelled = false;

    async function startCamera() {
      // Stop any existing instance
      await stopScanner();
      if (isCancelled) return;

      try {
        setErrorMsg(null);
        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.max(220, Math.floor(minEdge * 0.75));
            const boxHeight = Math.max(160, Math.floor(minEdge * 0.55));
            return { width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          selectedCameraId,
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Frame parse error - ignore standard noise
          }
        );

        if (!isCancelled) {
          setIsScanning(true);
          // Check torch capability
          try {
            const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
            if (track && track.torchFeature && track.torchFeature().isSupported()) {
              setHasTorch(true);
            }
          } catch {
            setHasTorch(false);
          }
        }
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        if (!isCancelled) {
          setErrorMsg("បរាជ័យក្នុងការបើកកាមេរ៉ា: " + (err?.message || ""));
          setIsScanning(false);
        }
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        // Ignore stop error
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
      setIsTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      const nextState = !isTorchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn("Torch toggle not supported on this device", err);
    }
  };

  const handleScanSuccess = (text: string) => {
    const now = Date.now();
    const cleanText = text.trim();
    if (!cleanText) return;

    // Debounce duplicate scans of the exact same code within 1.5 seconds
    if (cleanText === lastScannedCode && now - lastScanTimestampRef.current < 1500) {
      return;
    }

    lastScanTimestampRef.current = now;
    setLastScannedCode(cleanText);

    if (scannerSoundFeedback) {
      playScanSuccessBeep();
    }

    // Trigger scan callback
    onScan(cleanText);

    // If continuous mode is disabled, close modal
    if (!scannerContinuousMode) {
      setTimeout(() => {
        onClose();
      }, 350);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
    setManualCode("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                {title}
                {isScanning && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                គាំទ្របាកូដទំនិញ 1D (EAN/UPC/Code128) & 2D QR Code
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title="បិទ (Close)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[420px] overflow-hidden">
          {/* HTML5 QR Container */}
          <div
            id={scannerContainerId}
            className="w-full h-full min-h-[280px] overflow-hidden"
          />

          {/* Animated Overlay Reticle */}
          {isScanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-[75%] max-w-[280px] h-[190px] border-2 border-teal-400/60 rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />

                {/* Laser Animation Bar */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-bounce" />
              </div>
            </div>
          )}

          {/* Error / Permission Banner */}
          {errorMsg && (
            <div className="absolute inset-x-4 top-4 z-20 flex items-center gap-2 rounded-xl bg-rose-900/90 border border-rose-700 p-3 text-xs text-rose-100 shadow-xl backdrop-blur-md">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">{errorMsg}</p>
                {permissionDenied && (
                  <p className="text-[10px] text-rose-200 mt-0.5">
                    សូមចុចប៊ូតុង Camera Icon នៅលើរបារអាសយដ្ឋាន Browser (URL Bar) ហើយជ្រើសរើស "Allow"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Last Scanned Feedback Toast */}
          {lastScannedCode && (
            <div className="absolute bottom-3 inset-x-4 z-20 flex items-center justify-between gap-2 rounded-xl bg-emerald-950/90 border border-emerald-500/60 p-2.5 text-xs text-emerald-200 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="truncate font-mono font-bold text-white">
                  ស្កេនបាន: {lastScannedCode}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold shrink-0">
                ✓ បានទទួល
              </span>
            </div>
          )}
        </div>

        {/* Toolbar & Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Camera Selection & Quick Toggles */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Camera Select Dropdown */}
            {cameras.length > 1 && (
              <div className="flex-1 min-w-[180px]">
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCameraId(id);
                    setScannerConfig({ preferredCameraId: id });
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:border-teal-500 focus:outline-hidden"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      📷 {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Flashlight Torch Toggle */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl border transition ${
                    isTorchOn
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                  title={isTorchOn ? "បិទភ្លើងពិល (Flash Off)" : "បើកភ្លើងពិល (Flash On)"}
                >
                  {isTorchOn ? <Flashlight className="h-4 w-4 text-amber-400" /> : <FlashlightOff className="h-4 w-4" />}
                </button>
              )}

              {/* Sound Beep Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !scannerSoundFeedback;
                  setScannerConfig({ scannerSoundFeedback: next });
                  if (next) playScanSuccessBeep();
                }}
                className={`p-2 rounded-xl border transition ${
                  scannerSoundFeedback
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
                title={scannerSoundFeedback ? "សំឡេង Beep: បើក" : "សំឡេង Beep: បិទ"}
              >
                {scannerSoundFeedback ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {/* Continuous Scanning Toggle */}
              <button
                type="button"
                onClick={() => {
                  setScannerConfig({ scannerContinuousMode: !scannerContinuousMode });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  scannerContinuousMode
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
                title="ស្កេនបន្តបន្ទាប់ដោយមិនបាច់បិទផ្ទាំង (Continuous Scan Mode)"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${scannerContinuousMode ? "text-teal-400" : ""}`} />
                <span className="text-[11px]">
                  {scannerContinuousMode ? "ស្កេនជាប់គ្នា" : "ស្កេនម្តងៗ"}
                </span>
              </button>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="វាយលេខបាកូដដោយដៃ ប្រសិនបើកាមេរ៉ាមើលមិនច្បាស់..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white transition shrink-0"
            >
              បញ្ចូល
            </button>
          </form>

          {/* Hint */}
          <p className="text-[10px] text-center text-slate-400 leading-tight">
            💡 តម្រង់បាកូដ ឬ QR Code ឱ្យចំក្នុងប្រអប់ដើម្បីស្កេន។ ប្រសិនបើប្រើ Scanner កាំភ្លើង (USB Barcode Gun) អ្នកអាចបាញ់បានភ្លាមៗគ្រប់ពេល!
          </p>
        </div>
      </div>
    </div>
  );
}
