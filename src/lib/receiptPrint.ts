export const RECEIPT_PRINT_CSS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: ui-monospace, "Courier New", monospace;
    font-size: 11px;
    line-height: 1.5;
    margin: 0;
    padding: 8px 10px;
    width: 80mm;
    color: #000;
    background: #fff;
  }
  /* every label / value on its own line (portrait layout) */
  div, p, span { display: block; }
  img { max-width: 110px; height: auto; display: block; margin: 0 auto; }
  .font-bold, b, strong { font-weight: 700; }
  .uppercase { text-transform: uppercase; }
  .text-center { text-align: center; }
  /* dashed dividers */
  .border-t { border-top: 1px dashed #000; }
  .my-2 { margin: 6px 0; }
  .mt-1 { margin-top: 3px; }
  .mt-2 { margin-top: 6px; }
  .pt-1 { padding-top: 3px; }
  .space-y-3 > div { margin-bottom: 8px; }
  .text-sm { font-size: 12px; }
  .text-base { font-size: 14px; }
  .text-\\[10px\\] { font-size: 10px; }
  .tracking-widest { letter-spacing: 0.12em; }
`;

export function printReceiptHtml(content: string) {
  const win = window.open('', '_blank', 'width=380,height=760');
  if (!win) return;
  win.document.write(
    `<!doctype html><html><head><title>Receipt</title><style>${RECEIPT_PRINT_CSS}</style></head><body>${content}</body></html>`
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
