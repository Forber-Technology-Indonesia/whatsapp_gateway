const { Client } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const client = new Client({
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

server.listen(PORT, () => {
    console.log('App listen on port', PORT);
});
