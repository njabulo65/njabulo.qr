const express = require('express');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let server = require('./qr'), 
    code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;

// 1. PAGES (First)
app.use('/qr', async (req, res) => {
    res.sendFile(__path + '/qr.html'); 
});
app.use('/', async (req, res) => {
    res.sendFile(__path + '/index.html'); 
});

// 2. APIS (Second)
app.use('/server', server); // <--- The image loads from here
app.use('/code', code);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:` + PORT);
});
module.exports = app;