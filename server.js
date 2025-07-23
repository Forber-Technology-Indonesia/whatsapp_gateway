const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Session file path
const sessionPath = path.join(__dirname, 'session.json');

// Load existing session if available
let sessionData = null;
if (fs.existsSync(sessionPath)) {
    try {
        sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        console.log('Session data loaded from file');
    } catch (err) {
        console.log('Failed to load session data:', err);
    }
}

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-gateway",
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// Variable to track if auto message has been sent
let autoMessageSent = false;

// WhatsApp message handler
client.on('message', msg => {
    // Log incoming message in JSON format
    const messageData = {
        id: msg.id._serialized,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        type: msg.type,
        timestamp: msg.timestamp,
        author: msg.author,
        deviceType: msg.deviceType,
        isForwarded: msg.isForwarded,
        isStatus: msg.isStatus,
        isStarred: msg.isStarred,
        broadcast: msg.broadcast,
        fromMe: msg.fromMe,
        hasMedia: msg.hasMedia,
        isGif: msg.isGif,
        mentionedIds: msg.mentionedIds
    };
    
    console.log('Pesan masuk:', JSON.stringify(messageData, null, 2));
    
    // Auto reply functionality
    if (msg.body === '!ping') {
        msg.reply('pong');
    } else if (msg.body === 'skuy') {
        msg.reply('helo ma bradah');
    }
});

// Send WA message after QR connected (only once)
client.on('ready', async () => {
    console.log('WhatsApp client is ready!');
    
    // Save session data when client is ready
    const clientInfo = client.info;
    const sessionInfo = {
        timestamp: new Date().toISOString(),
        clientId: "whatsapp-gateway",
        connected: true,
        phoneNumber: clientInfo ? clientInfo.wid.user : 'unknown',
        platform: clientInfo ? clientInfo.platform : 'unknown',
        lastConnected: new Date().toISOString()
    };
    
    try {
        fs.writeFileSync(sessionPath, JSON.stringify(sessionInfo, null, 2));
        console.log('Session info saved to', sessionPath);
        console.log('Session info:', JSON.stringify(sessionInfo, null, 2));
    } catch (err) {
        console.error('Failed to save session info:', err);
    }
    
    // Only send auto message if it hasn't been sent yet
    if (!autoMessageSent) {
        setTimeout(async () => {
            const targetNumber = '6283193878339@c.us'; // 083193878339
            const message = 'WhatsApp Gateway sudah terkoneksi!';
            try {
                await client.sendMessage(targetNumber, message);
                console.log('Pesan otomatis terkirim ke', targetNumber);
                autoMessageSent = true; // Mark as sent
            } catch (err) {
                console.error('Gagal mengirim pesan otomatis:', err);
            }
        }, 5000);
    }
});

// Handle authentication
client.on('authenticated', () => {
    console.log('Client authenticated successfully');
});

// Handle authentication failure
client.on('auth_failure', msg => {
    console.error('Authentication failed:', msg);
    // Remove session file if authentication fails
    if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
        console.log('Session file removed due to auth failure');
    }
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.log('Client disconnected:', reason);
    // Update session file to mark as disconnected
    if (fs.existsSync(sessionPath)) {
        try {
            const sessionInfo = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            sessionInfo.connected = false;
            sessionInfo.lastDisconnected = new Date().toISOString();
            sessionInfo.disconnectReason = reason;
            fs.writeFileSync(sessionPath, JSON.stringify(sessionInfo, null, 2));
            console.log('Session updated with disconnect info');
        } catch (err) {
            console.error('Failed to update session on disconnect:', err);
        }
    }
});

client.initialize();

// Socket connection
io.on('connection', (socket) => {
    const now = new Date().toLocaleString();
    socket.emit('message', `${now} Connected`);

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit("qr", url);
            socket.emit('message', `${now} QR Code received`);
        });
    });

    client.on('ready', () => {
        socket.emit('message', `${now} WhatsApp is ready!`);
        // Emit session status to client
        if (fs.existsSync(sessionPath)) {
            try {
                const sessionInfo = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
                socket.emit('sessionInfo', sessionInfo);
            } catch (err) {
                console.error('Failed to read session for socket:', err);
            }
        }
    });

    client.on('auth_failure', () => {
        socket.emit('message', `${now} Auth failure, restarting...`);
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', `${now} Disconnected`, reason);
        client.destroy();
        client.initialize();
    });
});

// Send message endpoint
app.post('/send', (req, res) => {
    let phone = req.body.phone;
    const message = req.body.message;

    if (phone.startsWith('0')) {
        phone = '62' + phone.slice(1) + '@c.us';
    } else if (phone.startsWith('62')) {
        phone = phone + '@c.us';
    } else {
        phone = '62' + phone + '@c.us';
    }

    client.sendMessage(phone, message)
        .then(response => {
            res.status(200).json({
                error: false,
                data: {
                    message: 'Pesan terkirim',
                    meta: response,
                },
            });
        })
        .catch(error => {
            res.status(200).json({
                error: true,
                data: {
                    message: 'Error send message',
                    meta: error,
                },
            });
        });
});

// Get message endpoint
app.get('/getmessage', (req, res) => {
    client.getChats()
        .then(response => {
            res.status(200).json({
                error: false,
                data: {
                    message: 'Pesan',
                    meta: response,
                },
            });
        })
        .catch(error => {
            res.status(200).json({
                error: true,
                data: {
                    message: 'Error message',
                    meta: error,
                },
            });
        });
});

// Get session info endpoint
app.get('/session', (req, res) => {
    if (fs.existsSync(sessionPath)) {
        try {
            const sessionInfo = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            res.status(200).json({
                error: false,
                data: {
                    message: 'Session info',
                    meta: sessionInfo,
                },
            });
        } catch (err) {
            res.status(500).json({
                error: true,
                data: {
                    message: 'Error reading session',
                    meta: err.message,
                },
            });
        }
    } else {
        res.status(404).json({
            error: true,
            data: {
                message: 'No session found',
                meta: null,
            },
        });
    }
});

// Clear session endpoint
app.delete('/session', (req, res) => {
    try {
        if (fs.existsSync(sessionPath)) {
            fs.unlinkSync(sessionPath);
        }
        // Also remove auth data directory
        const authPath = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        res.status(200).json({
            error: false,
            data: {
                message: 'Session cleared successfully',
                meta: null,
            },
        });
    } catch (err) {
        res.status(500).json({
            error: true,
            data: {
                message: 'Error clearing session',
                meta: err.message,
            },
        });
    }
});

server.listen(PORT, () => {
    console.log('App listen on port', PORT);
    if (sessionData) {
        console.log('Previous session found, attempting auto-reconnect...');
    } else {
        console.log('No previous session found, QR scan will be required');
    }
});
