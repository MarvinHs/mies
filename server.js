const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./src/db');
const V = require('./src/views');
const D = require('./src/data');
const admin = require('./src/admin');
const CV = require('./src/cv');
const Contacto = require('./src/contacto');
const P = require('./src/paginas');

const PORT = process.env.PORT || 3000;
const COOKIE = 'mies_s';
const DIAS_SESION = 7;

/* ---------- utilidades ---------- */
function hashClave(clave) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(clave, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verificarClave(clave, guardado) {
  const [salt, hash] = String(guardado).split(':');
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(clave, salt, 64);
  const orig = Buffer.from(hash, 'hex');
  return orig.length === calc.length && crypto.timingSafeEqual(orig, calc);
}
const ahora = () => new Date().toISOString();
const telNorm = (t) => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : null; };
const intentosRec = new Map();
function limiteRecuperar(ip) {
  const t = Date.now(); const l = (intentosRec.get(ip) || []).filter(x => t - x < 3600e3); l.push(t); intentosRec.set(ip, l); return l.length > 5;
}
const ipDe = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

async function borrarCuenta(usuarioId) {
  const p = await db.one('SELECT id FROM perfiles WHERE usuario_id = ?', [usuarioId]);
  if (p) {
    await db.q('DELETE FROM asignaciones WHERE perfil_id = ?', [p.id]);
    await db.q('DELETE FROM eventos WHERE perfil_id = ?', [p.id]);
    await db.q('DELETE FROM perfiles WHERE id = ?', [p.id]);
  }
  await db.q('DELETE FROM cvs WHERE usuario_id = ?', [usuarioId]);
  await db.q('DELETE FROM recuperaciones WHERE usuario_id = ?', [usuarioId]);
  await db.q('DELETE FROM sesiones WHERE usuario_id = ?', [usuarioId]);
  await db.q('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
}

function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 200000) { reject(new Error('Cuerpo muy grande')); req.destroy(); } });
    req.on('end', () => {
      const p = new URLSearchParams(data);
      const o = {};
      for (const [k, v] of p) o[k] = v.trim();
      resolve(o);
    });
    req.on('error', reject);
  });
}

function enviar(res, status, html, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...headers });
  res.end(html);
}
function redirigir(res, url, flash) {
  const headers = { Location: url };
  if (flash) headers['Set-Cookie'] = `mies_f=${encodeURIComponent(JSON.stringify(flash))}; Path=/; Max-Age=30; SameSite=Lax; HttpOnly`;
  res.writeHead(303, headers);
  res.end();
}

async function usuarioActual(req) {
  const t = cookies(req)[COOKIE];
  if (!t) return null;
  const row = await db.one(
    'SELECT u.id, u.usuario, u.rol, u.debe_cambiar, s.expira FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = ?', [t]);
  if (!row || Number(row.expira) < Date.now()) return null;
  return row;
}
async function iniciarSesion(req, res, usuarioId, destino) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.q('INSERT INTO sesiones (token, usuario_id, expira) VALUES (?, ?, ?)', [token, usuarioId, Date.now() + DIAS_SESION * 864e5]);
  const seguro = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  res.writeHead(303, { Location: destino, 'Set-Cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS_SESION * 86400}${seguro}` });
  res.end();
}

/* ---------- estáticos ---------- */
const TIPOS = { '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8' };
function estatico(req, res, ruta) {
  const base = path.join(__dirname, 'public');
  const archivo = path.normalize(path.join(base, ruta));
  if (!archivo.startsWith(base)) return enviar(res, 404, 'No encontrado');
  fs.readFile(archivo, (err, buf) => {
    if (err) return enviar(res, 404, 'No encontrado');
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
    res.end(buf);
  });
}

/* ---------- perfil ---------- */
const CAMPOS = ['nombre', 'telefono', 'correo', 'provincia', 'sector', 'oficio', 'oficio_otro', 'nivel', 'experiencia', 'disponibilidad', 'salario', 'titulos', 'resumen', 'web',
  ...D.VALORES.flatMap(v => [v.key + '_caso', v.key + '_esc']), ...D.FE.map(f => f.key), 'ref_nombre', 'ref_relacion', 'ref_telefono', 'consentimiento'];

function normalizarWeb(u) {
  u = (u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.slice(0, 300);
}
function webValida(u) {
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname.includes('.'); } catch { return false; }
}

function validar(d) {
  const e = [];
  if (!d.nombre) e.push('Nombre completo');
  if (!d.telefono || d.telefono.replace(/\D/g, '').length < 10) e.push('Teléfono / WhatsApp válido (10 dígitos)');
  if (d.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.correo)) e.push('Correo válido (o déjalo vacío)');
  if (!D.PROVINCIAS.includes(d.provincia)) e.push('Provincia');
  if (!d.oficio) e.push('Oficio o profesión');
  if (d.oficio === 'Otro' && !d.oficio_otro) e.push('Indica cuál es tu oficio');
  if (!D.NIVELES.includes(d.nivel)) e.push('Nivel educativo');
  if (d.experiencia === '' || isNaN(+d.experiencia) || +d.experiencia < 0) e.push('Años de experiencia');
  if (!D.DISPONIBILIDAD.includes(d.disponibilidad)) e.push('Disponibilidad');
  if (!D.SALARIOS.includes(d.salario)) e.push('Aspiración salarial');
  if (!d.resumen) e.push('Breve descripción de tu experiencia');
  if (d.web && !webValida(d.web)) e.push('Una dirección web válida (o déjala vacía)');
  for (const v of D.VALORES) {
    if (!d[v.key + '_caso'] || !d[v.key + '_esc']) e.push(`Las dos preguntas de ${v.titulo}`);
  }
  if (!d.ref_nombre || !d.ref_relacion || !d.ref_telefono) e.push('Los datos de tu referencia');
  if (d.consentimiento !== 'si') e.push('Marcar la casilla de consentimiento');
  return e;
}

