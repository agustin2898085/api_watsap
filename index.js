const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('whatsapp-web.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configuración de variables de entorno
const SECRET_KEY = process.env.SECRET_KEY;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const port = process.env.PORT || 3000;

const app = express();

// Middleware para analizar cuerpos de solicitud en formato JSON
app.use(bodyParser.json());

// Cliente de WhatsApp
let client;
let qrCode = null;

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

// Función asíncrona para inicializar el cliente de WhatsApp
async function initializeClient() {
    client = new Client();

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
        // Reintentar la inicialización
        initializeClient();
    });

    try {
        await client.initialize();
    } catch (error) {
        console.error('Error al inicializar el cliente de WhatsApp:', error);
    }
}

// Llamada inicial para configurar el cliente de WhatsApp
initializeClient();

// Endpoint para obtener el QR
app.get('/get-qr', verifyToken, (req, res) => {
    if (qrCode) {
        res.status(200).json({ qrCode });
    } else {
        res.status(404).json({ message: 'QR aún no generado' });
    }
});

// Endpoint para enviar un mensaje
app.post('/send-message', verifyToken, async (req, res) => {
    try {
        if (!client || !client.info || !client.info.pushname) {
            return res.status(503).json({ success: false, message: 'Cliente de WhatsApp no inicializado.' });
        }

        const { telefono, mensaje } = req.body;
        const chatId = `${telefono}@c.us`;

        await client.sendMessage(chatId, mensaje);
        res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al enviar el mensaje.', error: err.message });
    }
});

// Endpoint para generar un token
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ username: 'admin' }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ token });
    }

    res.status(401).json({ message: 'Credenciales incorrectas' });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://127.0.0.1:${port}`);
});
