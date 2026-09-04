import React, { useState } from 'react';
import { Invoice, BusinessSetting } from '../../types';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { generateInvoicePDF } from '../../lib/print';
import { Printer, Download, X, FileText, Receipt, CheckCircle2 } from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: Invoice | null;
  settings: BusinessSetting | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  settings,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'A4' | 'THERMAL'>('A4');

  if (!invoice || !settings) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateInvoicePDF(invoice, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        {/* Header Toolbar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 font-semibold">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Invoice Preview: {invoice.invoiceNo}
              </h2>
              <p className="text-xs text-slate-500">
                {formatDateKL(invoice.date, 'dd/MM/yyyy HH:mm')} | Customer: {invoice.customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-medium mr-2">
              <button
                type="button"
                onClick={() => setViewMode('A4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'A4'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                A4 Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setViewMode('THERMAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'THERMAL'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                80mm Thermal Receipt
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 print:bg-white print:p-0">
          {viewMode === 'A4' ? (
            /* A4 Document Layout */
            <div className="max-w-[210mm] mx-auto bg-white p-8 sm:p-10 rounded-lg shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    {settings.businessName}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Reg No: <span className="font-medium text-slate-800">{settings.regNumber}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Tel: {settings.phone} | Email: {settings.email}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm leading-relaxed">
                    {settings.address}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                    OFFICIAL INVOICE
                  </span>
                  <div className="mt-3 text-right">
                    <p className="text-sm font-bold text-slate-900">{invoice.invoiceNo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Date: {formatDateKL(invoice.date, 'dd/MM/yyyy HH:mm')}
                    </p>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                      Payment: <span className="font-semibold text-indigo-700">{invoice.paymentMethod}</span> (
                      <span className="text-emerald-700 font-bold">{invoice.paymentStatus}</span>)
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Customer Information
                  </p>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{invoice.customerName}</h3>
                  {invoice.customerPhone && invoice.customerPhone !== '-' && (
                    <p className="text-xs text-slate-600 mt-0.5">Contact: {invoice.customerPhone}</p>
                  )}
                  {invoice.customerAddress && (
                    <p className="text-xs text-slate-600 mt-0.5 max-w-md">{invoice.customerAddress}</p>
                  )}
                </div>
                {invoice.paymentStatus === 'PAID' && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    PAID IN FULL
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-xs font-bold text-slate-700 uppercase">
                      <th className="py-2.5 px-2 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Item Description & Warranty</th>
                      <th className="py-2.5 px-2 text-center w-14">Qty</th>
                      <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                      <th className="py-2.5 px-3 text-right w-24">Discount</th>
                      <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-3 px-2 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5">
                            <span>SKU: {item.sku}</span>
                            {item.warranty && (
                              <span className="text-indigo-600 font-medium">Warranty: {item.warranty}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">{item.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatMYR(item.unitPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600">
                          {item.discount > 0 ? `-${formatMYR(item.discount)}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                          {formatMYR(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-start">
                {/* Bank / QR info */}
                <div className="w-1/2 pr-6">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bank & DuitNow QR Information
                  </h4>
                  <div className="mt-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-0.5">
                    <p><span className="font-semibold text-slate-900">Bank:</span> {settings.qrBankName}</p>
                    <p><span className="font-semibold text-slate-900">Account No:</span> {settings.qrAccountNo}</p>
                    <p><span className="font-semibold text-slate-900">Account Holder:</span> {settings.qrAccountHolder}</p>
                  </div>

                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-4">
                    Warranty Terms & Conditions
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                    {settings.warrantyTerms}
                  </p>
                </div>

                {/* Calculation Summary */}
                <div className="w-1/2 max-w-xs space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-medium">{formatMYR(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600 font-medium">
                      <span>Total Discounts:</span>
                      <span className="font-mono">-{formatMYR(invoice.discount)}</span>
                    </div>
                  )}
                  {invoice.appliedDepositAmount && invoice.appliedDepositAmount > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600 font-medium">
                      <span>Applied Deposit:</span>
                      <span className="font-mono">-{formatMYR(invoice.appliedDepositAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b-2 border-slate-900 text-base font-black text-slate-900">
                    <span>Total:</span>
                    <span className="font-mono text-indigo-700">{formatMYR(invoice.total)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-700 font-semibold">
                    <span>Paid Amount ({invoice.paymentMethod}):</span>
                    <span className="font-mono">{formatMYR(invoice.paidAmount)}</span>
                  </div>
                  {invoice.cashReceived !== undefined && invoice.changeGiven !== undefined && (
                    <>
                      <div className="flex justify-between py-0.5 text-slate-500">
                        <span>Cash Received:</span>
                        <span className="font-mono">{formatMYR(invoice.cashReceived)}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-slate-500">
                        <span>Change Returned:</span>
                        <span className="font-mono">{formatMYR(invoice.changeGiven)}</span>
                      </div>
                    </>
                  )}
                  {invoice.balanceDue > 0 && (
                    <div className="flex justify-between py-1 text-rose-600 font-bold border-t border-rose-200">
                      <span>Balance Due:</span>
                      <span className="font-mono">{formatMYR(invoice.balanceDue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature & Footer */}
              <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                <div className="text-center w-48">
                  <div className="h-16 border-b border-slate-400 mb-2"></div>
                  <p className="font-semibold text-slate-800">Customer Signature</p>
                  <p className="text-[10px] text-slate-400">Goods received in good condition</p>
                </div>
                <div className="text-center w-48">
                  <div className="h-16 border-b border-slate-400 mb-2 flex items-end justify-center pb-1">
                    <span className="text-[11px] font-bold text-slate-700 tracking-wider">PEACE TECH SOLUTION</span>
                  </div>
                  <p className="font-semibold text-slate-800">Authorized Signature / Stamp</p>
                  <p className="text-[10px] text-slate-400">Computer & IT Services</p>
                </div>
              </div>

              <div className="mt-8 text-center text-[11px] text-slate-400">
                {settings.invoiceFooter}
              </div>
            </div>
          ) : (
            /* 80mm Thermal Receipt Layout */
            <div className="max-w-[80mm] mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200 font-mono text-[12px] text-slate-900 leading-tight print:border-none print:shadow-none print:p-0">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="text-base font-black uppercase tracking-wider">{settings.businessName}</h2>
                <p className="text-[10px] text-slate-600 mt-0.5">Reg: {settings.regNumber}</p>
                <p className="text-[10px] text-slate-600">{settings.phone}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{settings.address}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>RECEIPT:</span>
                  <span>{invoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Date:</span>
                  <span>{formatDateKL(invoice.date, 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span className="font-medium truncate max-w-[120px]">{invoice.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cashier / User:</span>
                  <span>007</span>
                </div>
              </div>

              {/* Items */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase border-b border-slate-200">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center w-8">Qty</th>
                      <th className="py-1 text-right w-16">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {invoice.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-1.5 pr-1">
                          <p className="font-semibold text-slate-900 leading-tight">{it.productName}</p>
                          <p className="text-[10px] text-slate-500">
                            {it.quantity} x {formatMYR(it.unitPrice)}
                            {it.discount > 0 && ` (Disc -${formatMYR(it.discount)})`}
                          </p>
                          {it.warranty && <p className="text-[9px] text-indigo-600">Wty: {it.warranty}</p>}
                        </td>
                        <td className="py-1.5 text-center font-bold">{it.quantity}</td>
                        <td className="py-1.5 text-right font-bold">{formatMYR(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatMYR(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{formatMYR(invoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatMYR(invoice.total)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Paid ({invoice.paymentMethod}):</span>
                  <span>{formatMYR(invoice.paidAmount)}</span>
                </div>
                {invoice.cashReceived !== undefined && (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>Cash Tendered:</span>
                      <span>{formatMYR(invoice.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Change:</span>
                      <span>{formatMYR(invoice.changeGiven || 0)}</span>
                    </div>
                  </>
                )}
                {invoice.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>Balance Due:</span>
                    <span>{formatMYR(invoice.balanceDue)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">{settings.invoiceFooter}</p>
                <p>Please retain receipt for warranty claim.</p>
                <p>*** THANK YOU ***</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
