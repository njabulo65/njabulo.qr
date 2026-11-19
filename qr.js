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
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    async function NJABULO_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            const { version } = await fetchLatestBaileysVersion();

            let sock = Njabulo_Jb({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                // SEND THE QR IMAGE TO THE WEBPAGE
                if (qr && !res.headersSent) {
                    res.type('png').set('Cache-Control', 'no-store, private').send(await QRCode.toBuffer(qr));
                }

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
                    
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    NJABULO_QR_CODE();
                }
            });
        } catch (err) {
            console.log(err);
            if (!res.headersSent) {
                res.status(503).send("Error");
            }
            await removeFile("temp/" + id);
        }
    }
    return await NJABULO_QR_CODE();
});

module.exports = router;