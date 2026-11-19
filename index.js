const express = require('express');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let server = require('./qr'),
    code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;

// 1. API Endpoints (Data)
app.use('/qr', server);      // qr.html fetches data from here
app.use('/code', code);      // pair.html fetches data from here

// 2. HTML Pages (Webpages)
app.use('/pair', async (req, res, next) => {
    res.sendFile(__path + '/qr.html');     // Link this to the button
})

app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/index.html');  // Homepage
})

// 3. Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 4. Start Server
app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star
Server running on http://localhost:` + PORT)
})

module.exports = app
