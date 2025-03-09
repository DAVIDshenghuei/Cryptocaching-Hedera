# Geocaching Web Application

A web application for geocaching that allows administrators to create cache locations and users to verify their visits to these locations.

## Features

- Interactive map with cache locations
- User registration and authentication
- Admin interface for adding new cache locations
- Cache verification system with random success
- One-time verification per cache location per user
- Integration with Node.js server to execute claims
- Canvas integration for drawing graphics
- 
## Setup the backend part

npm install
npm install express cor

# Run Node.js Server 

node server.js

## Setup the webpage in front file

### 1. Install Flask and Dependencies

First, create a virtual environment and install required dependencies:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt


## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:5000`

## Default Admin Account

- Username: admin
- Password: admin

## Usage

1. Register a new account or log in with existing credentials
2. Browse the map to find cache locations
3. Click on a cache marker to view details
4. Use the "Verify Cache" button to attempt verification
5. Admins can add new cache locations using the "Add Cache" button
6. Use the "Claim Smart Contract" button to send a request to the Node.js server to execute `demo/claimDemo.js`.

## Node.js Server Integration

To execute claims, the Flask application sends a POST request to the Node.js server at `http://localhost:7546/claimDemo`. Ensure that the Node.js server is running and has the appropriate route set up to handle this request.

### Node.js Server Example

Here is a simple example of how to set up the Node.js server to handle the claim execution:

```javascript
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.post('/claimDemo', (req, res) => {
    console.log('Received request to run claimDemo');
    // Execute the logic for claimDemo here

    // Return a response
    res.json({ message: 'Claim demo executed successfully' });
});

const PORT = 7546;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
```

## Technologies Used

- Flask (Python web framework)
- SQLAlchemy (Database ORM)
- Leaflet.js (Interactive maps)
- Bootstrap 5 (UI framework)
- SQLite (Database)
- Node.js (for executing claims)
