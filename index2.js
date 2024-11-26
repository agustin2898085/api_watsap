const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = 3000;

// Configuración de Express para manejar JSON
app.use(bodyParser.json());

let qrCode = null;  // Para almacenar el QR generado

// Inicializar cliente de WhatsApp
const client = new Client();

client.on('qr', (qr) => {
    // Guardar el QR para que pueda ser consultado por Laravel
    qrCode = qr;
    console.log('QR generado');
});

client.on('ready', () => {
    console.log('Cliente de WhatsApp listo!');
});

client.initialize();

// Endpoint para obtener el QR
app.get('/get-qr', (req, res) => {
    if (qrCode) {
        res.status(200).json({ qrCode: qrCode });
    } else {
        res.status(404).json({ message: 'QR aún no generado' });
    }
});

// Endpoint para enviar mensaje
app.post('/send-message', (req, res) => {
    const { telefono, mensaje } = req.body;
    const chatId = `${telefono}@c.us`; // WhatsApp usa el formato: numero@c.us

    // Enviar el mensaje
    client.sendMessage(chatId, mensaje)
        .then(() => {
            res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
        })
        .catch((err) => {
            res.status(500).json({ success: false, message: 'Error al enviar el mensaje.', error: err });
        });
});


// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor Node.js corriendo en http://127.0.0.1:${port}`);
});
