const { makeid } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");

const {
    default: Njabulo_Jb,
    useMultiFileAuthState,
    Browsers,
    delay,
} = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    async function NJABULO_QR_CODE() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
            
            let sock = Njabulo_Jb({
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                // 1. SEND QR IMAGE TO THE WEBPAGE
                if (qr && !res.headersSent) {
                    res.type('png').set('Cache-Control', 'no-store, private').send(await QRCode.toBuffer(qr));
                }

                // 2. WHEN CONNECTED
                if (connection == "open") {
                    await delay(5000);
                    
                    try {
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        await delay(800);
                        let b64data = Buffer.from(data).toString('base64');
                        
                        // Send the session ID
                        let session = await sock.sendMessage(sock.user.id, { text: 'njabulo~' + b64data });

                        // Welcome Message
                        let NJABULO_SESSION_TEXT = `
*🎉 Pairing complete!*
Your session ID has been saved.
You’re now connected to Njabulo JB.

✅ Try .deploy to see what I can do
✅ SESSION_ID is alive to confirm I’m online
🔒 Never share your session ID
🆘 Need help? Use .owner

Github github.com/NjabuloJf/Njabulo-Jb 
Website bot njabulo-ai.vercel.app
Welcome aboard 🚀
`;

                        await sock.sendMessage(sock.user.id, { text: NJABULO_SESSION_TEXT }, { quoted: session });

                    } catch (err) {
                        console.log("Error sending session:", err);
                    }

                    await delay(1000);
                    await sock.ws.close();
                    return await removeFile("temp/" + id);
                    
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    NJABULO_QR_CODE();
                }
            });
        } catch (err) {
            if (!res.headersSent) {
                res.status(503).json({ code: "Service is Currently Unavailable" });
            }
            console.log(err);
            await removeFile("temp/" + id);
        }
    }
    return await NJABULO_QR_CODE();
});

module.exports = router;