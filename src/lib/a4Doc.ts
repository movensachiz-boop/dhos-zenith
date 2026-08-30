import { jsPDF } from 'jspdf';

export type A4Line = { description: string; quantity: number; unitPrice: number };

export type A4DocInput = {
  docTitle: string; // "QUOTATION" | "UPFRONT PAYMENT RECEIPT"
  docNumber: string;
  date: Date;
  validUntil?: Date;
  customerName?: string;
  customerPhone?: string;
  customerNumber?: string;
  customerAddress?: string;
  lines: A4Line[];
  subtotal: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  notes?: string;
  logoSrc: string;
  store: { name: string; tagline: string; phone: string };
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function buildA4Html(d: A4DocInput) {
  const rows = d.lines
    .map(
      (l, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(l.description)}</td>
        <td class="num">${l.quantity}</td>
        <td class="num">${money(l.unitPrice)}</td>
        <td class="num">${money(l.quantity * l.unitPrice)}</td>
      </tr>`
    )
    .join('');

  const row = (label: string, value: string, strong = false) =>
    `<tr><td>${label}</td><td class="num${strong ? ' strong' : ''}">${value}</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8" /><title>${esc(d.docTitle)} ${esc(
    d.docNumber
  )}</title><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, Helvetica, sans-serif; color: #111; font-size: 12px; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #E91E8C; padding-bottom: 12px; }
    header img { width: 110px; height: auto; }
    .brand h1 { margin: 0; font-size: 22px; color: #E91E8C; }
    .brand p { margin: 2px 0; color: #444; font-size: 11px; }
    .doc { text-align: right; }
    .doc h2 { margin: 0; font-size: 20px; letter-spacing: 2px; }
    .doc p { margin: 2px 0; font-size: 11px; }
    .parties { display: flex; gap: 24px; margin: 20px 0; }
    .card { flex: 1; border: 1px solid #eee; border-left: 3px solid #E91E8C; padding: 10px 12px; }
    .card h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #E91E8C; }
    .card div { margin: 2px 0; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.items th { background: #111; color: #fff; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
    table.items td { padding: 8px; border-bottom: 1px solid #eee; }
    .num { text-align: right; }
    .totals { width: 260px; margin-left: auto; margin-top: 14px; border-collapse: collapse; }
    .totals td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .totals .strong { font-size: 15px; font-weight: 700; color: #E91E8C; }
    .notes { margin-top: 24px; border-top: 1px dashed #ccc; padding-top: 10px; color: #444; }
    footer { margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: center; color: #666; font-size: 10px; }
    .sig { display: flex; gap: 40px; margin-top: 40px; }
    .sig div { flex: 1; border-top: 1px solid #999; padding-top: 4px; font-size: 10px; text-align: center; }
  </style></head><body>
    <header>
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${d.logoSrc}" alt="${esc(d.store.name)} logo" />
        <div class="brand">
          <h1>${esc(d.store.name)}</h1>
          <p>${esc(d.store.tagline)}</p>
          <p>Tel: ${esc(d.store.phone)}</p>
        </div>
      </div>
      <div class="doc">
        <h2>${esc(d.docTitle)}</h2>
        <p><strong>No:</strong> ${esc(d.docNumber)}</p>
        <p><strong>Date:</strong> ${d.date.toLocaleDateString()}</p>
        ${d.validUntil ? `<p><strong>Valid until:</strong> ${d.validUntil.toLocaleDateString()}</p>` : ''}
      </div>
    </header>

    <section class="parties">
      <div class="card">
        <h3>Billed To</h3>
        <div><strong>${esc(d.customerName || 'Walk-in customer')}</strong></div>
        ${d.customerPhone ? `<div>Contact: ${esc(d.customerPhone)}</div>` : ''}
        ${d.customerNumber ? `<div>Customer No: ${esc(d.customerNumber)}</div>` : ''}
        ${d.customerAddress ? `<div>${esc(d.customerAddress)}</div>` : ''}
      </div>
      <div class="card">
        <h3>Summary</h3>
        <div>Items: ${d.lines.length}</div>
        ${d.paymentMethod ? `<div>Payment: ${esc(d.paymentMethod)}</div>` : ''}
        <div>Total: <strong>${money(d.total)}</strong></div>
        ${d.balanceDue !== undefined ? `<div>Balance due: <strong>${money(d.balanceDue)}</strong></div>` : ''}
      </div>
    </section>

    <table class="items">
      <thead><tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals">
      ${row('Subtotal', money(d.subtotal))}
      ${d.discount ? row('Discount', `-${money(d.discount)}`) : ''}
      ${row('Total', money(d.total), true)}
      ${d.amountPaid !== undefined ? row('Upfront paid', money(d.amountPaid)) : ''}
      ${d.balanceDue !== undefined ? row('Balance due', money(d.balanceDue), true) : ''}
    </table>

    ${d.notes ? `<div class="notes"><strong>Notes:</strong><br/>${esc(d.notes).replace(/\n/g, '<br/>')}</div>` : ''}

    <div class="sig">
      <div>Customer signature</div>
      <div>For ${esc(d.store.name)}</div>
    </div>

    <footer>
      ${esc(d.store.name)} &middot; ${esc(d.store.tagline)} &middot; Tel ${esc(d.store.phone)}<br/>
      Thank you for your business.
    </footer>
  </body></html>`;
}

export async function downloadA4Pdf(d: A4DocInput, fileName: string) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pink = [233, 30, 140] as const;
  const left = 14;
  const right = 196;
  let y = 16;

  try {
    const cached = localStorage.getItem('mc_logo_data_url');
    const response = await fetch(cached || d.logoSrc);
    const blob = await response.blob();
    const logo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    pdf.addImage(logo, blob.type.includes('jpeg') ? 'JPEG' : 'PNG', left, y, 28, 28);
  } catch {
    // The document remains usable offline even when the logo was not cached.
  }

  pdf.setTextColor(...pink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(d.store.name, 46, 23);
  pdf.setTextColor(68, 68, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(d.store.tagline, 46, 29);
  pdf.text(`Tel: ${d.store.phone}`, 46, 34);
  pdf.setTextColor(17, 17, 17);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(d.docTitle, right, 19, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`No: ${d.docNumber}`, right, 26, { align: 'right' });
  pdf.text(`Date: ${d.date.toLocaleDateString()}`, right, 31, { align: 'right' });
  if (d.validUntil) pdf.text(`Valid until: ${d.validUntil.toLocaleDateString()}`, right, 36, { align: 'right' });
  pdf.setDrawColor(...pink);
  pdf.setLineWidth(0.8);
  pdf.line(left, 46, right, 46);

  y = 54;
  pdf.setDrawColor(225, 225, 225);
  pdf.setLineWidth(0.25);
  pdf.rect(left, y, 86, 31);
  pdf.rect(106, y, 90, 31);
  pdf.setTextColor(...pink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('BILLED TO', 18, y + 6);
  pdf.text('SUMMARY', 110, y + 6);
  pdf.setTextColor(17, 17, 17);
  pdf.setFontSize(9);
  pdf.text(d.customerName || 'Walk-in customer', 18, y + 12);
  pdf.setFont('helvetica', 'normal');
  const customerDetails = [d.customerPhone && `Contact: ${d.customerPhone}`, d.customerNumber && `Customer No: ${d.customerNumber}`, d.customerAddress].filter(Boolean) as string[];
  customerDetails.slice(0, 3).forEach((line, i) => pdf.text(line, 18, y + 18 + i * 5));
  pdf.text(`Items: ${d.lines.length}`, 110, y + 12);
  if (d.paymentMethod) pdf.text(`Payment: ${d.paymentMethod}`, 110, y + 18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Total: ${money(d.total)}`, 110, y + 24);
  if (d.balanceDue !== undefined) pdf.text(`Balance due: ${money(d.balanceDue)}`, 110, y + 29);

  y = 94;
  const cols = [left, 24, 116, 139, 167, right];
  pdf.setFillColor(17, 17, 17);
  pdf.rect(left, y, right - left, 9, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  ['#', 'DESCRIPTION', 'QTY', 'UNIT', 'AMOUNT'].forEach((label, i) => pdf.text(label, cols[i] + 2, y + 6));
  y += 9;
  pdf.setTextColor(17, 17, 17);
  pdf.setFont('helvetica', 'normal');
  d.lines.forEach((line, i) => {
    const description = pdf.splitTextToSize(line.description, 86)[0] || '';
    pdf.text(String(i + 1), cols[0] + 2, y + 6);
    pdf.text(description, cols[1] + 2, y + 6);
    pdf.text(String(line.quantity), cols[3] - 2, y + 6, { align: 'right' });
    pdf.text(money(line.unitPrice), cols[4] - 2, y + 6, { align: 'right' });
    pdf.text(money(line.quantity * line.unitPrice), cols[5] - 2, y + 6, { align: 'right' });
    pdf.setDrawColor(230, 230, 230);
    pdf.line(left, y + 9, right, y + 9);
    y += 9;
  });

  y += 5;
  const totals: [string, string, boolean][] = [
    ['Subtotal', money(d.subtotal), false],
    ...(d.discount ? [['Discount', `-${money(d.discount)}`, false] as [string, string, boolean]] : []),
    ['Total', money(d.total), true],
    ...(d.amountPaid !== undefined ? [['Upfront paid', money(d.amountPaid), false] as [string, string, boolean]] : []),
    ...(d.balanceDue !== undefined ? [['Balance due', money(d.balanceDue), true] as [string, string, boolean]] : []),
  ];
  totals.forEach(([label, value, strong]) => {
    pdf.setFont('helvetica', strong ? 'bold' : 'normal');
    if (strong) pdf.setTextColor(...pink);
    else pdf.setTextColor(17, 17, 17);
    pdf.text(label, 140, y);
    pdf.text(value, right, y, { align: 'right' });
    y += 7;
  });
  pdf.setTextColor(17, 17, 17);

  if (d.notes) {
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', left, y);
    pdf.setFont('helvetica', 'normal');
    const noteLines = pdf.splitTextToSize(d.notes, right - left);
    pdf.text(noteLines, left, y + 5);
    y += noteLines.length * 4 + 10;
  }
  y = Math.min(Math.max(y + 18, 235), 258);
  pdf.setDrawColor(140, 140, 140);
  pdf.line(left, y, 88, y);
  pdf.line(122, y, right, y);
  pdf.setFontSize(8);
  pdf.text('Customer signature', 51, y + 5, { align: 'center' });
  pdf.text(`For ${d.store.name}`, 159, y + 5, { align: 'center' });
  pdf.setDrawColor(225, 225, 225);
  pdf.line(left, 275, right, 275);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${d.store.name}  |  ${d.store.tagline}  |  Tel ${d.store.phone}`, 105, 281, { align: 'center' });
  pdf.text('Thank you for your business.', 105, 286, { align: 'center' });
  pdf.save(`${fileName}.pdf`);
}


export function openA4Pdf(html: string) {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

