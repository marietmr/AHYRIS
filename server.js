require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/subscribe', async (req, res) => {
  const email = (req.body.email || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }

  try {
    await transporter.sendMail({
      from: `"AHYRIS - Coming Soon" <${process.env.FROM_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: '🔔 Nouvelle inscription — AHYRIS',
      text: `Nouvelle adresse inscrite : ${email}`,
      html: `<p>Nouvelle adresse inscrite sur la page Coming Soon :</p><p><strong>${email}</strong></p>`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur envoi email :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
