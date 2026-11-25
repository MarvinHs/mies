// Formulario de contacto: guarda el mensaje en la base de datos y lo envía por correo con FormSubmit.
// Render (plan gratis) bloquea SMTP, por eso se usa un servicio por HTTPS.
// Variable de entorno: CONTACTO_CORREO = correo que recibe los mensajes.
const db = require('./db');

const intentos = new Map(); // ip -> [marcas de tiempo]
function limitado(ip) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) || []).filter(t => ahora - t < 60 * 60 * 1000);
  lista.push(ahora);
  intentos.set(ip, lista);
  return lista.length > 5; // máximo 5 mensajes por hora por IP
}

function validar(b) {
  const e = {};
  const nombre = (b.nombre || '').trim().slice(0, 120);
  const correo = (b.correo || '').trim().slice(0, 160);
  const mensaje = (b.mensaje || '').trim().slice(0, 3000);
  if (nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) e.correo = 'Escribe un correo válido para poder responderte.';
  if (mensaje.length < 5) e.mensaje = 'Escribe tu mensaje.';
  return { datos: { nombre, correo, mensaje }, errores: e };
}

async function enviarCorreo({ nombre, correo, mensaje }) {
  const destino = process.env.CONTACTO_CORREO;
  if (!destino) return false;
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(destino)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: process.env.SITIO_URL || 'https://mies-c85p.onrender.com', Referer: (process.env.SITIO_URL || 'https://mies-c85p.onrender.com') + '/contacto' },
      body: JSON.stringify({
        _subject: `Mies · Nuevo mensaje de ${nombre}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: correo,
        Nombre: nombre,
        Correo: correo,
        Mensaje: mensaje
      }),
      signal: AbortSignal.timeout(12000)
    });
    const j = await r.json().catch(() => ({}));
    const ok = r.ok && String(j.success) === 'true';
    if (!ok) console.log('FormSubmit:', r.status, JSON.stringify(j).slice(0, 300));
    return ok;
  } catch (err) {
    console.log('FormSubmit error:', err.message);
    return false;
  }
}

async function recibir(body, ip) {
  if (body.sitio) return { ok: true }; // campo trampa para bots: se ignora en silencio
  const { datos, errores } = validar(body);
  if (Object.keys(errores).length) return { errores, datos };
  if (limitado(ip)) return { errores: { general: 'Has enviado varios mensajes seguidos. Intenta de nuevo más tarde.' }, datos };
  const [fila] = await db.q('INSERT INTO mensajes (nombre, correo, mensaje, creado) VALUES (?,?,?,?) RETURNING id', [datos.nombre, datos.correo, datos.mensaje, new Date().toISOString()]);
  // El correo se envía sin hacer esperar al visitante
  enviarCorreo(datos).then(ok => { if (ok) db.q('UPDATE mensajes SET correo_enviado = 1 WHERE id = ?', [fila.id]).catch(() => {}); });
  return { ok: true };
}

module.exports = { recibir };
