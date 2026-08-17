const { makeWASocketLatest, useMultiFileAuthState, DisconnectReason, Browsers } = require('jagproject');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// =========================================
// ⚙️ SETTINGAN
// =========================================
const PHONE_NUMBER = "6281226416919";
const AUTO_VIEW_STATUS = true;
const MODE_KONEKSI = "pairing"; // "pairing" atau "qr"
// =========================================

const sessionDir = path.join(process.cwd(), 'sessions_jag');
const logger = pino({ level: "silent" });

console.log("🚀 XenoviaAI - Auto View Status");
console.log(`👤 Owner: Feii | 👀 Auto View: ${AUTO_VIEW_STATUS ? 'ON' : 'OFF'}\n`);

async function connectToWhatsApp() {
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // ✅ FIX #1: TAMBAHIN AWAIT DI SINI!
    const sock = await makeWASocketLatest({
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: Browsers('Chrome'), // ✅ FIX #2: Parameter bener
        markOnlineOnConnect: true,
        syncFullHistory: false,
        autoReadStatus: AUTO_VIEW_STATUS // ✅ Native feature jagproject!
    });

    global.sock = sock;

    // Logic Pairing Code
    if (!state.creds.registered && MODE_KONEKSI === "pairing") {
        console.log("⏳ Menyiapkan Pairing Code...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
            const code = await sock.requestPairingCode(PHONE_NUMBER.replace(/[^0-9]/g, ''));
            console.log('\n========================================');
            console.log('📱 NOMOR:', PHONE_NUMBER);
            console.log('🔑 CODE:', code);
            console.log('========================================\n');
            console.log("👉 Masukkan kode ini di HP WhatsApp lu!\n");
        } catch (err) {
            console.log("❌ Gagal Pairing:", err.message);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    // EVENT: PESAN MASUK (Auto View Status)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (let msg of messages) {
            if (msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
                const senderName = msg.pushName || msg.key.participant?.split('@')[0] || 'Unknown';
                console.log(`👀 [AUTO-VIEWED] Status dari: ${senderName}`);
            }
            
            // Log chat biasa (opsional)
            if (!msg.key.fromMe && msg.message && msg.key.remoteJid !== 'status@broadcast') {
                const waktu = new Date().toLocaleTimeString('id-ID');
                const nama = msg.pushName || 'Anonim';
                const isi = msg.message.conversation || msg.message.extendedTextMessage?.text || '(Media)';
                console.log(`[${waktu}] ${nama}: ${isi.slice(0,40)}...`);
            }
        }
    });

    // EVENT: KONEKSI
    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr && MODE_KONEKSI === "qr") {
            console.log("\n📲 Scan QR Code:\n");
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log("\n✅ XENOVIA AI ONLINE & READY!\n");
        }
        
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log("📵 Logout. Hapus folder sessions_jag & run ulang.");
                process.exit(0);
            }
            console.log(`⚠️ Putus (${reason}). Reconnecting...`);
            setTimeout(connectToWhatsApp, 3000);
        }
    });

    return sock;
}

connectToWhatsApp().catch(err => {
    console.error("💥 Fatal Error:", err);
    process.exit(1);
});
