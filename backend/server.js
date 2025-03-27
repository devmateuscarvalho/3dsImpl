const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

app.post('/challenge-response', (req, res) => {
    const isIframe = req.headers['sec-fetch-dest'] === 'iframe';

    if (isIframe) {
        return res.send(`
            <script>
                window.top.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3000'}?TransactionId=${req.body.TransactionId || req.body.MD}';
            </script>
        `);
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?TransactionId=${req.body.TransactionId || req.body.MD}`);
});

app.listen(PORT, () => {
    console.log(`3DS Callback Server running on port ${PORT}`);
}); 