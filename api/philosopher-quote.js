
import fetch from 'node-fetch'; //node-fetch is a lightweight module that brings `window.fetch` to Node.js which is useful for making HTTP requests.
import { createCanvas } from 'canvas'; //canvas is a Node.js package that provides a Canvas API similar to the HTML5 Canvas API, allowing you to draw graphics and manipulate images in Node.js.


export default async function handler(req, res) {
  try {
    const response = await fetch('https://philosophersapi.com/api/quotes');  // Fetching quotes from online available philosophers API.
    const quotes = await response.json();

    if (!Array.isArray(quotes) || quotes.length === 0) {
      throw new Error('No quotes available.'); // If the quotes array is empty or not an array, throw an error.
    }

    const random = Math.floor(Math.random() * quotes.length);
    const { quote = 'No quote', work = 'Unknown Work', year = 'Unknown Year' } = quotes[random]; // Destructuring the random quote object to get quote, work, and year. If any of these are missing, default values are provided.

    // Canvas setup
    const width = 800; 
    const lineHeight = 28;
    const margin = 20;
    const maxTextWidth = width - margin * 2; 

    // Create temporary canvas to calculate quote height
    const tempCanvas = createCanvas(width, 1000); // Creating a temporary canvas to measure the height of the text without rendering it to the final canvas.
    const tempCtx = tempCanvas.getContext('2d'); // Getting the 2D rendering context of the temporary canvas. this context is used to draw shapes, text, images, and other objects on the canvas.
    tempCtx.font = '20px Sans';

    const lines = wrapText(tempCtx, quote, maxTextWidth); // Word-wrapping the quote text to fit within the specified maximum width. The wrapText function splits the text into lines that fit within the given width, ensuring that no line exceeds the maximum width.
    const quoteHeight = lines.length * lineHeight; // Calculating the total height of the quote based on the number of lines and the line height. This is used to determine how much vertical space the quote will occupy on the final canvas.
    const totalHeight = quoteHeight + 80; // Total height of the canvas, including space for the work and year text.

    const canvas = createCanvas(width, totalHeight); // Creating the final canvas with the specified width and total height. This canvas will be used to render the quote, work, and year text.
    const ctx = canvas.getContext('2d'); // Now getting the 2D rendering context of the final canvas. This context is used to draw the quote, work, and year text onto the canvas.

    // Tokyo Night Theme
    const backgroundColor = '#1a1b26';
    const quoteColor = '#c0caf5';
    const accentColor = '#7aa2f7';
    const yearColor = '#f7768e';

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, totalHeight);

    // Quote
    ctx.fillStyle = quoteColor;
    ctx.font = '20px Sans';
    let y = margin;
    for (const line of lines) {
      ctx.fillText(line, margin, y);
      y += lineHeight;
    }

    // Work
    ctx.fillStyle = accentColor;
    ctx.font = '16px Sans';
    ctx.fillText(`— ${work}`, margin, y + 20);

    // Year
    ctx.fillStyle = yearColor;
    ctx.font = '14px Sans';
    ctx.fillText(year, margin, y + 40);

    res.setHeader('Content-Type', 'image/png');
    canvas.createPNGStream().pipe(res); // Sending the generated image as a PNG response. createPNGStream() creates a readable stream that outputs the image in PNG format. pipe(res) pipes the stream to the response object, allowing the image to be sent back to the client.
  } catch (err) {
    console.error('Failed to generate quote image:', err.message);
    res.status(500).send('Failed to generate quote image');
  }
}

// Word-wrap helper
function wrapText(ctx, text, maxWidth) { // This function takes a canvas context, a text string, and a maximum width, and returns an array of lines that fit within the specified width.
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    const testLine = line + word + ' ';
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

