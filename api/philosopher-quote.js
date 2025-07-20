import fetch from 'node-fetch'; // node-fetch is a common package for making HTTP requests in Node.js
import { Resvg } from '@resvg/resvg-js'; // Resvg is used for rendering SVG to PNG
import { createCanvas } from 'canvas'; // using canvas for text measurement and rendering

export default async function handler(req, res) {
  try {
    const response = await fetch('https://philosophersapi.com/api/quotes'); // Fetch quotes from the online available philosophers API
    const quotes = await response.json();
    if (!Array.isArray(quotes) || quotes.length === 0) throw new Error('No quotes');

    const q = quotes[Math.floor(Math.random() * quotes.length)];
    const quote = q.quote || 'No quote';
    const work = q.work || '';
    const year = q.year || '';
    const philosopherId = q.philosopher?.id;

    // Fetch philosopher name
    let philosopherName = '';
    if (philosopherId) {
      try {
        const pRes = await fetch(`https://philosophersapi.com/api/philosophers/${philosopherId}`);
        const pData = await pRes.json();
        philosopherName = pData.name || '';
      } catch {
        philosopherName = '';
      }
    }

    // Canvas for measuring text width
    const canvas = createCanvas(800, 200);
    const ctx = canvas.getContext('2d');
    ctx.font = '28px sans-serif';

    const maxTextWidth = 740; // leave some margin inside 800 width

    // Wrap text by measuring pixel width
    function wrapText(text, maxWidth) {
      const words = text.split(' ');
      const lines = [];
      let line = '';

      for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    const lines = wrapText(quote, maxTextWidth);

    // Calculate height based on lines
    const fontSize = 28;
    const lineHeight = 40;
    const marginX = 30;
    const marginTop = 60;
    const totalHeight = marginTop * 2 + lines.length * lineHeight + 120; // space for meta text

    // Escape XML
    const escapeXML = (str) =>
      str.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");

    // Compose SVG
    const svg = `
      <svg width="800" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Philosopher Quote">
        <style>
          .background { fill: #1a1b26; }
          .box { fill: #24283b; rx: 20; }
          .quote { fill: #c0caf5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: ${fontSize}px; text-anchor: middle; }
          .author { fill: #7aa2f7; font-size: 22px; font-style: italic; text-anchor: middle; }
          .meta { fill: #7aa2f7; font-size: 18px; text-anchor: middle; }
          .year { fill: #f7768e; font-size: 16px; text-anchor: middle; }
        </style>
        <rect width="100%" height="100%" class="background" />
        <rect x="${marginX}" y="20" width="${800 - marginX*2}" height="${totalHeight - 40}" class="box" />
        <text x="400" y="${marginTop}" class="quote" dominant-baseline="hanging">
          ${lines.map((line, i) => `<tspan x="400" dy="${i === 0 ? 0 : lineHeight}">${escapeXML(line)}</tspan>`).join('')}
        </text>
        ${philosopherName ? `<text x="400" y="${marginTop + lines.length * lineHeight + 40}" class="author">— ${escapeXML(philosopherName)}</text>` : ''}
        ${work ? `<text x="400" y="${marginTop + lines.length * lineHeight + 75}" class="meta">${escapeXML(work)}</text>` : ''}
        ${year ? `<text x="400" y="${marginTop + lines.length * lineHeight + 100}" class="year">${escapeXML(year)}</text>` : ''}
      </svg>
    `;

    // Render to PNG (2x scale for sharpness)
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: 1600 // 800*2 for retina sharpness
      }
    });

    const png = resvg.render().asPng();
    res.setHeader('Content-Type', 'image/png');
    res.send(png);

  } catch (err) {
    console.error('Error generating image:', err);
    res.status(500).send('Failed to generate image');
  }
}
