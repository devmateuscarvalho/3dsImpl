const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configuração CORS mais permissiva para permitir requisições do provedor 3DS
const corsOptions = {
    origin: '*', // Permite qualquer origem
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));
// Parse URL-encoded bodies (importante para form POSTs do 3DS)
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Special route to handle 3DS challenge responses
app.post('/challenge-response', (req, res) => {
    console.log('=== Challenge response received via POST ===');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);

    // Extract the transaction ID from the request body
    // The 3DS provider will send either TransactionId or MD parameter
    const transactionId = req.body.TransactionId || req.body.MD || req.query.TransactionId;

    if (transactionId) {
        console.log(`Transaction ID received: ${transactionId}`);
        // Redirect to the frontend with the transaction ID as a query parameter
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?TransactionId=${transactionId}`);
    }

    // If no transaction ID, redirect to frontend with an error
    console.error('No TransactionId found in challenge response');
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=missing_transaction_id`);
});

// Also handle GET requests for the challenge response (backup)
app.get('/challenge-response', (req, res) => {
    console.log('=== Challenge response received via GET ===');
    console.log('Query:', req.query);

    // Extract the transaction ID from query parameters
    const transactionId = req.query.TransactionId || req.query.MD;

    if (transactionId) {
        console.log(`Transaction ID received: ${transactionId}`);
        // Redirect to the frontend with the transaction ID as a query parameter
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?TransactionId=${transactionId}`);
    }

    // If no transaction ID, redirect to frontend with an error
    console.error('No TransactionId found in challenge response');
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=missing_transaction_id`);
});

// Default route
app.get('/', (req, res) => {
    res.send('3DS Backend - Use /challenge-response endpoint para processar respostas do 3DS');
});

// Start server
app.listen(PORT, () => {
    console.log(`3DS Callback Server running on port ${PORT}`);
}); 