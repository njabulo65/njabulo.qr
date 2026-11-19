const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const QRCode = require('qrcode'); // Ensure you ran: npm install qrcode

const {
    default: Njabulo_Jb,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    async function NJABULO_JB_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            let sock = Njabulo_Jb({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS('Chrome')
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                // 1. SHOW QR CODE ON THE WEBPAGE
                if (qr) {
                    const qrImage = await QRCode.toDataURL(qr);
                    if (!res.headersSent) {
                        await res.send({ qr: qrImage }); // Sends the image to qr.html
                    }
                }

                // 2. WHEN DEVICE IS LINKED (SCANNED)
                if (connection === "open") {
                    
                    // Tell the webpage we are connected
                    if (!res.headersSent) {
                        await res.send({ connected: true });
                    }
                    
                    await delay(3000); // Wait 3 seconds for creds.json to fully save
                    
                    try {
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        let b64data = Buffer.from(data).toString('base64');
                        
                        // SEND THE BASE64 SESSION ID
                        let sessionData = await sock.sendMessage(sock.user.id, { 
                            text: `njabulo~${b64data}` 
                        });

                        let FLASH_MD_TEXT = `
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

                        const buttons = [{ 
                            buttonId: 'njabulo_copy', 
                            buttonText: { displayText: '📋 Copy Code' }, 
                            type: 1 
                        }];

                        // SEND THE VIDEO
                        await sock.sendMessage(sock.user.id, {
                            video: fs.readFileSync('./public/connect.mp4'),
                            mimetype: 'video/mp4',
                            ptv: true
                        });

                        const videoUrl = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png";

                        // SEND THE IMAGE + WELCOME TEXT
                        await sock.sendMessage(sock.user.id, {
                            image: { url: videoUrl },
                            caption: FLASH_MD_TEXT,    
                            buttons: buttons,
                            headerType: 1
                        }, { quoted: sessionData });

                    } catch (msgErr) {
                        console.log("Error sending welcome message:", msgErr);
                    }

                    await delay(2000);
                    await sock.ws.close();
                    return await removeFile('./temp/' + id); // Clean up
                    
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    NJABULO_JB_QR_CODE(); // Reconnect if disconnected normally
                }
            });
        } catch (err) {
            console.log("QR Service Error: ", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ error: "Service is Currently Unavailable" });
            }
        }
    }
    return await NJABULO_JB_QR_CODE();
});

module.exports = router;