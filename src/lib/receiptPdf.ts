import { jsPDF } from 'jspdf';

const LOGO_KEY = 'mc_logo_data_url';

type ExtractedLine = { text: string; bold: boolean; center: boolean; size: number };

function extract(el: HTMLElement) {
  const lines: ExtractedLine[] = [];
  let logo: string | null = null;

  const walk = (node: Element) => {
    if (node.tagName === 'IMG') {
      const src = (node as HTMLImageElement).getAttribute('src') || '';
      if (!logo && src) logo = src;
      return;
    }
    const hasElementChild = Array.from(node.children).length > 0;
    if (!hasElementChild) {
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) {
        const cls = node.className?.toString() ?? '';
        const style = window.getComputedStyle(node as HTMLElement);
        lines.push({
          text,
          bold: Number(style.fontWeight) >= 600 || /font-bold/.test(cls),
          center: style.textAlign === 'center' || /text-center|items-center/.test(((node.parentElement?.className as string) ?? '')),
          size: /text-base/.test(cls) ? 11 : /text-sm/.test(cls) ? 10 : 9,
        });
      }
      return;
    }
    Array.from(node.children).forEach((child) => walk(child));
  };

  walk(el);
  return { lines, logo: logo ?? localStorage.getItem(LOGO_KEY) };
}

/** Renders a thermal receipt DOM node into an 80mm-wide PDF. Works fully offline. */
export async function downloadReceiptPdf(el: HTMLElement, fileName: string) {
  const { lines, logo } = extract(el);

  const width = 80; // mm
  const margin = 6;
  const contentWidth = width - margin * 2;
  const lineHeight = 4.6;

  // Estimate the page height so the receipt prints as one continuous slip.
  const height = 60 + lines.length * lineHeight + 20;

  const pdf = new jsPDF({ unit: 'mm', format: [width, height], orientation: 'portrait' });
  let y = 8;

  if (logo) {
    try {
      let dataUrl = logo;
      if (!dataUrl.startsWith('data:')) {
        const res = await fetch(logo);
        const blob = await res.blob();
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      }
      const type = dataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
      pdf.addImage(dataUrl, type, width / 2 - 12, y, 24, 24);
      y += 28;
    } catch {
      // Offline without a cached logo: continue with a text-only receipt.
    }
  }

  pdf.setTextColor(0, 0, 0);
  lines.forEach((line) => {
    pdf.setFont('courier', line.bold ? 'bold' : 'normal');
    pdf.setFontSize(line.size);
    const wrapped = pdf.splitTextToSize(line.text, contentWidth) as string[];
    wrapped.forEach((part) => {
      if (line.center) pdf.text(part, width / 2, y, { align: 'center' });
      else pdf.text(part, margin, y);
      y += lineHeight;
    });
  });

  pdf.save(`${fileName}.pdf`);
}
