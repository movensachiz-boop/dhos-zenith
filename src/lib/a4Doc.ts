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

export async function downloadA4Pdf(html: string, fileName: string) {
  const html2pdf = (await import('html2pdf.js')).default;

  const holder = document.createElement('div');
  // Keep it inside the viewport (html2canvas renders blank for far off-screen nodes)
  holder.style.position = 'fixed';
  holder.style.left = '0';
  holder.style.top = '0';
  holder.style.zIndex = '-1';
  holder.style.opacity = '0';
  holder.style.pointerEvents = 'none';
  holder.style.width = '794px'; // A4 @96dpi
  holder.style.background = '#ffffff';
  holder.style.color = '#111111';

  const body = html.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '');
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : '';

  // Scope the document CSS to the holder so app tokens (oklch etc.) don't leak in
  holder.innerHTML = `<style>
    #a4-pdf-holder, #a4-pdf-holder * { box-sizing: border-box; color: #111; }
    #a4-pdf-holder { font-family: Arial, Helvetica, sans-serif; font-size: 12px; background:#fff; padding: 8px; }
    ${css.replace(/@page[^}]*}/g, '').replace(/\bbody\b/g, '#a4-pdf-holder')}
  </style>${body}`;
  holder.id = 'a4-pdf-holder';

  document.body.appendChild(holder);

  // Wait for images (logo) to finish loading, otherwise the canvas is blank
  const imgs = Array.from(holder.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          setTimeout(resolve, 4000);
        })
    )
  );
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));

  try {
    await html2pdf()
      .set({
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(holder)
      .save();
  } finally {
    holder.remove();
  }
}


export function openA4Pdf(html: string) {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

