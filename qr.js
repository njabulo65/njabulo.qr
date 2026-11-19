const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const QRCode = require('qrcode');
const {
    default: Njabulo_Jb,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    fetchLatestBaileysVersion // <-- Added to fetch the correct WA version
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    // Ensure the temp folder is absolutely clean before starting
    await removeFile('./temp/' + id); 

    async function NJABULO_JB_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            // Fetch the latest WhatsApp Web version to avoid protocol errors
            const { version, isLatest } = await fetchLatestBaileysVersion();
            console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

            let sock = Njabulo_Jb({
                version, // <-- CRITICAL FIX: Pass the version
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS('Chrome'),
                syncFullHistory: false // <-- Saves memory on Render
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                // Log the raw update so you can see it in Render logs
                console.log("Connection Update:", JSON.stringify(s));

                // 1. SHOW QR CODE ON THE WEBPAGE
                if (qr) {
                    console.log("✅ QR STRING RECEIVED FROM WHATSAPP");
                    const qrImage = await QRCode.toDataURL(qr);
                    if (!res.headersSent) {
                        await res.send({ qr: qrImage }); 
                    }
                }

                // 2. WHEN DEVICE IS LINKED (SCANNED)
                if (connection === "open") {
                    console.log("✅ CONNECTED TO WHATSAPP");
                    if (!res.headersSent) {
                        await res.send({ connected: true });
                    }
                    
                    await delay(3000); 
                    
                    try {
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        let b64data = Buffer.from(data).toString('base64');
                        
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

                        await sock.sendMessage(sock.user.id, {
                            video: fs.readFileSync('./public/connect.mp4'),
                            mimetype: 'video/mp4',
                            ptv: true
                        });

                        const videoUrl = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png";

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
                    return await removeFile('./temp/' + id); 
                    
                } else if (connection === "close") {
                    // Log WHY it closed so you can see it in Render
                    console.log("❌ CONNECTION CLOSED. Reason:", lastDisconnect?.error?.message);
                    
                    if (lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                        await delay(10000);
                        NJABULO_JB_QR_CODE(); 
                    }
                }
            });
        } catch (err) {
            console.log("❌ QR Service Error: ", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ error: "Service is Currently Unavailable" });
            }
        }
    }
    return await NJABULO_JB_QR_CODE();
});

module.exports = router;