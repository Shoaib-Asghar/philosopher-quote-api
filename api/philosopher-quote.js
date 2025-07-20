// Define color constants for the SVG theme (TokyoNight)
const TOKYONIGHT_BG = '#1a1b26';
const COLOR_QUOTE = '#c0caf5';
const COLOR_AUTHOR = '#7aa2f7';
const COLOR_YEAR = '#f7768e';

// Utility to escape XML entities for SVG safety
function escapeXML(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[m] || m));
}

// Wrap long quote text into multiple lines based on max characters
function wrapText(text, maxLen = 38) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxLen) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

export default async function handler(req, res) {
  try {
    // 1. Fetch all available quotes
    const quotesRes = await fetch('https://philosophersapi.com/api/quotes');
    const quotes = await quotesRes.json();

    if (!quotes || !quotes.length) throw new Error('No quotes returned');

    // 2. Pick a deterministic quote each day (based on day of year)
    const dayOfYear = Math.floor(
      (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
    );
    const index = dayOfYear % quotes.length;
    const quoteObj = quotes[index];

    // 3. Fetch philosopher details (by ID)
    const philosopherId = quoteObj.philosopher?.id;
    let authorName = 'Unknown Philosopher';

    if (philosopherId) {
      try {
        const res = await fetch(`https://philosophersapi.com/api/philosophers/${philosopherId}`);
        if (res.ok) {
          const philosopherData = await res.json();
          if (philosopherData?.name) authorName = philosopherData.name;
        }
      } catch (err) {
        console.warn('Philosopher fetch failed', err);
      }
    }

    // 4. Safely escape all text fields
    const quote = escapeXML(quoteObj.quote || 'No quote found.');
    const work = escapeXML(quoteObj.work || '');
    const year = escapeXML(quoteObj.year || '');
    const author = escapeXML(authorName);

    // 5. Wrap quote into lines
    const lines = wrapText(quote, 38);
    const lineCount = lines.length;
    const fontSizeQuote = lineCount > 5 ? 22 : 26;

    // SVG layout dimensions
    const paddingTop = 40;
    const paddingBottom = 70;
    const lineHeight = 28;
    const svgHeight = paddingTop + (lineCount * lineHeight) + paddingBottom;

    // Build tspan elements
    const tspans = lines
      .map((line, i) => `<tspan x="40" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`)
      .join('');

    // 6. Final SVG
    const svg = `
<svg
  width="740"
  height="${svgHeight}"
  viewBox="0 0 740 ${svgHeight}"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-labelledby="title desc"
>
  <title id="title">Daily Developer Quote</title>
  <desc id="desc">Philosophical quote updated daily</desc>

  <style><![CDATA[
    rect.background {
      fill: ${TOKYONIGHT_BG};
      rx: 12;
      ry: 12;
    }
    text.quote {
      font-family: 'Segoe UI', sans-serif;
      font-size: ${fontSizeQuote}px;
      fill: ${COLOR_QUOTE};
      font-weight: 600;
      dominant-baseline: middle;
    }
    text.author {
      font-family: 'Segoe UI', sans-serif;
      font-size: 18px;
      fill: ${COLOR_AUTHOR};
      font-weight: 500;
    }
    text.work {
      font-style: italic;
    }
    text.year {
      font-family: 'Segoe UI', sans-serif;
      font-size: 16px;
      fill: ${COLOR_YEAR};
      text-anchor: end;
    }
  ]]></style>

  <rect class="background" width="740" height="${svgHeight}" />

  <text x="40" y="${paddingTop}" class="quote">${tspans}</text>

  <text x="40" y="${svgHeight - 36}" class="author">
    — ${author}${work ? `, ` : ''}<tspan class="work">${work}</tspan>
  </text>

  ${year ? `<text x="700" y="${svgHeight - 36}" class="year">${year}</text>` : ''}
</svg>`;

    // 7. Send SVG with headers to disable caching
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(svg);
  } catch (error) {
    console.error(error);
    res.status(500).send(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="60" fill="red">
  <text x="10" y="30" font-family="Arial" font-size="14">Error loading quote.</text>
</svg>`);
  }
}
