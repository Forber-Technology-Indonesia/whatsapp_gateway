const { Client, LocalAuth } = require('whatsapp-web.js');
// const fs = require('fs');
const express = require('express');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');

// // file config
// const SESSION_FILE_PATH = './wtf-session.json';
// let sessionCfg;
// if (fs.existsSync(SESSION_FILE_PATH)) {
//     sessionCfg = require(SESSION_FILE_PATH);
// }

// initial instance
const PORT = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const client = new Client();
// const client = new Client({
//     // authStrategy: new LocalAuth({
//     //     // clientId: '6288271014182'
//     //     clientId: '6285364083547'
//     // })

//     // restartOnAuthFail: true,
//     // puppeteer: {
//     //     headless: true,
//     //     args: [
//     //         '--no-sandbox',
//     //         '--disable-setuid-sandbox',
//     //         '--disable-dev-shm-usage',
//     //         '--disable-accelerated-2d-canvas',
//     //         '--no-first-run',
//     //         '--no-zygote',
//     //         '--single-process', // <- this one doesn't works in Windows
//     //         '--disable-gpu'
//     //     ],
//     // },
//     // session: sessionCfg
// });

// index routing and middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// initialize whatsapp and the example event
client.on('message', msg => {
    // console.log(msg)
    // if (msg.type == 'location') {
    //     console.log(msg.location)
    // }



    if (msg.body == '!ping') {
        msg.reply('pong');
    } else if (msg.body == 'skuy') {
        msg.reply('helo ma bradah');
    }
});
client.initialize();

// socket connection
var today = new Date();
var now = today.toLocaleString();
io.on('connection', (socket) => {
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

    // client.on('authenticated', (session) => {
    //     socket.emit('message', `${now} Whatsapp is authenticated!`);
    //     sessionCfg = session;
    //     fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
    //         if (err) {
    //             console.error(err);
    //         }
    //     });
    // });

    client.on('auth_failure', function (session) {
        socket.emit('message', `${now} Auth failure, restarting...`);
    });

    client.on('disconnected', function (reason) {
        socket.emit('message', `${now} Disconnected`, reason);
        // if (fs.existsSync(SESSION_FILE_PATH)) {
        //     fs.unlinkSync(SESSION_FILE_PATH, function (err) {
        //         if (err) return console.log(err);
        //         console.log('Session file deleted!');
        //     });
        client.destroy();
        client.initialize();
        // }
    });
});

// send message routing
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

    console.log(phone);

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

app.get('/getmessage', (req, res) => {
    // let chat_all = await client.getChats();

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
    // console.log('==============================================');
    // console.log(chat_all);


    // client.getChats()
    //     .then(response => {
    //         res.status(200).json({
    //             error: false,
    //             data: {
    //                 message: 'Last chat',
    //                 meta: response,
    //             },
    //         });
    //     })
    //     .catch(error => {
    //         res.status(200).json({
    //             error: true,
    //             data: {
    //                 message: 'Error send message',
    //                 meta: error,
    //             },
    //         });
    //     });
})

server.listen(PORT, () => {
    console.log('App listen on port ', PORT);
});