async function guardarPerfil(user, body) {
  const d = {};
  for (const c of CAMPOS) d[c] = (body[c] || '').slice(0, 1500);
  d.web = normalizarWeb(d.web);
  // Solo valores válidos en selects
  const oficios = D.OFICIOS.flatMap(g => g.items);
  if (d.oficio && !oficios.includes(d.oficio)) d.oficio = '';
  for (const f of D.FE) if (d[f.key] && !f.opciones.includes(d[f.key])) d[f.key] = '';
  const pts = D.puntajes(d);
  const actual = await db.one('SELECT * FROM perfiles WHERE usuario_id = ?', [user.id]);
  const oficioMostrar = d.oficio === 'Otro' && d.oficio_otro ? `Otro: ${d.oficio_otro}` : d.oficio;
  const exp = d.experiencia === '' || isNaN(+d.experiencia) ? null : Math.max(0, Math.min(60, parseInt(d.experiencia, 10)));
  const vals = [JSON.stringify(d), d.nombre, d.telefono, d.provincia, oficioMostrar, exp, pts.total, ahora(), telNorm(d.telefono)];
  if (actual) {
    await db.q('UPDATE perfiles SET datos=?, nombre=?, telefono=?, provincia=?, oficio=?, experiencia=?, puntaje=?, actualizado=?, tel_norm=? WHERE id=?', [...vals, actual.id]);
    return { d, perfil: { ...actual } };
  }
  const [row] = await db.q('INSERT INTO perfiles (datos, nombre, telefono, provincia, oficio, experiencia, puntaje, actualizado, tel_norm, usuario_id, estado) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *', [...vals, user.id, 'borrador']);
  return { d, perfil: row };
}

