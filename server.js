const express = require('express');
const philosopherQuoteHandler = require('./api/philosopher-quote');

const app = express();
const port = 3000;

app.get('/api/philosopher-quote', philosopherQuoteHandler);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
