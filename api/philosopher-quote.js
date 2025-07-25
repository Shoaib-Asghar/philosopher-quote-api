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
function wrapText(text, maxLen = 45) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    // Add word to current line if length doesn't exceed maxLen
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxLen) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      // Push current line and start new line with word
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export default async function handler(req, res) {
  try {
    // 1. Fetch all available quotes from the API
    const quotesRes = await fetch('https://philosophersapi.com/api/quotes');
    const quotes = await quotesRes.json();

    if (!quotes || !quotes.length) throw new Error('No quotes returned');

    // 2. Generate a deterministic index based on full date string (YYYY-MM-DD)
    const todayStr = new Date().toISOString().slice(0, 10); // e.g. "2025-07-20"
    // Simple hash by summing char codes
    const hash = [...todayStr].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % quotes.length;
    const quoteObj = quotes[index];

    // 3. Fetch philosopher details by ID
    const philosopherId = quoteObj.philosopher?.id;
    let authorName = 'Unknown Philosopher';

    if (philosopherId) {
      try {
        const resPhilo = await fetch(`https://philosophersapi.com/api/philosophers/${philosopherId}`);
        if (resPhilo.ok) {
          const philosopherData = await resPhilo.json();
          if (philosopherData?.name) authorName = philosopherData.name;
        }
      } catch (err) {
        console.warn('Philosopher fetch failed:', err);
      }
    }

    // 4. Escape all text fields to avoid SVG issues
    const quote = escapeXML(quoteObj.quote || 'No quote available.');
    const work = escapeXML(quoteObj.work || '');
    const year = escapeXML(quoteObj.year || '');
    const author = escapeXML(authorName);

    // 5. Wrap quote into lines for better SVG layout
    const lines = wrapText(quote, 45);
    const lineCount = lines.length;
    const fontSizeQuote = lineCount > 5 ? 22 : 26;

    // SVG layout settings
    const paddingTop = 60;
    const paddingBottom = 90;
    const lineHeight = fontSizeQuote + 6;
    const svgWidth = 760;

    // Calculate total height dynamically
    const svgHeight = paddingTop + lineCount * lineHeight + paddingBottom;

    // Generate <tspan> elements for quote lines, center aligned horizontally
    const tspans = lines
      .map(
        (line, i) =>
          `<tspan x="${svgWidth / 2}" dy="${i === 0 ? 0 : lineHeight}" text-anchor="middle">${line}</tspan>`
      )
      .join('');

    // 6. Construct the SVG string with proper styles and layout
    const svg = `
<svg
  width="${svgWidth}"
  height="${svgHeight}"
  viewBox="0 0 ${svgWidth} ${svgHeight}"
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
      rx: 16;
      ry: 16;
      filter: drop-shadow(0 0 5px rgba(0,0,0,0.4));
    }
    text.quote {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: ${fontSizeQuote}px;
      fill: ${COLOR_QUOTE};
      font-weight: 600;
      line-height: 1.2;
      dominant-baseline: middle;
      letter-spacing: 0.02em;
    }
    text.author {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 20px;
      fill: ${COLOR_AUTHOR};
      font-weight: 600;
      text-anchor: middle;
    }
    text.work {
      font-style: italic;
      fill: ${COLOR_AUTHOR};
    }
    text.year {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 18px;
      fill: ${COLOR_YEAR};
      text-anchor: middle;
      font-weight: 500;
    }
  ]]></style>

  <!-- Background -->
  <rect class="background" width="${svgWidth}" height="${svgHeight}" />

  <!-- Quote text centered horizontally -->
  <text x="${svgWidth / 2}" y="${paddingTop}" class="quote">${tspans}</text>

  <!-- Author line below quote, centered -->
  <text x="${svgWidth / 2}" y="${svgHeight - 50}" class="author">
    — ${author}${work ? ', ' : ''}<tspan class="work">${work}</tspan>
  </text>

  <!-- Year below author, centered -->
  ${year ? `<text x="${svgWidth / 2}" y="${svgHeight - 20}" class="year">${year}</text>` : ''}
</svg>`;

    // 7. Set headers to return SVG and disable caching (optional: adjust caching as needed)
    res.setHeader('Content-Type', 'image/svg+xml');
    // res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');  
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=30'); // Cache for 5 minutes, revalidate after 30 seconds
    res.setHeader('Pragma', 'no-cache'); 
    res.setHeader('Expires', '0');

    // 8. Send SVG response
    res.status(200).send(svg);
  } catch (error) {
    console.error('Error generating quote SVG:', error);
    // Return minimal SVG error message
    res.status(500).send(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="60" fill="red">
  <text x="10" y="30" font-family="Arial" font-size="14">Error loading quote.</text>
</svg>`);
  }
}
