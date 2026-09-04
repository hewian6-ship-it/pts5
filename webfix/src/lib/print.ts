import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Quotation, BusinessSetting } from '../types';
import { formatMYR, formatDateKL } from './finance';

export const generateInvoicePDF = (
  invoice: Invoice,
  settings: BusinessSetting
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Brand
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName || 'PEACE TECH SOLUTION', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reg No: ${settings.regNumber || '202601019876'}`, 14, 26);
  doc.text(`Phone: ${settings.phone || '+60 3-2148 8888'}`, 14, 31);
  doc.text(`Email: ${settings.email || 'sales@peacetech.com.my'}`, 14, 36);

  // Address split
  const addressLines = doc.splitTextToSize(
    settings.address || 'Plaza Low Yat, Kuala Lumpur, Malaysia',
    90
  );
  doc.text(addressLines, 14, 41);

  // Document Title & Info Right Aligned
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('OFFICIAL INVOICE', 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${invoice.invoiceNo}`, 196, 28, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDateKL(invoice.date, 'dd/MM/yyyy HH:mm')}`, 196, 34, {
    align: 'right',
  });
  doc.text(`Payment Status: ${invoice.paymentStatus}`, 196, 39, {
    align: 'right',
  });
  doc.text(`Payment Method: ${invoice.paymentMethod}`, 196, 44, {
    align: 'right',
  });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 54, 196, 54);

  // Billed To
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 14, 61);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer: ${invoice.customerName}`, 14, 67);
  if (invoice.customerPhone && invoice.customerPhone !== '-') {
    doc.text(`Contact: ${invoice.customerPhone}`, 14, 72);
  }
  if (invoice.customerAddress) {
    const custAddrLines = doc.splitTextToSize(invoice.customerAddress, 80);
    doc.text(custAddrLines, 14, 77);
  }

  // Items Table
  const tableData = invoice.items.map((item, index) => [
    (index + 1).toString(),
    `${item.productName}\nSKU: ${item.sku} | Warranty: ${item.warranty || 'Standard'}`,
    item.quantity.toString(),
    formatMYR(item.unitPrice),
    item.discount > 0 ? `-${formatMYR(item.discount)}` : '-',
    formatMYR(item.subtotal),
  ]);

  autoTable(doc, {
    startY: 88,
    head: [['#', 'Description & Warranty', 'Qty', 'Unit Price', 'Disc', 'Subtotal']],
    body: tableData,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
    theme: 'grid',
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary Totals on Right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  doc.text('Subtotal Gross:', 140, finalY);
  doc.text(formatMYR(invoice.subtotal), 196, finalY, { align: 'right' });

  if (invoice.discount > 0) {
    doc.text('Total Discount:', 140, finalY + 6);
    doc.text(`-${formatMYR(invoice.discount)}`, 196, finalY + 6, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Final Total:', 140, finalY + 13);
  doc.text(formatMYR(invoice.total), 196, finalY + 13, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Paid Amount:', 140, finalY + 19);
  doc.text(formatMYR(invoice.paidAmount), 196, finalY + 19, { align: 'right' });

  if (invoice.balanceDue > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Balance Due:', 140, finalY + 25);
    doc.text(formatMYR(invoice.balanceDue), 196, finalY + 25, { align: 'right' });
    doc.setTextColor(30, 41, 59);
  }

  // Warranty & Bank Info on Left
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment & DuitNow QR Transfer:', 14, finalY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank: ${settings.qrBankName || 'Maybank'}`, 14, finalY + 5);
  doc.text(`Account No: ${settings.qrAccountNo || '5142 8900 1234'}`, 14, finalY + 10);
  doc.text(`Holder: ${settings.qrAccountHolder || 'PEACE TECH SOLUTION'}`, 14, finalY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Warranty Notice:', 14, finalY + 22);
  doc.setFont('helvetica', 'normal');
  const terms = doc.splitTextToSize(
    settings.warrantyTerms || 'Warranty void if physical damage, water damage or sticker broken.',
    115
  );
  doc.text(terms, 14, finalY + 27);

  // Footer Note
  doc.setFontSize(8);
  doc.text(
    settings.invoiceFooter || 'Thank you for choosing Peace Tech Solution!',
    105,
    285,
    { align: 'center' }
  );

  doc.save(`${invoice.invoiceNo}.pdf`);
};

export const generateQuotationPDF = (
  quotation: Quotation,
  settings: BusinessSetting
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Brand
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName || 'PEACE TECH SOLUTION', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reg No: ${settings.regNumber || '202601019876'}`, 14, 26);
  doc.text(`Phone: ${settings.phone || '+60 3-2148 8888'}`, 14, 31);
  doc.text(`Email: ${settings.email || 'sales@peacetech.com.my'}`, 14, 36);

  // Document Title & Info Right Aligned
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('FORMAL QUOTATION', 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Quotation No: ${quotation.quotationNo}`, 196, 28, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDateKL(quotation.date, 'dd/MM/yyyy')}`, 196, 34, {
    align: 'right',
  });
  doc.text(`Valid Until: ${formatDateKL(quotation.expiryDate, 'dd/MM/yyyy')}`, 196, 39, {
    align: 'right',
  });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 46, 196, 46);

  // Billed To
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ATTENTION TO:', 14, 53);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer: ${quotation.customerName}`, 14, 59);
  if (quotation.customerPhone && quotation.customerPhone !== '-') {
    doc.text(`Contact: ${quotation.customerPhone}`, 14, 64);
  }

  // Items Table
  const tableData = quotation.items.map((item, index) => [
    (index + 1).toString(),
    `${item.productName}\nSKU: ${item.sku}`,
    item.quantity.toString(),
    formatMYR(item.unitPrice),
    item.discount > 0 ? `-${formatMYR(item.discount)}` : '-',
    formatMYR(item.subtotal),
  ]);

  autoTable(doc, {
    startY: 74,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Disc', 'Subtotal']],
    body: tableData,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
    theme: 'grid',
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary Totals on Right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal Gross:', 140, finalY);
  doc.text(formatMYR(quotation.subtotal), 196, finalY, { align: 'right' });

  if (quotation.discount > 0) {
    doc.text('Discount:', 140, finalY + 6);
    doc.text(`-${formatMYR(quotation.discount)}`, 196, finalY + 6, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Quotation Total:', 140, finalY + 13);
  doc.text(formatMYR(quotation.total), 196, finalY + 13, { align: 'right' });

  // Notes
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', 14, finalY);
  doc.setFont('helvetica', 'normal');
  const terms = doc.splitTextToSize(
    quotation.terms || 'Prices quoted are in MYR and subject to availability.',
    115
  );
  doc.text(terms, 14, finalY + 5);

  doc.save(`${quotation.quotationNo}.pdf`);
};
