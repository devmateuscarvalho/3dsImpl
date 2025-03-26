# 3DSecure Checkout Integration

This project demonstrates a 3DSecure (3DS) checkout flow implementation using React.js for the frontend and Node.js for the backend.

## Project Structure

- `frontend/`: React.js application
- `backend/`: Node.js Express server

## Features

- Credit card payment form
- Device data collection for 3DS
- Integration with Cybersource 3DS API
- Dynamic 3DS challenge handling with iframes
- Server-side proxy for secure API calls

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

### Backend Setup

```bash
cd backend
npm install
```

### Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Start the Backend Server

```bash
cd backend
npm run dev
```

The backend server will start on port 5000.

### Start the Frontend Development Server

```bash
cd frontend
npm start
```

The React app will be available at http://localhost:3000.

## How It Works

1. User enters card details and submits the payment form
2. Frontend collects device data using a hidden iframe
3. Backend makes API calls to the 3DS provider
4. If 3DS challenge is required, it's displayed in an iframe
5. After challenge completion, the transaction is processed
6. Backend handles the POST callback from the 3DS provider

## Important Notes

- The backend server acts as a proxy for all API calls to the 3DS provider
- The 3DS challenge redirect is handled by the `/challenge-response` endpoint in the backend
- All sensitive data like API keys are stored securely on the server side

## Environment Variables

### Backend (.env)

```
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
CYBERSOURCE_CLIENT_ID=your-client-id
CYBERSOURCE_CLIENT_KEY=your-client-key
```

## License

MIT 