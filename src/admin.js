const db = require('./db');
const D = require('./data');
const V = require('./views');
const CV = require('./cv');
const P = require('./paginas');
const crypto = require('node:crypto');
const { h, fecha, fechaHora, badge, layout } = V;

const lay = (o) => layout({ ...o, admin: true });
const evento = (perfilId, texto, autor) => db.q('INSERT INTO eventos (perfil_id, texto, autor, fecha) VALUES (?,?,?,?)', [perfilId, texto, autor, new Date().toISOString()]);
const num = (x) => Number(x || 0);
const subnav = (activo) => `<div class="subnav">${[['/admin', 'Resumen'], ['/admin/candidatos', 'Candidatos'], ['/admin/empresas', 'Empresas'], ['/admin/solicitudes', 'Solicitudes'], ['/admin/mensajes', 'Mensajes'], ['/admin/usuarios', 'Administradores']]
  .map(([u, t]) => `<a href="${u}" class="${activo === u ? 'act' : ''}">${t}</a>`).join('')}</div>`;

/* ---------- Resumen ---------- */
async function resumen(user, flash) {
  const cuentas = {};
  for (const r of await db.q("SELECT estado, COUNT(*) AS n FROM perfiles GROUP BY estado")) cuentas[r.estado] = num(r.n);
  const emp = await db.one('SELECT COUNT(*) AS n FROM empresas');
  const sol = await db.one("SELECT COUNT(*) AS n FROM solicitudes WHERE estado = 'abierta'");
  const msj = await db.one('SELECT COUNT(*) AS n FROM mensajes WHERE leido = 0');
  const rec = await db.one('SELECT COUNT(*) AS n FROM recuperaciones WHERE atendida = 0');
  const ult = await db.q("SELECT id, nombre, oficio, provincia, enviado, puntaje FROM perfiles WHERE estado = 'pendiente' ORDER BY enviado DESC LIMIT 8");
  const tiles = Object.entries(D.ESTADOS).map(([k, e]) => `<a class="tile t-${e.c}" href="/admin/candidatos?estado=${k}"><b>${cuentas[k] || 0}</b><span>${h(e.t)}</span></a>`).join('');
  return lay({
    user, flash, title: 'Panel', body: `<section class="wrap">${subnav('/admin')}
    <h1>Panel de administración</h1>
    <div class="tiles">${tiles}
      <a class="tile t-neutro" href="/admin/empresas"><b>${num(emp.n)}</b><span>Empresas</span></a>
      <a class="tile t-neutro" href="/admin/solicitudes"><b>${num(sol.n)}</b><span>Solicitudes abiertas</span></a>
      <a class="tile ${num(msj.n) ? 't-oro' : 't-neutro'}" href="/admin/mensajes"><b>${num(msj.n)}</b><span>Mensajes sin leer</span></a>
      ${num(rec.n) ? `<a class="tile t-rojo" href="/admin/mensajes"><b>${num(rec.n)}</b><span>Olvidaron su contraseña</span></a>` : ''}
    </div>
    <h2>Pendientes de revisión</h2>
    ${ult.length ? tablaPerfiles(ult, false) : '<p class="vacio">No hay registros pendientes. 🎉</p>'}
    </section>`
  });
}

