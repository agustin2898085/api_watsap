const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = process.env.PORT || 3000;

// Crear el cliente de WhatsApp con autenticación local
const client = new Client({
  authStrategy: new LocalAuth(), // Usa LocalAuth para guardar la sesión localmente
});

client.on('qr', (qr) => {
  // Imprimir el código QR en la consola
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('El cliente de WhatsApp está listo');
});

client.on('message', (message) => {
  console.log('Mensaje recibido:', message.body);
});

// Inicia el cliente de WhatsApp
client.initialize();

// Configuración de la ruta de la API
app.get('/send-message', async (req, res) => {
  const { phone, message } = req.query;

  if (!phone || !message) {
    return res.status(400).send('Faltan parámetros');
  }

  try {
    const chat = await client.getChatById(`${phone}@c.us`);
    chat.sendMessage(message);
    res.send('Mensaje enviado correctamente');
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).send('Error al enviar mensaje');
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
