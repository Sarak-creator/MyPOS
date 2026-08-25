"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatUSD, formatKHR, formatDateTime } from "@/lib/utils";
import { CartItem, CustomerOption } from "@/store/posStore";

export interface ReceiptData {
  invoiceNumber: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  cashierName: string;
  customer?: CustomerOption | null;
  items: CartItem[];
  subtotalUsd: number;
  discountUsd: number;
  taxUsd: number;
  totalUsd: number;
  totalKhr: number;
  exchangeRateKhr: number;
  paymentMethod: string;
  tenderedUsd?: number;
  changeUsd?: number;
  khqrPayload?: string;
  date?: string;
}

interface ThermalReceiptProps {
  data: ReceiptData;
}

export default function ThermalReceipt({ data }: ThermalReceiptProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (data.khqrPayload) {
      QRCode.toDataURL(data.khqrPayload, { width: 140, margin: 1 }, (err, url) => {
        if (!err && url) setQrDataUrl(url);
      });
    }
  }, [data.khqrPayload]);

  return (
    <div
      id="printable-receipt"
      className="bg-white text-slate-900 font-mono text-[11px] leading-tight p-4 max-w-[80mm] mx-auto border border-slate-200 shadow-sm"
    >
      {/* Store Header */}
      <div className="text-center pb-2 border-b border-dashed border-slate-300">
        <h2 className="text-base font-extrabold font-sans text-slate-900">អាណាចក្រPOS</h2>
        <p className="text-[10px] text-slate-600 font-sans">{data.branchName}</p>
        {data.branchAddress && (
          <p className="text-[9px] text-slate-500">{data.branchAddress}</p>
        )}
        <p className="text-[9px] text-slate-500 font-sans">ទូរស័ព្ទ: {data.branchPhone || "012 888 999"}</p>
        <p className="text-xs font-bold mt-1 text-slate-800">វិក្កយបត្រ / INVOICE</p>
      </div>

      {/* Invoice Meta */}
      <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>លេខវិក្កយបត្រ:</span>
          <span className="font-bold">{data.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>កាលបរិច្ឆេទ:</span>
          <span>{data.date || formatDateTime(new Date())}</span>
        </div>
        <div className="flex justify-between">
          <span>បេឡាករ (Cashier):</span>
          <span>{data.cashierName}</span>
        </div>
        {data.customer && (
          <div className="flex justify-between font-sans">
            <span>អតិថិជន (Customer):</span>
            <span className="font-semibold">{data.customer.name}</span>
          </div>
        )}
      </div>

      {/* Itemized Table */}
      <div className="py-2 border-b border-dashed border-slate-300">
        <div className="grid grid-cols-12 font-bold text-[10px] pb-1 border-b border-slate-200">
          <span className="col-span-6">ទំនិញ (Item)</span>
          <span className="col-span-2 text-center">ចំនួន</span>
          <span className="col-span-4 text-right">សរុប ($)</span>
        </div>

        <div className="divide-y divide-slate-100 py-1 space-y-1">
          {data.items.map((item, idx) => {
            const lineTotal = item.priceUsd * item.quantity - item.discountAmount;
            return (
              <div key={idx} className="grid grid-cols-12 pt-1 text-[10px]">
                <div className="col-span-6 pr-1 font-sans">
                  <p className="font-medium text-slate-800 leading-tight">{item.nameKh}</p>
                  {item.selectedImei && (
                    <p className="text-[9px] text-slate-500">IMEI: {item.selectedImei}</p>
                  )}
                </div>
                <div className="col-span-2 text-center font-mono">
                  {item.quantity} x {item.priceUsd.toFixed(2)}
                </div>
                <div className="col-span-4 text-right font-mono font-semibold">
                  ${lineTotal.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Totals */}
      <div className="py-2 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
        <div className="flex justify-between">
          <span>សរុបបឋម (Subtotal):</span>
          <span className="font-mono">${data.subtotalUsd.toFixed(2)}</span>
        </div>
        {data.discountUsd > 0 && (
          <div className="flex justify-between text-red-600">
            <span>បញ្ចុះតម្លៃ (Discount):</span>
            <span className="font-mono">-${data.discountUsd.toFixed(2)}</span>
          </div>
        )}
        {data.taxUsd > 0 && (
          <div className="flex justify-between">
            <span>ពន្ធ (VAT):</span>
            <span className="font-mono">${data.taxUsd.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-300">
          <span>សរុបជាដុល្លារ (USD):</span>
          <span className="font-mono">{formatUSD(data.totalUsd)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold text-teal-800">
          <span>សរុបជារៀល (KHR):</span>
          <span className="font-sans">{formatKHR(data.totalUsd, data.exchangeRateKhr)}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="py-2 space-y-0.5 border-b border-dashed border-slate-300 text-[10px]">
        <div className="flex justify-between">
          <span>វិធីទូទាត់:</span>
          <span className="font-bold">{data.paymentMethod}</span>
        </div>
        {data.tenderedUsd !== undefined && data.tenderedUsd > 0 && (
          <>
            <div className="flex justify-between">
              <span>ប្រាក់ទទួល:</span>
              <span>${data.tenderedUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>ប្រាក់អាប់:</span>
              <span className="font-bold">${(data.changeUsd || 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Verification QR / Bakong KHQR */}
      {qrDataUrl && (
        <div className="py-2 text-center flex flex-col items-center">
          <p className="text-[9px] text-slate-500 font-sans mb-1">ស្កេនផ្ទៀងផ្ទាត់ / Bakong KHQR</p>
          <img src={qrDataUrl} alt="KHQR Code" className="h-24 w-24 border border-slate-200 p-1" />
        </div>
      )}

      {/* Footer message */}
      <div className="pt-2 text-center text-[10px] text-slate-500 font-sans">
        <p className="font-semibold text-slate-700">សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត</p>
        <p className="text-[9px] text-slate-400">ទំនិញទិញរួចមិនអាចប្តូរប្រាក់វិញបានទេ</p>
      </div>
    </div>
  );
}
