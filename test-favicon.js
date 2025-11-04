// Test file to verify favicon route works
const express = require('express');
const app = express();

// Add the same favicon route
app.get('/favicon.ico', (req, res) => {
  console.log('Favicon route accessed');
  res.status(204).end();
});

// Add a test route
app.get('/', (req, res) => {
  res.send('Test server running');
});

const port = 3003;
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log('Try accessing http://localhost:3003/favicon.ico to test the favicon route');
});