/* ---------- router ---------- */
async function manejar(req, res) {
  const url = new URL(req.url, 'http://x');
  const ruta = url.pathname;
  const m = req.method;

  if (ruta.startsWith('/static/')) return estatico(req, res, ruta.slice(8));
  if (ruta === '/salud') return enviar(res, 200, 'ok');

  const user = await usuarioActual(req);
  const ck = cookies(req);
  let flash = null;
  if (ck.mies_f) { try { flash = JSON.parse(ck.mies_f); } catch { } res.setHeader('Set-Cookie', 'mies_f=; Path=/; Max-Age=0'); }

  if (ruta === '/' && m === 'GET') return enviar(res, 200, V.inicio(user));

  if (ruta === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(`User-agent: *\nDisallow: /admin\nDisallow: /perfil\nDisallow: /cuenta\nAllow: /\n`);
  }
  if (ruta === '/privacidad' && m === 'GET') return enviar(res, 200, P.privacidad(user));

  if (ruta === '/recuperar') {
    if (user) return redirigir(res, '/cuenta');
    if (m === 'GET') return enviar(res, 200, P.recuperar({ enviado: url.searchParams.has('ok') }));
    if (m === 'POST') {
      const b = await leerCuerpo(req);
      if (b.sitio) return redirigir(res, '/recuperar?ok=1');
      const usuario = (b.usuario || '').toLowerCase().slice(0, 40);
      const tn = telNorm(b.telefono);
      if (!usuario || !tn) return enviar(res, 400, P.recuperar({ error: 'Escribe tu usuario y un teléfono de 10 dígitos.', datos: b }));
      if (limiteRecuperar(ipDe(req))) return enviar(res, 429, P.recuperar({ error: 'Has hecho varias solicitudes seguidas. Intenta más tarde o escríbenos por contacto.', datos: b }));
      const u = await db.one("SELECT u.id, p.tel_norm FROM usuarios u LEFT JOIN perfiles p ON p.usuario_id = u.id WHERE u.usuario = ? AND u.rol = 'candidato'", [usuario]);
      await db.q('INSERT INTO recuperaciones (usuario_id, usuario, telefono, coincide, creado) VALUES (?,?,?,?,?)', [u ? u.id : null, usuario, b.telefono.slice(0, 30), u && u.tel_norm === tn ? 1 : 0, ahora()]);
      return redirigir(res, '/recuperar?ok=1');
    }
  }

  if (ruta === '/cuenta' || ruta.startsWith('/cuenta/')) {
    if (!user) return redirigir(res, '/entrar');
    if (user.rol === 'admin' && !Number(user.debe_cambiar)) return redirigir(res, '/admin/usuarios');
    const debe = Number(user.debe_cambiar) === 1;
    if (ruta === '/cuenta' && m === 'GET') return enviar(res, 200, P.cuenta({ user, flash, debeCambiar: debe }));
    if (ruta === '/cuenta/clave' && m === 'POST') {
      const b = await leerCuerpo(req);
      const u = await db.one('SELECT hash FROM usuarios WHERE id = ?', [user.id]);
      let error = null;
      if (!debe && !verificarClave(b.actual || '', u.hash)) error = 'La contraseña actual no es correcta.';
      else if ((b.clave || '').length < 6) error = 'La nueva contraseña debe tener al menos 6 caracteres.';
      else if (b.clave !== b.clave2) error = 'Las contraseñas nuevas no coinciden.';
      if (error) return enviar(res, 400, P.cuenta({ user, error, debeCambiar: debe }));
      await db.q('UPDATE usuarios SET hash = ?, debe_cambiar = 0 WHERE id = ?', [hashClave(b.clave), user.id]);
      await db.q('DELETE FROM sesiones WHERE usuario_id = ? AND token <> ?', [user.id, ck[COOKIE]]);
      return redirigir(res, user.rol === 'admin' ? '/admin' : (debe ? '/perfil' : '/cuenta'), { msg: 'Contraseña actualizada.' });
    }
    if (ruta === '/cuenta/eliminar' && m === 'POST' && user.rol !== 'admin') {
      const b = await leerCuerpo(req);
      const u = await db.one('SELECT hash FROM usuarios WHERE id = ?', [user.id]);
      if (!verificarClave(b.clave || '', u.hash)) return enviar(res, 400, P.cuenta({ user, error: 'La contraseña no es correcta. Tu cuenta no se eliminó.', debeCambiar: debe }));
      await borrarCuenta(user.id);
      res.writeHead(303, { Location: '/', 'Set-Cookie': [`${COOKIE}=; Path=/; Max-Age=0`, `mies_f=${encodeURIComponent(JSON.stringify({ msg: 'Tu cuenta y todos tus datos fueron eliminados.' }))}; Path=/; Max-Age=30; SameSite=Lax; HttpOnly`] });
      return res.end();
    }
  }

  // Si entró con contraseña temporal, debe cambiarla antes de seguir
  if (user && Number(user.debe_cambiar) && !ruta.startsWith('/static/') && ruta !== '/salir') return redirigir(res, '/cuenta');

  if (ruta === '/contacto') {
    if (m === 'GET') return enviar(res, 200, V.contacto({ user, enviado: url.searchParams.has('enviado') }));
    if (m === 'POST') {
      const b = await leerCuerpo(req);
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      const r = await Contacto.recibir(b, ip);
      if (r.ok) return redirigir(res, '/contacto?enviado=1');
      return enviar(res, 400, V.contacto({ user, errores: r.errores, datos: r.datos }));
    }
  }

  if (ruta === '/registro' || ruta === '/entrar') {
    const modo = ruta === '/registro' ? 'registro' : 'entrar';
    if (m === 'GET') {
      if (user) return redirigir(res, user.rol === 'admin' ? '/admin' : '/perfil');
      return enviar(res, 200, V.authForm({ user, modo }));
    }
    if (m === 'POST') {
      const b = await leerCuerpo(req);
      const usuario = (b.usuario || '').toLowerCase();
      if (modo === 'registro') {
        let error = null;
        if (!/^[a-z0-9._\-@]{3,40}$/.test(usuario)) error = 'El usuario debe tener entre 3 y 40 caracteres, sin espacios.';
        else if ((b.clave || '').length < 6) error = 'La contraseña debe tener al menos 6 caracteres.';
        else if (b.clave !== b.clave2) error = 'Las contraseñas no coinciden.';
        else if (await db.one('SELECT id FROM usuarios WHERE usuario = ?', [usuario])) error = 'Ese usuario ya existe. Elige otro.';
        if (error) return enviar(res, 400, V.authForm({ user: null, modo, error, usuario }));
        const [nuevo] = await db.q('INSERT INTO usuarios (usuario, hash, rol, creado) VALUES (?, ?, ?, ?) RETURNING id', [usuario, hashClave(b.clave), 'candidato', ahora()]);
        return iniciarSesion(req, res, nuevo.id, '/perfil');
      }
      const u = await db.one('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
      if (!u || !verificarClave(b.clave || '', u.hash)) return enviar(res, 401, V.authForm({ user: null, modo, error: 'Usuario o contraseña incorrectos.', usuario }));
      return iniciarSesion(req, res, u.id, Number(u.debe_cambiar) ? '/cuenta' : u.rol === 'admin' ? '/admin' : '/perfil');
    }
  }

  if (ruta === '/salir' && m === 'POST') {
    if (ck[COOKIE]) await db.q('DELETE FROM sesiones WHERE token = ?', [ck[COOKIE]]);
    res.writeHead(303, { Location: '/', 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0` });
    return res.end();
  }

  if (ruta === '/perfil/cv' || ruta === '/perfil/cv/borrar') {
    if (!user || user.rol === 'admin') return redirigir(res, '/entrar');
    if (m === 'GET' && ruta === '/perfil/cv') {
      if (await CV.enviar(res, user.id, url.searchParams.has('descargar'))) return;
      return redirigir(res, '/perfil');
    }
    if (m === 'POST' && ruta === '/perfil/cv/borrar') {
      await CV.borrar(user.id);
      const p = await db.one('SELECT id FROM perfiles WHERE usuario_id = ?', [user.id]);
      if (p) await db.q('INSERT INTO eventos (perfil_id, texto, autor, fecha) VALUES (?,?,?,?)', [p.id, 'El candidato quitó su currículum', user.usuario, ahora()]);
      return redirigir(res, '/perfil#cv', { msg: 'Currículum eliminado.' });
    }
    if (m === 'POST') {
      const r = await CV.subir(req, user.id);
      const ajax = req.headers['x-mies'] === '1';
      if (r.error) return ajax ? enviar(res, 400, JSON.stringify(r), { 'Content-Type': 'application/json' }) : redirigir(res, '/perfil#cv', { tipo: 'error', msg: r.error });
      const p = await db.one('SELECT id FROM perfiles WHERE usuario_id = ?', [user.id]);
      if (p) await db.q('INSERT INTO eventos (perfil_id, texto, autor, fecha) VALUES (?,?,?,?)', [p.id, `El candidato subió su currículum (${r.archivo})`, user.usuario, ahora()]);
      if (ajax) { const i = await CV.info(user.id); return enviar(res, 200, JSON.stringify({ ok: true, archivo: i.archivo, tamano: CV.tamanoTxt(i.tamano) }), { 'Content-Type': 'application/json' }); }
      return redirigir(res, '/perfil#cv', { msg: 'Currículum subido correctamente.' });
    }
  }

  if (ruta === '/perfil') {
    if (!user) return redirigir(res, '/entrar');
    if (user.rol === 'admin') return redirigir(res, '/admin');
    if (m === 'GET') {
      const perfil = await db.one('SELECT * FROM perfiles WHERE usuario_id = ?', [user.id]);
      const d = perfil ? JSON.parse(perfil.datos) : {};
      return enviar(res, 200, V.perfilForm({ user, perfil, d, flash, cv: await CV.info(user.id) }));
    }
    if (m === 'POST') {
      const b = await leerCuerpo(req);
      const { d, perfil } = await guardarPerfil(user, b);
      if (b.accion === 'enviar') {
        const errores = validar(d);
        const tn = telNorm(d.telefono);
        if (tn && await db.one("SELECT id FROM perfiles WHERE tel_norm = ? AND usuario_id <> ? AND estado <> 'borrador'", [tn, user.id])) {
          errores.push('Este teléfono ya está registrado con otra cuenta. Si es tuya y olvidaste la contraseña, usa «¿Olvidaste tu contraseña?» en la página de entrar.');
        }
        if (errores.length) return enviar(res, 400, V.perfilForm({ user, perfil, d, errores, cv: await CV.info(user.id) }));
        if (perfil.estado === 'borrador' || perfil.estado === 'rechazado') {
          await db.q('UPDATE perfiles SET estado = ?, enviado = ? WHERE usuario_id = ?', ['pendiente', ahora(), user.id]);
          await db.q('INSERT INTO eventos (perfil_id, texto, autor, fecha) VALUES (?,?,?,?)', [perfil.id, perfil.estado === 'rechazado' ? 'El candidato actualizó y reenvió su registro' : 'El candidato envió su registro', user.usuario, ahora()]);
          return redirigir(res, '/perfil', { msg: '¡Registro enviado! Nuestro equipo lo revisará pronto.' });
        }
        await db.q('INSERT INTO eventos (perfil_id, texto, autor, fecha) VALUES (?,?,?,?)', [perfil.id, 'El candidato actualizó sus datos', user.usuario, ahora()]);
        return redirigir(res, '/perfil', { msg: 'Cambios guardados.' });
      }
      return redirigir(res, '/perfil', { msg: 'Guardado. Puedes volver cuando quieras a terminarlo.' });
    }
  }

  if (ruta === '/admin' || ruta.startsWith('/admin/')) {
    if (!user) return redirigir(res, '/entrar');
    if (user.rol !== 'admin') return enviar(res, 403, V.layout({ user, title: 'Sin acceso', body: '<section class="wrap estrecho"><h1>Sin acceso</h1><p>Esta sección es solo para administradores.</p></section>' }));
    const b = m === 'POST' ? await leerCuerpo(req) : {};
    const r = await admin.manejar({ req, res, ruta, m, url, user, body: b, flash, redirigir, enviar, hashClave, ahora, borrarCuenta });
    if (r !== false) return;
  }

  enviar(res, 404, V.layout({ user, title: 'No encontrado', body: '<section class="wrap estrecho"><h1>Página no encontrada</h1><p><a href="/">Volver al inicio</a></p></section>' }));
}

async function crearAdminInicial() {
  const hay = await db.one("SELECT id FROM usuarios WHERE rol = 'admin'");
  if (hay) return;
  const usuario = (process.env.ADMIN_USER || 'admin').toLowerCase();
  const clave = process.env.ADMIN_PASS || 'admin123';
  const existe = await db.one('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
  if (existe) await db.q("UPDATE usuarios SET rol = 'admin', hash = ? WHERE id = ?", [hashClave(clave), existe.id]);
  else await db.q('INSERT INTO usuarios (usuario, hash, rol, creado) VALUES (?, ?, ?, ?)', [usuario, hashClave(clave), 'admin', ahora()]);
  console.log(`Administrador inicial creado: ${usuario}`);
}

(async () => {
  await db.init();
  await crearAdminInicial();
  await db.q('DELETE FROM sesiones WHERE expira < ?', [Date.now()]);
  http.createServer((req, res) => {
    manejar(req, res).catch(err => {
      console.error(err);
      if (!res.headersSent) enviar(res, 500, V.layout({ title: 'Error', body: '<section class="wrap estrecho"><h1>Ocurrió un error</h1><p>Intenta de nuevo en un momento.</p></section>' }));
      else res.end();
    });
  }).listen(PORT, () => console.log(`Mies escuchando en el puerto ${PORT}`));
})();
