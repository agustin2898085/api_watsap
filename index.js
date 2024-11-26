const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('whatsapp-web.js');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET_KEY = process.env.SECRET_KEY;
const port = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Configuración de Express
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('¡Hola Mundo desde Node.js y Vercel!');
});

// Middleware para verificar el Bearer Token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Token no proporcionado' });
    }

    const bearerToken = token.split(' ')[1];

    jwt.verify(bearerToken, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = decoded;
        next();
    });
}

let qrCode = null;

// Inicialización del cliente de WhatsApp
async function initializeClient() {
    const client = new Client();

    client.on('qr', (qr) => {
        qrCode = qr;
        console.log('QR generado:', qr);
    });

    client.on('ready', () => {
        console.log('Cliente de WhatsApp listo!');
    });

    client.on('auth_failure', (msg) => {
        console.error('Error de autenticación con WhatsApp:', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('Cliente de WhatsApp desconectado:', reason);
        client.initialize();
    });

    await client.initialize();
    return client;
}

let client;

// Llamar a la función para inicializar el cliente de WhatsApp
initializeClient().then((initializedClient) => {
    client = initializedClient;
}).catch((error) => {
    console.error('Error al inicializar el cliente de WhatsApp:', error);
});

// Endpoint para obtener el QR
app.get('/get-qr', verifyToken, (req, res) => {
    if (qrCode) {
        res.status(200).json({ qrCode });
    } else {
        res.status(404).json({ message: 'QR aún no generado' });
    }
});

// Endpoint para enviar mensaje
app.post('/send-message', verifyToken, (req, res) => {
    if (!client.info || !client.info.pushname) {
        return res.status(503).json({ success: false, message: 'Cliente de WhatsApp no inicializado.' });
    }

    const { telefono, mensaje } = req.body;
    const chatId = `${telefono}@c.us`;

    client.sendMessage(chatId, mensaje)
        .then(() => {
            res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
        })
        .catch((err) => {
            res.status(500).json({ success: false, message: 'Error al enviar el mensaje.', error: err });
        });
});

// Endpoint para generar un token
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ username: 'admin' }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Credenciales incorrectas' });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://127.0.0.1:${port}`);
});