function tablaPerfiles(rows, conEstado = true) {
  return `<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Nombre</th><th>Oficio</th><th>Provincia</th>${conEstado ? '<th>Exp.</th>' : ''}<th>Valores</th>${conEstado ? '<th>Estado</th>' : ''}<th>Enviado</th></tr></thead><tbody>
  ${rows.map(r => `<tr onclick="location='/admin/candidatos/${r.id}'"><td><a href="/admin/candidatos/${r.id}">${h(r.nombre || '(sin nombre)')}</a>${Number(r.tiene_cv) ? ' <span class="clip" title="Tiene currículum">📎</span>' : ''}</td><td>${h(r.oficio || '—')}</td><td>${h(r.provincia || '—')}</td>${conEstado ? `<td>${r.experiencia ?? '—'}</td>` : ''}<td>${puntajeChip(r.puntaje)}</td>${conEstado ? `<td>${badge(r.estado)}</td>` : ''}<td>${fecha(r.enviado)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
const puntajeChip = (p) => p == null ? '<span class="muted">—</span>' : `<span class="pts ${p >= 80 ? 'alto' : p >= 60 ? 'medio' : 'bajo'}">${p}</span>`;

/* ---------- Lista de candidatos ---------- */
async function candidatos(user, url, flash) {
  const f = { estado: url.searchParams.get('estado') || '', oficio: url.searchParams.get('oficio') || '', provincia: url.searchParams.get('provincia') || '', q: url.searchParams.get('q') || '', orden: url.searchParams.get('orden') || 'reciente', cv: url.searchParams.get('cv') || '' };
  const where = [], p = [];
  if (f.estado) { where.push('estado = ?'); p.push(f.estado); } else { where.push("estado <> 'borrador'"); }
  if (f.oficio) { where.push('oficio LIKE ?'); p.push(f.oficio + '%'); }
  if (f.provincia) { where.push('provincia = ?'); p.push(f.provincia); }
  if (f.cv === '1') where.push('c.usuario_id IS NOT NULL');
  if (f.q) { where.push('(LOWER(nombre) LIKE ? OR telefono LIKE ? OR LOWER(datos) LIKE ?)'); const s = '%' + f.q.toLowerCase() + '%'; p.push(s, s, s); }
  const orden = { reciente: 'enviado DESC', puntaje: 'puntaje DESC NULLS LAST', experiencia: 'experiencia DESC NULLS LAST', nombre: 'nombre ASC' }[f.orden] || 'enviado DESC';
  const rows = await db.q(`SELECT p.id, p.nombre, p.oficio, p.provincia, p.experiencia, p.puntaje, p.estado, p.enviado,
    CASE WHEN c.usuario_id IS NULL THEN 0 ELSE 1 END AS tiene_cv
    FROM perfiles p LEFT JOIN cvs c ON c.usuario_id = p.usuario_id WHERE ${where.join(' AND ')} ORDER BY ${orden} LIMIT 500`, p);
  const borradores = await db.one("SELECT COUNT(*) AS n FROM perfiles WHERE estado = 'borrador'");
  const oficios = D.OFICIOS.flatMap(g => g.items);
  const tabs = [['', 'Todos los enviados'], ...Object.entries(D.ESTADOS).filter(([k]) => k !== 'borrador').map(([k, e]) => [k, e.t])]
    .map(([k, t]) => { const u = new URLSearchParams({ ...f, estado: k }); return `<a href="?${u}" class="${f.estado === k ? 'act' : ''}">${h(t)}</a>`; }).join('');
  return lay({
    user, flash, title: 'Candidatos', body: `<section class="wrap">${subnav('/admin/candidatos')}
    <h1>Candidatos</h1>
    <div class="tabs">${tabs}</div>
    <form class="filtros" method="get">
      <input type="hidden" name="estado" value="${h(f.estado)}">
      <input name="q" value="${h(f.q)}" placeholder="Buscar nombre, teléfono, título…">
      ${V.sel('oficio', oficios, f.oficio, 'Todos los oficios')}
      ${V.sel('provincia', D.PROVINCIAS, f.provincia, 'Todas las provincias')}
      <select name="orden">${[['reciente', 'Más recientes'], ['puntaje', 'Mejor puntaje de valores'], ['experiencia', 'Más experiencia'], ['nombre', 'Nombre']].map(([v, t]) => `<option value="${v}"${f.orden === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <label class="check filtro-cv"><input type="checkbox" name="cv" value="1"${f.cv === '1' ? ' checked' : ''}> <span>Solo con CV</span></label>
      <button class="btn btn-peq">Filtrar</button>
    </form>
    <p class="muted">${rows.length} resultado(s). ${num(borradores.n)} perfil(es) aún en borrador (no enviados).</p>
    ${rows.length ? tablaPerfiles(rows) : '<p class="vacio">No hay candidatos con esos filtros.</p>'}
    </section>`
  });
}

/* ---------- WhatsApp ---------- */
const waNumero = (tel) => { const d = String(tel || '').replace(/\D/g, ''); return d.length >= 10 ? '1' + d.slice(-10) : null; };
const waLink = (tel, texto) => { const n = waNumero(tel); return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null; };
function plantillas(p, d, asig) {
  const nombre = (d.nombre || p.nombre || '').split(' ')[0] || '';
  const sitio = P.SITIO();
  const emp = asig ? asig.empresa : '[empresa]';
  const puesto = asig ? (asig.puesto || asig.sol_puesto || '[puesto]') : '[puesto]';
  return [
    ['aceptado', 'Perfil aprobado', `Hola ${nombre}, te saluda el equipo de Mies. ¡Buenas noticias! Tu perfil fue aprobado y ya forma parte de nuestro banco de talento. Te contactaremos cuando una empresa busque a alguien como tú.`],
    ['en_espera', 'Perfil en espera', `Hola ${nombre}, te saluda el equipo de Mies. Recibimos tu registro y por ahora lo tenemos en espera. Te escribiremos en cuanto surja una oportunidad en tu área.`],
    ['rechazado', 'Perfil no aprobado', `Hola ${nombre}, gracias por registrarte en Mies. Por ahora tu perfil no fue aprobado. Puedes actualizar tus datos en ${sitio}/perfil y volver a enviarlo.`],
    ['propuesto', 'Propuesto a empresa', `Hola ${nombre}, te saluda el equipo de Mies. Te propusimos para el puesto de ${puesto} en ${emp}. ¿Sigues disponible? Respóndenos este mensaje para coordinar.`],
    ['entrevista', 'Entrevista', `Hola ${nombre}, te saluda el equipo de Mies. ${emp} quiere entrevistarte para el puesto de ${puesto}. Respóndenos para coordinar el día y la hora.`],
    ['contratado', 'Contratado', `¡Felicidades ${nombre}! Fuiste seleccionado para el puesto de ${puesto} en ${emp}. Todo el equipo de Mies te desea muchos éxitos.`],
    ['completar', 'Completar perfil', `Hola ${nombre}, te saluda el equipo de Mies. Vimos que tu perfil aún no está completo. Entra a ${sitio}/perfil, termina de llenarlo y pulsa «Enviar registro» para que podamos presentarte a empresas.`],
    ['libre', 'Mensaje libre', `Hola ${nombre}, te saluda el equipo de Mies. `]
  ];
}

/* ---------- Detalle de candidato ---------- */
async function detalle(user, id, flash) {
  const p = await db.one('SELECT p.*, u.usuario FROM perfiles p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?', [id]);
  if (!p) return null;
  const d = JSON.parse(p.datos || '{}');
  const pts = D.puntajes(d);
  const asig = await db.q('SELECT a.*, e.nombre AS empresa, s.puesto AS sol_puesto FROM asignaciones a JOIN empresas e ON e.id = a.empresa_id LEFT JOIN solicitudes s ON s.id = a.solicitud_id WHERE a.perfil_id = ? ORDER BY a.id DESC', [id]);
  const eventos = await db.q('SELECT * FROM eventos WHERE perfil_id = ? ORDER BY id DESC LIMIT 50', [id]);
  const cv = await CV.info(p.usuario_id);
  const duplicados = p.tel_norm ? await db.q('SELECT id, nombre, estado FROM perfiles WHERE tel_norm = ? AND id <> ?', [p.tel_norm, p.id]) : [];
  const asigUlt = asig[0] || null;
  const tpls = plantillas(p, d, asigUlt);
  const sugerida = asigUlt && ['propuesto', 'entrevista', 'contratado'].includes(asigUlt.estado) ? asigUlt.estado : (p.estado === 'borrador' ? 'completar' : (['aceptado', 'en_espera', 'rechazado'].includes(p.estado) ? p.estado : 'libre'));
  const telWa = waNumero(d.telefono);
  const empresas = await db.q('SELECT id, nombre FROM empresas WHERE activa = 1 ORDER BY nombre');
  const sols = await db.q("SELECT s.id, s.puesto, s.oficio, e.nombre AS empresa, s.empresa_id FROM solicitudes s JOIN empresas e ON e.id = s.empresa_id WHERE s.estado = 'abierta' ORDER BY e.nombre, s.puesto");
  const fila = (t, v) => `<div class="dato"><span>${t}</span><b>${h(v || '—')}</b></div>`;
  const valoresHtml = D.VALORES.map(v => {
    const op = v.opciones.find(o => o.v === d[v.key + '_caso']);
    const esc = parseInt(d[v.key + '_esc'], 10);
    return `<div class="val-card"><div class="val-top"><b>${h(v.titulo)}</b>${puntajeChip(pts[v.key])}</div>
      <p class="muted peq">${h(v.pregunta)}</p><p>${op ? `${['✗', '◐', '✓'][op.p]} ${h(op.t)}` : '<i>Sin respuesta</i>'}</p>
      <p class="muted peq">“${h(v.frase)}”</p><p>${esc ? h(D.ESCALA[esc - 1]) : '<i>Sin respuesta</i>'}</p></div>`;
  }).join('');
  const accionesEstado = [['aceptado', 'Aceptar', 'btn-verde'], ['en_espera', 'Poner en espera', 'btn-ambar'], ['rechazado', 'Rechazar', 'btn-rojo']]
    .filter(([k]) => k !== p.estado).map(([k, t, c]) => `<button class="btn ${c}" name="estado" value="${k}">${t}</button>`).join('');
  const asigActiva = asig.find(a => ['propuesto', 'entrevista', 'contratado'].includes(a.estado));

  return lay({
    user, flash, title: p.nombre || 'Candidato', body: `<section class="wrap">${subnav('/admin/candidatos')}
  <p><a href="/admin/candidatos">← Volver a candidatos</a></p>
  <div class="cab-detalle"><div><h1>${h(p.nombre || '(sin nombre)')}</h1><p class="muted">${[p.oficio, p.provincia].filter(Boolean).map(h).join(' · ')}${p.oficio || p.provincia ? ' · ' : ''}usuario <code>${h(p.usuario)}</code></p></div>
    <div class="cab-der">${badge(p.estado)}<div class="pts-grande">${pts.total ?? '—'}<small>puntaje de valores</small></div></div></div>

  ${duplicados.length ? `<div class="alerta">⚠ <b>Posible registro duplicado:</b> este teléfono también aparece en ${duplicados.map(x => `<a href="/admin/candidatos/${x.id}">${h(x.nombre || '(sin nombre)')}</a> (${h((D.ESTADOS[x.estado] || {}).t || x.estado)})`).join(', ')}.</div>` : ''}
  <div class="botones"><a class="btn btn-peq" href="/admin/candidatos/${p.id}/ficha" target="_blank" rel="noopener">📄 Ficha para empresa (PDF)</a>${cv ? `<a class="btn btn-peq btn-sec" href="/admin/candidatos/${p.id}/cv?descargar=1">Descargar CV</a>` : ''}</div>
  <div class="grid-det">
   <div>
    <div class="panel"><h2>Datos de contacto</h2><div class="datos">
      ${fila('Teléfono / WhatsApp', d.telefono)}${fila('Correo', d.correo)}${fila('Provincia', d.provincia)}${fila('Sector o municipio', d.sector)}</div>
      ${d.telefono ? `<p><a class="btn btn-peq btn-sec" target="_blank" rel="noopener" href="https://wa.me/1${h(d.telefono.replace(/\D/g, '').slice(-10))}">Escribir por WhatsApp</a></p>` : ''}
    </div>
    <div class="panel"><h2>Área</h2><div class="datos">
      ${fila('Oficio o profesión', p.oficio)}${fila('Nivel educativo', d.nivel)}${fila('Años de experiencia', d.experiencia)}${fila('Disponibilidad', d.disponibilidad)}${fila('Aspiración salarial', d.salario)}</div>
      ${fila('Títulos, certificaciones y cursos', d.titulos)}
      <div class="dato"><span>Experiencia</span><p class="texto">${h(d.resumen || '—')}</p></div>
      <div class="dato"><span>Página web o portafolio</span>${d.web ? `<b><a href="${h(d.web)}" target="_blank" rel="noopener noreferrer nofollow">${h(d.web.replace(/^https?:\/\//, ''))} ↗</a></b>` : '<b>—</b>'}</div>
    </div>
    <div class="panel"><h2>Currículum</h2>
      ${cv ? `<p>📄 <b>${h(cv.archivo)}</b> <span class="muted peq">· ${CV.tamanoTxt(cv.tamano)} · subido ${fecha(cv.subido)}</span></p>
        <div class="botones">${cv.tipo === 'application/pdf' ? `<a class="btn btn-peq" href="/admin/candidatos/${p.id}/cv" target="_blank" rel="noopener">Ver CV</a>` : ''}<a class="btn btn-peq btn-sec" href="/admin/candidatos/${p.id}/cv?descargar=1">Descargar</a></div>`
      : '<p class="muted">El candidato no ha subido currículum.</p>'}
    </div>
    <div class="panel"><h2>Valores</h2><div class="val-grid">${valoresHtml}</div></div>
    <div class="panel"><h2>Fe <span class="opc-tag">Opcional</span></h2><div class="datos">${D.FE.map(f => fila(f.t, d[f.key] || 'Prefirió no responder')).join('')}</div></div>
    <div class="panel"><h2>Referencia</h2><div class="datos">${fila('Nombre', d.ref_nombre)}${fila('Relación', d.ref_relacion)}${fila('Teléfono', d.ref_telefono)}</div>
      <p class="muted peq">Consentimiento: ${d.consentimiento === 'si' ? '✓ Autorizó compartir sus datos y contactar su referencia' : '✗ No marcado'}</p></div>
   </div>

   <aside>
    <div class="panel"><h2>Decisión</h2>
      <form method="post" action="/admin/candidatos/${p.id}/estado">
        <label>Nota interna <span class="opc">(opcional)</span><textarea name="nota" rows="2" placeholder="Motivo, observaciones de la entrevista…"></textarea></label>
        <div class="botones">${accionesEstado}</div>
      </form>
      ${p.nota_admin ? `<p class="muted peq">Última nota: ${h(p.nota_admin)}</p>` : ''}
    </div>

    <div class="panel wa-panel"><h2>Avisar por WhatsApp</h2>
      ${telWa ? `<label>Mensaje<select id="wa-tpl">${tpls.map(([k, t]) => `<option value="${k}"${k === sugerida ? ' selected' : ''}>${h(t)}</option>`).join('')}</select></label>
      <textarea id="wa-txt" rows="5">${h((tpls.find(t => t[0] === sugerida) || tpls[0])[2])}</textarea>
      <a class="btn btn-wa ancho" id="wa-btn" target="_blank" rel="noopener" href="#" style="margin:10px 0 0;text-align:center">Abrir WhatsApp</a>
      <script>(function(){var T=${JSON.stringify(Object.fromEntries(tpls.map(([k, , t]) => [k, t]))).replace(/</g, '\\u003c')};var s=document.getElementById('wa-tpl'),x=document.getElementById('wa-txt'),b=document.getElementById('wa-btn');
      function u(){b.href='https://wa.me/${telWa}?text='+encodeURIComponent(x.value);}s.onchange=function(){x.value=T[s.value];u();};x.oninput=u;u();})();</script>`
      : '<p class="muted">El candidato no tiene un teléfono válido de 10 dígitos.</p>'}
    </div>

    <div class="panel"><h2>${asigActiva ? 'Asignar a otra empresa' : 'Colocar en una empresa'}</h2>
      ${p.estado === 'aceptado' || p.estado === 'colocado' ? (empresas.length ? `
      <form method="post" action="/admin/candidatos/${p.id}/asignar">
        <label>Solicitud abierta <span class="opc">(recomendado)</span><select name="solicitud_id"><option value="">— Sin solicitud específica —</option>
          ${sols.map(s => `<option value="${s.id}">${h(s.empresa)} · ${h(s.puesto)}${s.oficio && p.oficio && p.oficio.startsWith(s.oficio) ? ' ★ coincide' : ''}</option>`).join('')}</select></label>
        <label>…o empresa<select name="empresa_id"><option value="">— Elige si no usas solicitud —</option>${empresas.map(e => `<option value="${e.id}">${h(e.nombre)}</option>`).join('')}</select></label>
        <label>Puesto<input name="puesto" placeholder="Se toma de la solicitud si lo dejas vacío"></label>
        <label>Nota <span class="opc">(opcional)</span><input name="nota"></label>
        <button class="btn ancho">Asignar candidato</button>
      </form>` : '<p>Primero <a href="/admin/empresas">crea una empresa</a>.</p>') : '<p class="muted">Para colocarlo, primero acepta el perfil.</p>'}
    </div>

    <div class="panel"><h2>Colocaciones</h2>
      ${asig.length ? asig.map(a => `<div class="asig">
        <div><b><a href="/admin/empresas/${a.empresa_id}">${h(a.empresa)}</a></b> · ${h(a.puesto || a.sol_puesto || '')}</div>
        <div>${badge(a.estado, D.ESTADOS_ASIG)} <span class="muted peq">${fecha(a.actualizado)}</span></div>
        ${a.nota ? `<p class="muted peq">${h(a.nota)}</p>` : ''}
        <form method="post" action="/admin/asignaciones/${a.id}/estado" class="mini">
          <select name="estado">${Object.entries(D.ESTADOS_ASIG).map(([k, e]) => `<option value="${k}"${k === a.estado ? ' selected' : ''}>${h(e.t)}</option>`).join('')}</select>
          <button class="btn btn-peq">Actualizar</button></form></div>`).join('') : '<p class="muted">Aún no ha sido asignado a ninguna empresa.</p>'}
      <p class="muted peq">Si marcas «No seleccionado» o «Relación finalizada», el candidato vuelve al mercado laboral (Aceptado · disponible) para recolocarlo.</p>
    </div>

    <div class="panel"><h2>Cuenta y acceso</h2>
      <p class="muted peq">Si el candidato olvidó su contraseña, genera una temporal y envíasela por WhatsApp. Al entrar, tendrá que crear una nueva.</p>
      <form method="post" action="/admin/candidatos/${p.id}/clave" onsubmit="return confirm('¿Generar una contraseña temporal? La actual dejará de funcionar.')"><button class="btn btn-peq btn-sec ancho">Generar contraseña temporal</button></form>
      <form method="post" action="/admin/candidatos/${p.id}/eliminar" onsubmit="return confirm('¿Eliminar este candidato con su cuenta, perfil, CV e historial? No se puede deshacer.')" style="margin-top:8px"><button class="btn btn-peq btn-sec ancho" style="color:var(--rojo)">Eliminar candidato y sus datos</button></form>
    </div>

    <div class="panel"><h2>Historial</h2><ul class="historial">${eventos.map(e => `<li><span class="muted peq">${fechaHora(e.fecha)} · ${h(e.autor || '')}</span><br>${h(e.texto)}</li>`).join('') || '<li class="muted">Sin movimientos</li>'}</ul></div>
   </aside>
  </div></section>`
  });
}

/* ---------- Empresas ---------- */
const formEmpresa = (e = {}) => `
  <label>Nombre de la empresa<input name="nombre" required value="${h(e.nombre)}"></label>
  <div class="dos"><label>RNC <span class="opc">(opcional)</span><input name="rnc" value="${h(e.rnc)}"></label><label>Sector / industria<input name="sector" value="${h(e.sector)}" placeholder="Ej.: Construcción"></label></div>
  <div class="dos"><label>Persona de contacto<input name="contacto" value="${h(e.contacto)}"></label><label>Teléfono<input name="telefono" value="${h(e.telefono)}"></label></div>
  <div class="dos"><label>Correo<input type="email" name="correo" value="${h(e.correo)}"></label><label>Dirección<input name="direccion" value="${h(e.direccion)}"></label></div>
  <label>Notas <span class="opc">(opcional)</span><textarea name="notas" rows="2">${h(e.notas)}</textarea></label>`;

async function empresas(user, flash) {
  const rows = await db.q(`SELECT e.*,
    (SELECT COUNT(*) FROM solicitudes s WHERE s.empresa_id = e.id AND s.estado = 'abierta') AS abiertas,
    (SELECT COUNT(*) FROM asignaciones a WHERE a.empresa_id = e.id AND a.estado = 'contratado') AS contratados
    FROM empresas e ORDER BY e.activa DESC, e.nombre`);
  return lay({
    user, flash, title: 'Empresas', body: `<section class="wrap">${subnav('/admin/empresas')}
    <h1>Empresas clientes</h1>
    <div class="grid-det"><div>
      ${rows.length ? `<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Empresa</th><th>Sector</th><th>Contacto</th><th>Solicitudes abiertas</th><th>Colocados</th></tr></thead><tbody>
      ${rows.map(e => `<tr onclick="location='/admin/empresas/${e.id}'" class="${e.activa ? '' : 'inactiva'}"><td><a href="/admin/empresas/${e.id}">${h(e.nombre)}</a>${e.activa ? '' : ' <span class="badge b-gris">Inactiva</span>'}</td><td>${h(e.sector || '—')}</td><td>${h(e.contacto || '—')}<br><span class="muted peq">${h(e.telefono || '')}</span></td><td>${num(e.abiertas)}</td><td>${num(e.contratados)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="vacio">Aún no has creado empresas.</p>'}
    </div><aside><div class="panel"><h2>Nueva empresa</h2><form method="post" action="/admin/empresas">${formEmpresa()}<button class="btn ancho">Crear empresa</button></form></div></aside></div>
    </section>`
  });
}

async function empresaDetalle(user, id, flash) {
  const e = await db.one('SELECT * FROM empresas WHERE id = ?', [id]);
  if (!e) return null;
  const sols = await db.q(`SELECT s.*, (SELECT COUNT(*) FROM asignaciones a WHERE a.solicitud_id = s.id AND a.estado = 'contratado') AS cubiertos,
    (SELECT COUNT(*) FROM asignaciones a WHERE a.solicitud_id = s.id AND a.estado IN ('propuesto','entrevista')) AS en_proceso
    FROM solicitudes s WHERE s.empresa_id = ? ORDER BY s.estado, s.id DESC`, [id]);
  const asig = await db.q('SELECT a.*, p.nombre, p.oficio, p.id AS pid FROM asignaciones a JOIN perfiles p ON p.id = a.perfil_id WHERE a.empresa_id = ? ORDER BY a.id DESC', [id]);
  const oficios = D.OFICIOS.flatMap(g => g.items);
  return lay({
    user, flash, title: e.nombre, body: `<section class="wrap">${subnav('/admin/empresas')}
    <p><a href="/admin/empresas">← Volver a empresas</a></p>
    <h1>${h(e.nombre)} ${e.activa ? '' : '<span class="badge b-gris">Inactiva</span>'}</h1>
    <div class="grid-det"><div>
      <div class="panel"><h2>Solicitudes de personal</h2>
        ${sols.length ? sols.map(s => `<div class="sol">
          <div class="sol-top"><b>${h(s.puesto)}</b> ${s.estado === 'abierta' ? '<span class="badge b-verde">Abierta</span>' : '<span class="badge b-gris">Cerrada</span>'}</div>
          <p class="muted peq">${h(s.oficio || 'Cualquier oficio')} · ${num(s.cantidad)} vacante(s) · ${num(s.cubiertos)} cubierta(s) · ${num(s.en_proceso)} en proceso${s.provincia ? ' · ' + h(s.provincia) : ''}${s.salario ? ' · ' + h(s.salario) : ''}</p>
          ${s.notas ? `<p class="peq">${h(s.notas)}</p>` : ''}
          <div class="botones">
            ${s.estado === 'abierta' ? `<a class="btn btn-peq" href="/admin/candidatos?estado=aceptado${s.oficio ? '&oficio=' + encodeURIComponent(s.oficio) : ''}${s.provincia ? '&provincia=' + encodeURIComponent(s.provincia) : ''}&orden=puntaje">Ver candidatos disponibles</a>` : ''}
            <form method="post" action="/admin/solicitudes/${s.id}/estado" class="inline"><button class="btn btn-peq btn-sec" name="estado" value="${s.estado === 'abierta' ? 'cerrada' : 'abierta'}">${s.estado === 'abierta' ? 'Cerrar' : 'Reabrir'}</button></form>
          </div></div>`).join('') : '<p class="muted">Sin solicitudes todavía.</p>'}
        <details class="nueva"><summary class="btn btn-sec btn-peq">+ Nueva solicitud</summary>
          <form method="post" action="/admin/empresas/${e.id}/solicitudes">
            <div class="dos"><label>Puesto<input name="puesto" required placeholder="Ej.: Electricista residencial"></label><label>Oficio requerido${V.sel('oficio', oficios, '', 'Cualquiera')}</label></div>
            <div class="dos"><label>Cantidad<input type="number" name="cantidad" min="1" value="1"></label><label>Provincia${V.sel('provincia', D.PROVINCIAS, '', 'Cualquiera')}</label></div>
            <label>Salario ofrecido <span class="opc">(opcional)</span><input name="salario"></label>
            <label>Requisitos / notas<textarea name="notas" rows="2"></textarea></label>
            <button class="btn">Crear solicitud</button>
          </form></details>
      </div>
      <div class="panel"><h2>Personas asignadas</h2>
        ${asig.length ? `<table class="tabla"><thead><tr><th>Candidato</th><th>Puesto</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${asig.map(a => `<tr onclick="location='/admin/candidatos/${a.pid}'"><td><a href="/admin/candidatos/${a.pid}">${h(a.nombre)}</a><br><span class="muted peq">${h(a.oficio || '')}</span></td><td>${h(a.puesto || '')}</td><td>${badge(a.estado, D.ESTADOS_ASIG)}</td><td>${fecha(a.actualizado)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Aún no hay candidatos asignados.</p>'}
      </div>
    </div><aside>
      <div class="panel"><h2>Datos de la empresa</h2><form method="post" action="/admin/empresas/${e.id}">${formEmpresa(e)}
        <label class="check"><input type="checkbox" name="activa" value="1"${e.activa ? ' checked' : ''}> <span>Empresa activa</span></label>
        <button class="btn ancho">Guardar cambios</button></form></div>
    </aside></div></section>`
  });
}

async function solicitudesLista(user, flash) {
  const rows = await db.q(`SELECT s.*, e.nombre AS empresa,
    (SELECT COUNT(*) FROM asignaciones a WHERE a.solicitud_id = s.id AND a.estado = 'contratado') AS cubiertos
    FROM solicitudes s JOIN empresas e ON e.id = s.empresa_id ORDER BY CASE WHEN s.estado = 'abierta' THEN 0 ELSE 1 END, s.id DESC`);
  return lay({
    user, flash, title: 'Solicitudes', body: `<section class="wrap">${subnav('/admin/solicitudes')}
    <h1>Solicitudes de las empresas</h1>
    <p class="muted">Para crear una solicitud entra a la empresa correspondiente.</p>
    ${rows.length ? `<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Empresa</th><th>Puesto</th><th>Oficio</th><th>Vacantes</th><th>Estado</th><th></th></tr></thead><tbody>
    ${rows.map(s => `<tr><td><a href="/admin/empresas/${s.empresa_id}">${h(s.empresa)}</a></td><td>${h(s.puesto)}</td><td>${h(s.oficio || 'Cualquiera')}</td><td>${num(s.cubiertos)} / ${num(s.cantidad)}</td><td>${s.estado === 'abierta' ? '<span class="badge b-verde">Abierta</span>' : '<span class="badge b-gris">Cerrada</span>'}</td>
      <td>${s.estado === 'abierta' ? `<a class="btn btn-peq" href="/admin/candidatos?estado=aceptado${s.oficio ? '&oficio=' + encodeURIComponent(s.oficio) : ''}${s.provincia ? '&provincia=' + encodeURIComponent(s.provincia) : ''}&orden=puntaje">Buscar candidatos</a>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="vacio">No hay solicitudes.</p>'}
    </section>`
  });
}

async function usuarios(user, flash) {
  const rows = await db.q("SELECT id, usuario, creado FROM usuarios WHERE rol = 'admin' ORDER BY id");
  const cand = await db.one("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'candidato'");
  return lay({
    user, flash, title: 'Administradores', body: `<section class="wrap">${subnav('/admin/usuarios')}
    <h1>Administradores</h1>
    <div class="grid-det"><div>
      <table class="tabla"><thead><tr><th>Usuario</th><th>Creado</th></tr></thead><tbody>${rows.map(r => `<tr><td>${h(r.usuario)}${r.id === user.id ? ' <span class="muted">(tú)</span>' : ''}</td><td>${fecha(r.creado)}</td></tr>`).join('')}</tbody></table>
      <p class="muted">${num(cand.n)} cuenta(s) de candidatos registradas.</p>
      <div class="panel mt"><h2>Respaldo de datos</h2><p class="muted">Descarga una copia de toda la información (usuarios, perfiles, currículums, empresas, solicitudes, colocaciones, mensajes e historial) en un archivo JSON. Guárdalo en un lugar seguro: contiene datos personales.</p>
      <a class="btn" href="/admin/respaldo">Descargar respaldo</a></div>
    </div><aside>
      <div class="panel"><h2>Nuevo administrador</h2><form method="post" action="/admin/usuarios">
        <label>Usuario<input name="usuario" required minlength="3" pattern="[A-Za-z0-9._\\-@]+"></label>
        <label>Contraseña<input type="password" name="clave" required minlength="8"></label>
        <button class="btn ancho">Crear administrador</button></form></div>
      <div class="panel"><h2>Cambiar mi contraseña</h2><form method="post" action="/admin/clave">
        <label>Nueva contraseña<input type="password" name="clave" required minlength="8"></label>
        <label>Repítela<input type="password" name="clave2" required minlength="8"></label>
        <button class="btn ancho">Cambiar contraseña</button></form></div>
    </aside></div></section>`
  });
}

/* ---------- Mensajes de contacto ---------- */
async function mensajes(user, url, flash) {
  const filtro = url.searchParams.get('ver') || 'todos';
  const rows = await db.q(`SELECT * FROM mensajes ${filtro === 'nuevos' ? 'WHERE leido = 0' : ''} ORDER BY id DESC LIMIT 300`);
  const nuevos = await db.one('SELECT COUNT(*) AS n FROM mensajes WHERE leido = 0');
  const destino = process.env.CONTACTO_CORREO;
  const recs = await db.q('SELECT r.*, p.id AS perfil_id, p.nombre FROM recuperaciones r LEFT JOIN perfiles p ON p.usuario_id = r.usuario_id WHERE r.atendida = 0 ORDER BY r.id DESC');
  return lay({
    user, flash, title: 'Mensajes', body: `<section class="wrap">${subnav('/admin/mensajes')}
    <h1>Mensajes de contacto</h1>
    <p class="muted">Los mensajes del formulario de contacto se guardan aquí${destino ? ` y se envían a <b>${h(destino)}</b>` : ''}.</p>
    ${recs.length ? `<div class="panel"><h2>Solicitudes de contraseña (${recs.length})</h2>
      <p class="muted peq">Candidatos que olvidaron su contraseña. Abre su ficha, pulsa «Generar contraseña temporal» y envíasela por WhatsApp. Solo hazlo si el teléfono coincide.</p>
      ${recs.map(r => `<div class="recup"><div><b>${h(r.usuario)}</b>${r.nombre ? ` · ${h(r.nombre)}` : ''} · tel. ${h(r.telefono || '')} ${Number(r.coincide) ? '<span class="badge b-verde">Teléfono coincide</span>' : r.usuario_id ? '<span class="badge b-rojo">Teléfono no coincide</span>' : '<span class="badge b-gris">Usuario no existe</span>'}<br><span class="muted peq">${fechaHora(r.creado)}</span></div>
      <div class="botones">${r.perfil_id ? `<a class="btn btn-peq" href="/admin/candidatos/${r.perfil_id}">Abrir ficha</a>` : ''}<form method="post" action="/admin/recuperaciones/${r.id}/atendida" class="inline"><button class="btn btn-peq btn-sec">Descartar</button></form></div></div>`).join('')}
    </div>` : ''}
    <div class="tabs"><a href="?ver=todos" class="${filtro !== 'nuevos' ? 'act' : ''}">Todos</a><a href="?ver=nuevos" class="${filtro === 'nuevos' ? 'act' : ''}">Sin leer (${num(nuevos.n)})</a></div>
    ${rows.length ? rows.map(r => `<div class="msg ${Number(r.leido) ? '' : 'nuevo'}">
      <div class="msg-top"><div><b>${h(r.nombre)}</b> · <a href="mailto:${h(r.correo)}?subject=${encodeURIComponent('Re: tu mensaje a Mies')}">${h(r.correo)}</a></div>
      <span class="muted peq">${fechaHora(r.creado)}${Number(r.correo_enviado) ? ' · ✉ enviado por correo' : ' · solo en el panel'}</span></div>
      <p class="msg-txt">${h(r.mensaje)}</p>
      <div class="botones">
        <a class="btn btn-peq" href="mailto:${h(r.correo)}?subject=${encodeURIComponent('Re: tu mensaje a Mies')}">Responder</a>
        <form method="post" action="/admin/mensajes/${r.id}/leido" class="inline"><button class="btn btn-peq btn-sec" name="leido" value="${Number(r.leido) ? 0 : 1}">${Number(r.leido) ? 'Marcar como no leído' : 'Marcar como leído'}</button></form>
        <form method="post" action="/admin/mensajes/${r.id}/borrar" class="inline" onsubmit="return confirm('¿Borrar este mensaje?')"><button class="btn btn-peq btn-sec">Borrar</button></form>
      </div></div>`).join('') : '<p class="vacio">No hay mensajes.</p>'}
    </section>`
  });
}

/* ---------- Router admin ---------- */
async function manejar({ res, ruta, m, url, user, body: b, flash, redirigir, enviar, hashClave, ahora, borrarCuenta }) {
  const seg = ruta.split('/').filter(Boolean); // ['admin', ...]
  const ok = (html) => enviar(res, 200, html);
  const quien = user.usuario;

  if (seg.length === 1 && m === 'GET') return ok(await resumen(user, flash));
  if (seg[1] === 'candidatos') {
    if (seg.length === 2 && m === 'GET') return ok(await candidatos(user, url, flash));
    const id = parseInt(seg[2], 10);
    if (!id) return false;
    if (seg.length === 3 && m === 'GET') { const html = await detalle(user, id, flash); return html ? ok(html) : false; }
    if (seg[3] === 'ficha' && m === 'GET') {
      const p = await db.one('SELECT * FROM perfiles WHERE id = ?', [id]);
      if (!p) return false;
      const d = JSON.parse(p.datos || '{}');
      const asignacion = await db.one("SELECT a.puesto, e.nombre AS empresa FROM asignaciones a JOIN empresas e ON e.id = a.empresa_id WHERE a.perfil_id = ? AND a.estado IN ('propuesto','entrevista') ORDER BY a.id DESC", [id]);
      const opciones = { contacto: url.searchParams.get('contacto') === '1', salario: url.searchParams.get('salario') !== '0' };
      return ok(P.ficha({ p, d, pts: D.puntajes(d), cv: await CV.info(p.usuario_id), opciones, asignacion }));
    }
    if (seg[3] === 'clave' && m === 'POST') {
      const p = await db.one('SELECT p.usuario_id, p.datos, p.nombre, u.usuario FROM perfiles p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?', [id]);
      if (!p) return false;
      const letras = 'abcdefghjkmnpqrstuvwxyz23456789';
      const temporal = 'mies-' + Array.from(crypto.randomBytes(6), x => letras[x % letras.length]).join('');
      await db.q('UPDATE usuarios SET hash = ?, debe_cambiar = 1 WHERE id = ?', [hashClave(temporal), p.usuario_id]);
      await db.q('DELETE FROM sesiones WHERE usuario_id = ?', [p.usuario_id]);
      await db.q('UPDATE recuperaciones SET atendida = 1 WHERE usuario_id = ?', [p.usuario_id]);
      await evento(id, 'Se generó una contraseña temporal', quien);
      const d = JSON.parse(p.datos || '{}');
      const texto = `Hola ${(d.nombre || p.nombre || '').split(' ')[0]}, te saluda el equipo de Mies. Para entrar a tu cuenta usa:\nUsuario: ${p.usuario}\nContraseña temporal: ${temporal}\nEntra en ${P.SITIO()}/entrar y crea tu nueva contraseña.`;
      return redirigir(res, `/admin/candidatos/${id}`, { msg: `Contraseña temporal para «${p.usuario}»: ${temporal}`, wa: waLink(d.telefono, texto) });
    }
    if (seg[3] === 'eliminar' && m === 'POST') {
      const p = await db.one('SELECT usuario_id, nombre FROM perfiles WHERE id = ?', [id]);
      if (!p) return false;
      await borrarCuenta(p.usuario_id);
      return redirigir(res, '/admin/candidatos', { msg: `Se eliminó a ${p.nombre || 'el candidato'} con todos sus datos.` });
    }
    if (seg[3] === 'cv' && m === 'GET') {
      const p = await db.one('SELECT usuario_id FROM perfiles WHERE id = ?', [id]);
      if (p && await CV.enviar(res, p.usuario_id, url.searchParams.has('descargar'))) return;
      return redirigir(res, `/admin/candidatos/${id}`, { tipo: 'error', msg: 'Este candidato no tiene currículum.' });
    }
    if (seg[3] === 'estado' && m === 'POST') {
      if (!['aceptado', 'en_espera', 'rechazado'].includes(b.estado)) return redirigir(res, `/admin/candidatos/${id}`);
      await db.q('UPDATE perfiles SET estado = ?, nota_admin = ? WHERE id = ?', [b.estado, b.nota || null, id]);
      await evento(id, `Estado cambiado a «${D.ESTADOS[b.estado].t}»${b.nota ? ': ' + b.nota : ''}`, quien);
      const pp = await db.one('SELECT * FROM perfiles WHERE id = ?', [id]);
      const dd = JSON.parse(pp.datos || '{}');
      const t = plantillas(pp, dd, null).find(x => x[0] === b.estado);
      return redirigir(res, `/admin/candidatos/${id}`, { msg: `Perfil marcado como ${D.ESTADOS[b.estado].t}.`, wa: t ? waLink(dd.telefono, t[2]) : null });
    }
    if (seg[3] === 'asignar' && m === 'POST') {
      let empresaId = parseInt(b.empresa_id, 10) || null, solId = parseInt(b.solicitud_id, 10) || null, puesto = b.puesto || '';
      if (solId) {
        const s = await db.one('SELECT * FROM solicitudes WHERE id = ?', [solId]);
        if (!s) return redirigir(res, `/admin/candidatos/${id}`, { tipo: 'error', msg: 'Solicitud no encontrada.' });
        empresaId = s.empresa_id; if (!puesto) puesto = s.puesto;
      }
      if (!empresaId) return redirigir(res, `/admin/candidatos/${id}`, { tipo: 'error', msg: 'Elige una solicitud o una empresa.' });
      const e = await db.one('SELECT nombre FROM empresas WHERE id = ?', [empresaId]);
      if (!e) return redirigir(res, `/admin/candidatos/${id}`, { tipo: 'error', msg: 'Empresa no encontrada.' });
      await db.q('INSERT INTO asignaciones (perfil_id, empresa_id, solicitud_id, puesto, estado, nota, creado, actualizado) VALUES (?,?,?,?,?,?,?,?)', [id, empresaId, solId, puesto, 'propuesto', b.nota || null, ahora(), ahora()]);
      await evento(id, `Propuesto a ${e.nombre}${puesto ? ' como ' + puesto : ''}`, quien);
      const pp = await db.one('SELECT * FROM perfiles WHERE id = ?', [id]);
      const dd = JSON.parse(pp.datos || '{}');
      const t = plantillas(pp, dd, { empresa: e.nombre, puesto }).find(x => x[0] === 'propuesto');
      return redirigir(res, `/admin/candidatos/${id}`, { msg: `Candidato asignado a ${e.nombre}.`, wa: waLink(dd.telefono, t[2]) });
    }
  }
  if (seg[1] === 'asignaciones' && seg[3] === 'estado' && m === 'POST') {
    const a = await db.one('SELECT a.*, e.nombre AS empresa FROM asignaciones a JOIN empresas e ON e.id = a.empresa_id WHERE a.id = ?', [parseInt(seg[2], 10)]);
    if (!a || !D.ESTADOS_ASIG[b.estado]) return false;
    await db.q('UPDATE asignaciones SET estado = ?, actualizado = ? WHERE id = ?', [b.estado, ahora(), a.id]);
    let extra = '';
    if (b.estado === 'contratado') {
      await db.q("UPDATE perfiles SET estado = 'colocado' WHERE id = ?", [a.perfil_id]); extra = ' El perfil pasó a «Colocado».';
    } else if (['no_seleccionado', 'finalizado'].includes(b.estado)) {
      const otra = await db.one("SELECT id FROM asignaciones WHERE perfil_id = ? AND estado = 'contratado' AND id <> ?", [a.perfil_id, a.id]);
      if (!otra) { await db.q("UPDATE perfiles SET estado = 'aceptado' WHERE id = ?", [a.perfil_id]); extra = ' El candidato volvió al mercado laboral.'; }
    }
    await evento(a.perfil_id, `${a.empresa}: ${D.ESTADOS_ASIG[b.estado].t}`, quien);
    const pp = await db.one('SELECT * FROM perfiles WHERE id = ?', [a.perfil_id]);
    const dd = JSON.parse(pp.datos || '{}');
    const t = plantillas(pp, dd, { ...a, estado: b.estado }).find(x => x[0] === b.estado);
    return redirigir(res, `/admin/candidatos/${a.perfil_id}`, { msg: 'Colocación actualizada.' + extra, wa: t ? waLink(dd.telefono, t[2]) : null });
  }
  if (seg[1] === 'empresas') {
    const campos = (x) => [x.nombre, x.rnc, x.sector, x.contacto, x.telefono, x.correo, x.direccion, x.notas];
    if (seg.length === 2 && m === 'GET') return ok(await empresas(user, flash));
    if (seg.length === 2 && m === 'POST') {
      if (!b.nombre) return redirigir(res, '/admin/empresas', { tipo: 'error', msg: 'El nombre es obligatorio.' });
      const [n] = await db.q('INSERT INTO empresas (nombre, rnc, sector, contacto, telefono, correo, direccion, notas, activa, creado) VALUES (?,?,?,?,?,?,?,?,1,?) RETURNING id', [...campos(b), ahora()]);
      return redirigir(res, `/admin/empresas/${n.id}`, { msg: 'Empresa creada. Ahora puedes registrar sus solicitudes de personal.' });
    }
    const id = parseInt(seg[2], 10);
    if (!id) return false;
    if (seg.length === 3 && m === 'GET') { const html = await empresaDetalle(user, id, flash); return html ? ok(html) : false; }
    if (seg.length === 3 && m === 'POST') {
      if (!b.nombre) return redirigir(res, `/admin/empresas/${id}`, { tipo: 'error', msg: 'El nombre es obligatorio.' });
      await db.q('UPDATE empresas SET nombre=?, rnc=?, sector=?, contacto=?, telefono=?, correo=?, direccion=?, notas=?, activa=? WHERE id=?', [...campos(b), b.activa ? 1 : 0, id]);
      return redirigir(res, `/admin/empresas/${id}`, { msg: 'Empresa actualizada.' });
    }
    if (seg[3] === 'solicitudes' && m === 'POST') {
      if (!b.puesto) return redirigir(res, `/admin/empresas/${id}`, { tipo: 'error', msg: 'El puesto es obligatorio.' });
      await db.q('INSERT INTO solicitudes (empresa_id, puesto, oficio, cantidad, salario, provincia, notas, estado, creado) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, b.puesto, b.oficio || null, Math.max(1, parseInt(b.cantidad, 10) || 1), b.salario || null, b.provincia || null, b.notas || null, 'abierta', ahora()]);
      return redirigir(res, `/admin/empresas/${id}`, { msg: 'Solicitud creada.' });
    }
  }
  if (seg[1] === 'solicitudes') {
    if (seg.length === 2 && m === 'GET') return ok(await solicitudesLista(user, flash));
    if (seg[3] === 'estado' && m === 'POST') {
      const s = await db.one('SELECT * FROM solicitudes WHERE id = ?', [parseInt(seg[2], 10)]);
      if (!s) return false;
      await db.q('UPDATE solicitudes SET estado = ? WHERE id = ?', [b.estado === 'cerrada' ? 'cerrada' : 'abierta', s.id]);
      return redirigir(res, `/admin/empresas/${s.empresa_id}`, { msg: b.estado === 'cerrada' ? 'Solicitud cerrada.' : 'Solicitud reabierta.' });
    }
  }
  if (seg[1] === 'usuarios') {
    if (m === 'GET') return ok(await usuarios(user, flash));
    const u = (b.usuario || '').toLowerCase();
    if (!/^[a-z0-9._\-@]{3,40}$/.test(u) || (b.clave || '').length < 8) return redirigir(res, '/admin/usuarios', { tipo: 'error', msg: 'Usuario inválido o contraseña menor de 8 caracteres.' });
    if (await db.one('SELECT id FROM usuarios WHERE usuario = ?', [u])) return redirigir(res, '/admin/usuarios', { tipo: 'error', msg: 'Ese usuario ya existe.' });
    await db.q('INSERT INTO usuarios (usuario, hash, rol, creado) VALUES (?,?,?,?)', [u, hashClave(b.clave), 'admin', ahora()]);
    return redirigir(res, '/admin/usuarios', { msg: `Administrador ${u} creado.` });
  }
  if (seg[1] === 'recuperaciones' && seg[3] === 'atendida' && m === 'POST') {
    await db.q('UPDATE recuperaciones SET atendida = 1 WHERE id = ?', [parseInt(seg[2], 10) || 0]);
    return redirigir(res, '/admin/mensajes');
  }
  if (seg[1] === 'mensajes') {
    if (seg.length === 2 && m === 'GET') return ok(await mensajes(user, url, flash));
    const mid = parseInt(seg[2], 10);
    if (mid && seg[3] === 'leido' && m === 'POST') { await db.q('UPDATE mensajes SET leido = ? WHERE id = ?', [b.leido === '1' ? 1 : 0, mid]); return redirigir(res, '/admin/mensajes'); }
    if (mid && seg[3] === 'borrar' && m === 'POST') { await db.q('DELETE FROM mensajes WHERE id = ?', [mid]); return redirigir(res, '/admin/mensajes', { msg: 'Mensaje borrado.' }); }
  }
  if (seg[1] === 'respaldo' && m === 'GET') {
    const datos = { generado: new Date().toISOString(), version: 1, tablas: {} };
    for (const t of ['usuarios', 'perfiles', 'empresas', 'solicitudes', 'asignaciones', 'eventos', 'cvs', 'mensajes', 'recuperaciones']) {
      datos.tablas[t] = await db.q(`SELECT * FROM ${t} ORDER BY id`);
    }
    // Los archivos del CV van en base64 dentro del JSON
    datos.tablas.cvs = datos.tablas.cvs.map(c => ({ ...c, contenido: Buffer.from(c.contenido).toString('base64') }));
    const dia = new Date().toISOString().slice(0, 10);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="mies-respaldo-${dia}.json"`, 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(datos, null, 2));
    return;
  }
  if (seg[1] === 'clave' && m === 'POST') {
    if ((b.clave || '').length < 8 || b.clave !== b.clave2) return redirigir(res, '/admin/usuarios', { tipo: 'error', msg: 'Las contraseñas no coinciden o tienen menos de 8 caracteres.' });
    await db.q('UPDATE usuarios SET hash = ? WHERE id = ?', [hashClave(b.clave), user.id]);
    return redirigir(res, '/admin/usuarios', { msg: 'Contraseña cambiada.' });
  }
  return false;
}

module.exports = { manejar };
