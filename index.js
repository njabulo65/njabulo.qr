const express = require('express');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let server = require('./qr'),
    code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;

// 1. THE WEBPAGES (Put these FIRST)
app.use('/qr', async (req, res, next) => {
    res.sendFile(__path + '/qr.html'); 
})

app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/index.html')
})

// 2. THE API DATA (Put these SECOND and add /api)
app.use('/api/qr', server);   // Changed to /api/qr
app.use('/code', code);

// 3. BODY PARSER
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 4. START
app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star
Server running on http://localhost:` + PORT)
})

module.exports = app
