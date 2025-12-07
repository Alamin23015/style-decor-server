require('dotenv').config();
const express = require('express');
const cors = require('cors');


const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());



// Root route
app.get('/', (req, res) => {
  res.send('StyleDecor server is running');
})



// Start Server
app.listen(port, () => {
  console.log(`StyleDecor server is running on port: ${port}`);
})