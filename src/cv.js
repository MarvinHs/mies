// Subida y descarga del currículum (CV). Se guarda dentro de la base de datos.
const db = require('./db');

const MAX = 2 * 1024 * 1024; // 2 MB
const TIPOS = {
  pdf: { mime: 'application/pdf', firma: (b) => b.slice(0, 4).toString('latin1') === '%PDF' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', firma: (b) => b[0] === 0x50 && b[1] === 0x4b },
  doc: { mime: 'application/msword', firma: (b) => b.slice(0, 4).toString('hex') === 'd0cf11e0' }
};

// Lee el cuerpo como Buffer. Si pasa del límite, sigue leyendo (sin guardar) y marca demasiadoGrande.
function leerBuffer(req, limite) {
  return new Promise((resolve, reject) => {
    const partes = []; let total = 0; let grande = false;
    req.on('data', (c) => { total += c.length; if (total > limite) { grande = true; partes.length = 0; } else partes.push(c); });
    req.on('end', () => resolve({ buf: grande ? null : Buffer.concat(partes), demasiadoGrande: grande }));
    req.on('error', reject);
  });
}

// Extrae el primer archivo de un cuerpo multipart/form-data
function primerArchivo(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return null;
  const limite = Buffer.from('--' + (m[1] || m[2]).trim());
  let pos = buf.indexOf(limite);
  while (pos !== -1) {
    const ini = pos + limite.length + 2; // salta \r\n
    const finCab = buf.indexOf('\r\n\r\n', ini);
    if (finCab === -1) break;
    const cab = buf.slice(ini, finCab).toString('utf8');
    const sig = buf.indexOf(limite, finCab);
    if (sig === -1) break;
    const nombre = /filename="([^"]*)"/i.exec(cab);
    if (nombre && nombre[1]) {
      return { archivo: nombre[1].split(/[\\/]/).pop(), contenido: buf.slice(finCab + 4, sig - 2) };
    }
    pos = sig;
  }
  return null;
}

async function subir(req, usuarioId) {
  const largo = parseInt(req.headers['content-length'] || '0', 10);
  const { buf, demasiadoGrande } = await leerBuffer(req, MAX + 64 * 1024);
  if (demasiadoGrande || largo > MAX + 64 * 1024) return { error: 'El archivo pasa de 2 MB. Guárdalo como PDF más liviano e inténtalo de nuevo.' };
  const f = primerArchivo(buf, req.headers['content-type']);
  if (!f || !f.contenido.length) return { error: 'Elige un archivo antes de pulsar «Subir».' };
  if (f.contenido.length > MAX) return { error: 'El archivo pasa de 2 MB.' };
  const ext = (f.archivo.split('.').pop() || '').toLowerCase();
  const t = TIPOS[ext];
  if (!t || !t.firma(f.contenido)) return { error: 'Solo se aceptan archivos PDF o Word (.pdf, .doc, .docx).' };
  const archivo = f.archivo.replace(/[^\p{L}\p{N} ._()-]/gu, '_').slice(0, 120) || `curriculum.${ext}`;
  const ahora = new Date().toISOString();
  const existe = await db.one('SELECT id FROM cvs WHERE usuario_id = ?', [usuarioId]);
  if (existe) await db.q('UPDATE cvs SET archivo=?, tipo=?, tamano=?, contenido=?, subido=? WHERE usuario_id=?', [archivo, t.mime, f.contenido.length, f.contenido, ahora, usuarioId]);
  else await db.q('INSERT INTO cvs (usuario_id, archivo, tipo, tamano, contenido, subido) VALUES (?,?,?,?,?,?)', [usuarioId, archivo, t.mime, f.contenido.length, f.contenido, ahora]);
  return { ok: true, archivo };
}

const info = (usuarioId) => db.one('SELECT archivo, tipo, tamano, subido FROM cvs WHERE usuario_id = ?', [usuarioId]);
const borrar = (usuarioId) => db.q('DELETE FROM cvs WHERE usuario_id = ?', [usuarioId]);

async function enviar(res, usuarioId, descargar) {
  const c = await db.one('SELECT archivo, tipo, contenido FROM cvs WHERE usuario_id = ?', [usuarioId]);
  if (!c) return false;
  const datos = Buffer.from(c.contenido);
  const inline = !descargar && c.tipo === 'application/pdf';
  res.writeHead(200, {
    'Content-Type': c.tipo,
    'Content-Length': datos.length,
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="curriculum.${c.tipo === 'application/pdf' ? 'pdf' : c.tipo.includes('openxml') ? 'docx' : 'doc'}"; filename*=UTF-8''${encodeURIComponent(c.archivo)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store'
  });
  res.end(datos);
  return true;
}

const tamanoTxt = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

module.exports = { subir, info, borrar, enviar, tamanoTxt, MAX };
