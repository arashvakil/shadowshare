/**
 * Server-side QR code PNG generator.
 * Reuses the same qrcode-generator logic as webapp/qr.ts,
 * then renders SVG → PNG via @resvg/resvg-js.
 */
import qrcode from "qrcode-generator";
import { Resvg } from "@resvg/resvg-js";

export function generateQrPng(data: string): Buffer {
  const qr = qrcode(0, "M");
  qr.addData(data);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const cellSize = 8;
  const margin = 16;
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <path d="${paths}" fill="#000000"/>
  </svg>`;

  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
