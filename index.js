const express = require('express');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;

let server = require('./qr'),   // This generates the QR image
    code = require('./pair');   // This generates the pair code

require('events').EventEmitter.defaultMaxListeners = 500;

// 1. THE WEBPAGES (Put these FIRST)
app.use('/qr', async (req, res) => {
    res.sendFile(__path + '/qr.html'); // Loads the page
});

app.use('/', async (req, res) => {
    res.sendFile(__path + '/index.html'); // Loads homepage
});

// 2. THE APIS (Put these SECOND)
app.use('/server', server); // The HTML image src will point here!
app.use('/code', code);

// 3. BODY PARSER
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 4. START SERVER
app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star
Server running on http://localhost:` + PORT);
});

module.exports = app;