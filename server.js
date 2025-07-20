//for local testing
import express from 'express';
import philosopherQuoteHandler from './api/philosopher-quote.js';

const app = express();
const port = 3000;

app.get('/api/philosopher-quote', philosopherQuoteHandler);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
