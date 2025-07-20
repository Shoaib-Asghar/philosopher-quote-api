// import fetch from 'node-fetch'; // Import fetch to make API requests in Node.js environment

// Define color constants for the SVG theme (TokyoNight)
const TOKYONIGHT_BG = '#1a1b26';  // Dark background
const COLOR_QUOTE = '#c0caf5';    // Light blue for the quote text
const COLOR_AUTHOR = '#7aa2f7';   // Slightly brighter blue for author
const COLOR_YEAR = '#f7768e';     // Pinkish color for the year


function escapeXML(str) { // Escape special XML characters
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return m;
    }
  });
}

/**
 * Split a long text into multiple lines to fit within a max length per line.
 * This helps in wrapping the quote nicely inside the SVG.
 * @param {string} text The full text to wrap
 * @param {number} maxLen Maximum characters per line (default 38)
 * @returns {string[]} Array of text lines
 */
function wrapText(text, maxLen = 38) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  // Iterate words, adding them to current line or pushing new line if max length exceeded
  for (const word of words) {
    if ((currentLine + word).length <= maxLen) {
      // Add space if line not empty, then add word
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine); // push finished line
      currentLine = word; // start new line with current word
    }
  }

  if (currentLine) lines.push(currentLine); // push remaining line
  return lines;
}

// Main API handler function to generate the SVG with a random quote
export default async function handler(req, res) {
  try {
    // 1. Fetch all quotes from the quotes API
    const quotesRes = await fetch('https://philosophersapi.com/api/quotes');
    const quotesData = await quotesRes.json();

    // If no quotes returned, throw an error
    if (!quotesData || !quotesData.length) {
      throw new Error('No quotes found');
    }

    // 2. Select a random quote from the list
    const randomIndex = Math.floor(Math.random() * quotesData.length);
    const quoteObj = quotesData[randomIndex];

    // 3. Extract philosopher ID to fetch philosopher details
    const philosopherId = quoteObj.philosopher?.id;
    let authorName = 'Unknown Philosopher'; // Default if name unavailable

    // 4. Fetch philosopher details by ID to get the philosopher's name
    if (philosopherId) {
      try {
        // Fetch philosopher data from the philosopher API
        const philosopherRes = await fetch(`https://philosophersapi.com/api/philosophers/${philosopherId}`);
        if (philosopherRes.ok) {
          const philosopherData = await philosopherRes.json();
          // If name exists, override default unknown name
          if (philosopherData?.name) {
            authorName = philosopherData.name;
          }
        }
      } catch {
        // If philosopher fetch fails, silently continue with "Unknown Philosopher"
      }
    }

    // 5. Extract other relevant data from the quote object
    const quote = quoteObj.quote || 'No quote available.';
    const work = quoteObj.work || '';
    const year = quoteObj.year || '';

    // Escape all strings to ensure safe XML output
    const safeQuote = escapeXML(quote);
    const safeAuthor = escapeXML(authorName);
    const safeWork = escapeXML(work);
    const safeYear = escapeXML(year);

    // 6. Wrap the quote text into multiple lines for SVG rendering
    const lines = wrapText(safeQuote, 38);
    const lineCount = lines.length;

    // Define SVG layout variables
    const lineHeight = 28;      // Vertical spacing between lines
    const paddingTop = 40;      // Top padding before the quote text
    const paddingBottom = 60;   // Bottom padding after text for author info

    // Calculate the total height of SVG based on lines and padding
    const svgHeight = paddingTop + lineHeight * lineCount + paddingBottom;

    // Create <tspan> elements for each wrapped line to position inside SVG text
    const tspans = lines
      .map((line, idx) => `<tspan x="40" dy="${idx === 0 ? 0 : lineHeight}">${line}</tspan>`)
      .join('');

    // Adjust quote font size if the quote is very long (more than 5 lines)
    const baseFontSize = 26;
    const fontSizeQuote = lineCount > 5 ? 22 : baseFontSize;

    // 7. Generate the SVG markup string with embedded styles and dynamic content
    const svg = `
        <svg
        width="700"
        height="${svgHeight}"
        viewBox="0 0 700 ${svgHeight}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="title desc"
        >
        <title id="title">Random Developer Quote</title>
        <desc id="desc">A thoughtful developer quote displayed elegantly</desc>

        <style>
            <![CDATA[
            rect.background {
                fill: ${TOKYONIGHT_BG};
                rx: 12; /* rounded corners */
                ry: 12;
            }
            text.quote {
                font-family: 'Fira Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-weight: 600;
                font-size: ${fontSizeQuote}px;
                fill: ${COLOR_QUOTE};
                letter-spacing: 0.02em;
                dominant-baseline: middle;
            }
            text.author {
                font-family: 'Fira Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-weight: 500;
                font-size: 18px;
                fill: ${COLOR_AUTHOR};
            }
            text.year {
                font-family: 'Fira Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-weight: 400;
                font-size: 16px;
                fill: ${COLOR_YEAR};
            }
            text.work {
                font-style: italic;
            }
            ]]>
        </style>

        <!-- Background rounded rectangle -->
        <rect class="background" width="700" height="${svgHeight}" />

        <!-- Quote text wrapped in multiple lines -->
        <text x="40" y="${paddingTop}" class="quote">${tspans}</text>

        <!-- Author name and work (if available) positioned near bottom left -->
        <text x="40" y="${svgHeight - 40}" class="author">
            ${escapeXML(`— ${safeAuthor}`)}${safeWork ? `, ` : ''}
            <tspan class="work">${safeWork}</tspan>
        </text>

        <!-- Year, positioned bottom right if available -->
        ${safeYear ? `<text x="660" y="${svgHeight - 40}" class="year" text-anchor="end">${safeYear}</text>` : ''}
        </svg>
        `;

    // 8. Set response headers to return SVG image with cache control
    res.setHeader('Content-Type', 'image/svg+xml'); 
    res.setHeader('Cache-Control', 'public, max-age=3600');
    // Send the SVG markup as response
    return res.status(200).send(svg);
  } catch (err) {
    // In case of error, log it and return a minimal SVG error message
    console.error(err);
    return res.status(500).send(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="60" fill="red">
  <text x="10" y="30" font-family="Arial" font-size="14">Error loading quote.</text>
</svg>
    `);
  }
}
