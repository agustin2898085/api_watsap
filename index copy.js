const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const jwt = require('jsonwebtoken');  // Para manejar tokens JWT

const app = express();
const port = process.env.PORT || 3000;

// Clave secreta para generar/verificar JWT (debería estar en un archivo .env)
const SECRET_KEY = 'mi_clave_secreta';

// Configuración de Express para manejar JSON
app.use(bodyParser.json());

// Middleware para verificar el Bearer Token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Token no proporcionado' });
    }

    // Eliminar "Bearer " del token antes de verificar
    const bearerToken = token.split(' ')[1];

    jwt.verify(bearerToken, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = decoded;  // Guarda la información del usuario en la solicitud
        next();  // Continúa con la siguiente función
    });
}

let qrCode = null;  // Para almacenar el QR generado

// Inicializar cliente de WhatsApp
const client = new Client();

client.on('qr', (qr) => {
    qrCode = qr;
    console.log('QR generado');
});

client.on('ready', () => {
    console.log('Cliente de WhatsApp listo!');
});

client.initialize();

// Endpoint para obtener el QR (protegido con Bearer Token)
app.get('/get-qr', verifyToken, (req, res) => {
    if (qrCode) {
        res.status(200).json({ qrCode: qrCode });
    } else {
        res.status(404).json({ message: 'QR aún no generado' });
    }
});

// Endpoint para enviar mensaje (protegido con Bearer Token)
app.post('/send-message', verifyToken, (req, res) => {
    const { telefono, mensaje } = req.body;
    const chatId = `${telefono}@c.us`;  // WhatsApp usa el formato: numero@c.us

    // Enviar el mensaje
    client.sendMessage(chatId, mensaje)
        .then(() => {
            res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
        })
        .catch((err) => {
            res.status(500).json({ success: false, message: 'Error al enviar el mensaje.', error: err });
        });
});

// Endpoint para generar un token (para probar la autenticación)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Aquí deberías verificar el usuario y la contraseña en tu base de datos
    if (username === 'BolNet' && password === 'BoliviaNet@547.=') {
        const token = jwt.sign({ username: 'admin' }, SECRET_KEY, { expiresIn: '1h' });  // Generar el token
        res.json({ token: token });
    } else {
        res.status(401).json({ message: 'Credenciales incorrectas' });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor Node.js corriendo en http://127.0.0.1:${port}`);
});
