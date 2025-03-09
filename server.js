const express = require('express');
const cors = require('cors'); // Import CORS module
const claimDemo = require('./demo/claimDemo'); // Import claimDemo.js

const app = express();
const PORT = 7546;

// Enable CORS support, only allow requests from http://127.0.0.1:5000
app.use(cors({
  origin: 'http://127.0.0.1:5000'
}));

// Parse JSON requests
app.use(express.json());

// This is the logic for claim, calling the functionality of claimDemo.js
async function claimFunction() {
  try {
    // Call the logic in claimDemo.js
    const result = await claimDemo(); // Assume claimDemo.js exports a function
    console.log("Executing smart contract Claim!");

    // Return result
    return { success: true, message: result };
  } catch (error) {
    console.error("An error occurred:", error);
    return { success: false, message: error.message };
  }
}

// Listen for POST requests to /claim
app.post('/claim', async (req, res) => {
  console.log("Received request to /claim!");

  const result = await claimFunction();

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

// Listen for POST requests to /claimDemo
app.post('/claimDemo', async (req, res) => {
  console.log("Received request to /claimDemo!");

  const result = await claimFunction(); // Call claimFunction

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Node.js server is running! Port: http://localhost:${PORT}`);
}); 