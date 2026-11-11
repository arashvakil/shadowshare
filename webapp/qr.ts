/**
 * QR Code SVG generator using qrcode-generator library.
 * Returns an inline SVG string.
 */
import qrcode from "qrcode-generator";

export function generateQrSvg(data: string): string {
  const qr = qrcode(0, "M");
  qr.addData(data);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const cellSize = 4;
  const margin = 2;
  const size = moduleCount * cellSize + margin * 2;

  let paths = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = col * cellSize + margin;
        const y = row * cellSize + margin;
        paths += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <path d="${paths}" fill="#000000"/>
  </svg>`;
}
