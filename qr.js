const { makeid } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");

const {
    default: Njabulo_Jb,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    // If WhatsApp blocks the connection, send an error after 30 seconds
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(503).send("Connection Timeout - WhatsApp is blocking Render. Try again.");
        }
    }, 30000);

    async function NJABULO_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            let sock = Njabulo_Jb({
                auth: {
                    creds: state.creds,
                    // This prevents WhatsApp from blocking the connection
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                // 1. SEND QR IMAGE
                if (qr && !res.headersSent) {
                    clearTimeout(timeout); // Stop the 30s timer
                    res.type('png').set('Cache-Control', 'no-store, private').send(await QRCode.toBuffer(qr));
                }

                // 2. CONNECTED
                if (connection == "open") {
                    await delay(3000);
                    try {
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        let b64data = Buffer.from(data).toString('base64');
                        
                        let session = await sock.sendMessage(sock.user.id, { text: 'njabulo~' + b64data });

                        let MSG = `*🎉 Pairing complete!*\nYour session ID has been saved.\nYou’re now connected to Njabulo JB.\n\n✅ Try .deploy to see what I can do\n🔒 Never share your session ID\n\nGithub github.com/NjabuloJf/Njabulo-Jb\nWelcome aboard 🚀`;

                        await sock.sendMessage(sock.user.id, { text: MSG }, { quoted: session });
                    } catch (err) {
                        console.log("Error sending session:", err);
                    }
                    
                    await delay(1000);
                    await sock.ws.close();
                    return await removeFile("temp/" + id);
                    
                // 3. CONNECTION FAILED (WhatsApp blocked us)
                } else if (connection === "close") {
                    clearTimeout(timeout);
                    if (!res.headersSent) {
                        res.status(500).send("Connection Failed. Please reload.");
                    }
                    
                    if (lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                        await delay(10000);
                        NJABULO_QR_CODE();
                    }
                }
            });
        } catch (err) {
            clearTimeout(timeout);
            console.log(err);
            if (!res.headersSent) {
                res.status(503).send("Service is Currently Unavailable");
            }
            await removeFile("temp/" + id);
        }
    }
    return await NJABULO_QR_CODE();
});

module.exports = router;