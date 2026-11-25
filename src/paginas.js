// Páginas: privacidad, mi cuenta, recuperar contraseña y ficha del candidato para empresas
const D = require('./data');
const { h, fecha, layout } = require('./views');

const SITIO = () => process.env.SITIO_URL || 'https://mies-c85p.onrender.com';
const ACTUALIZADA = '25 de noviembre de 2026';

/* ---------- Política de privacidad ---------- */
function privacidad(user) {
  return layout({
    user, title: 'Política de privacidad', description: 'Cómo Mies recoge, usa y protege los datos personales de candidatos y empresas, conforme a la Ley 172-13.', body: `
<section class="wrap legal">
  <h1>Política de privacidad</h1>
  <p class="muted">Última actualización: ${ACTUALIZADA}</p>
  <p>En Mies cuidamos tu información. Esta política explica qué datos recogemos, para qué los usamos y cuáles son tus derechos, conforme a la <b>Ley No. 172-13 sobre Protección de Datos de Carácter Personal</b> de la República Dominicana.</p>

  <h2>1. Quién es el responsable</h2>
  <p>Mies · Banco de talento con valores es el responsable del tratamiento de tus datos. Puedes escribirnos en cualquier momento desde nuestra <a href="/contacto">página de contacto</a>.</p>

  <h2>2. Qué datos recogemos</h2>
  <ul>
    <li><b>Cuenta:</b> tu usuario y tu contraseña (guardada cifrada; nadie, ni siquiera nosotros, puede verla).</li>
    <li><b>Contacto:</b> nombre, teléfono o WhatsApp, correo (opcional), provincia y sector.</li>
    <li><b>Perfil laboral:</b> oficio o profesión, nivel educativo, experiencia, disponibilidad, aspiración salarial, títulos, página web y currículum (opcional).</li>
    <li><b>Valores:</b> tus respuestas sobre responsabilidad, ética, integridad y respeto.</li>
    <li><b>Fe (opcional):</b> tus respuestas sobre fe son <b>datos sensibles</b>. Son totalmente voluntarias, no afectan tu registro y solo se usan si tú decides darlas.</li>
    <li><b>Referencia:</b> nombre, relación y teléfono de la persona que nos indiques. Te pedimos que le avises que la podríamos contactar.</li>
    <li><b>Mensajes</b> que nos envíes por el formulario de contacto.</li>
  </ul>

  <h2>3. Para qué los usamos</h2>
  <p>Únicamente para evaluar tu perfil y <b>presentarte a empresas</b> que buscan personal, contactarte sobre oportunidades y verificar tu referencia. No vendemos tus datos ni los usamos para publicidad.</p>

  <h2>4. Con quién los compartimos</h2>
  <p>Solo con <b>empresas registradas en Mies</b> a las que te propongamos para un puesto, y solo la información necesaria para esa vacante. Las notas internas de nuestro equipo nunca se comparten. También usamos proveedores tecnológicos que alojan la plataforma y la base de datos (servidores ubicados en los Estados Unidos), que tratan los datos solo para prestarnos ese servicio.</p>

  <h2>5. Tu consentimiento</h2>
  <p>Al marcar la casilla de consentimiento en tu perfil nos autorizas a tratar tus datos para los fines descritos. Puedes retirar tu consentimiento en cualquier momento eliminando tu cuenta.</p>

  <h2>6. Cuánto tiempo los guardamos</h2>
  <p>Mientras tu cuenta esté activa. Si eliminas tu cuenta, borramos tu perfil, tu currículum y tu historial de forma definitiva.</p>

  <h2>7. Tus derechos</h2>
  <p>La ley te reconoce los derechos de <b>acceso, rectificación, cancelación y oposición</b>:</p>
  <ul>
    <li><b>Acceder y corregir:</b> entra a <a href="/perfil">Mi perfil</a> y actualiza tus datos cuando quieras.</li>
    <li><b>Eliminar:</b> en <a href="/cuenta">Mi cuenta</a> puedes borrar tu cuenta y todos tus datos tú mismo, sin pedir permiso.</li>
    <li><b>Oponerte o consultar:</b> escríbenos por <a href="/contacto">contacto</a>. Responderemos a tu solicitud en un plazo máximo de 10 días.</li>
  </ul>

  <h2>8. Cómo protegemos tu información</h2>
  <p>Las contraseñas se guardan cifradas, todas las conexiones van protegidas (HTTPS), el currículum solo lo pueden abrir tú y nuestro equipo, y el acceso al panel de administración está restringido.</p>

  <h2>9. Cookies</h2>
  <p>Solo usamos una cookie necesaria para mantener tu sesión abierta. No usamos cookies de publicidad ni de rastreo.</p>

  <h2>10. Cambios</h2>
  <p>Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.</p>
</section>`
  });
}

/* ---------- Mi cuenta ---------- */
function cuenta({ user, flash, error, debeCambiar }) {
  return layout({
    user, flash, title: 'Mi cuenta', noindex: true, body: `
<section class="wrap estrecho-contacto">
  <h1>Mi cuenta</h1>
  <p class="sub">Usuario: <code>${h(user.usuario)}</code></p>
  ${debeCambiar ? '<div class="aviso">Entraste con una contraseña temporal. Para seguir, crea tu nueva contraseña.</div>' : ''}
  ${error ? `<div class="flash flash-error">${h(error)}</div>` : ''}
  <div class="panel mt"><h2>Cambiar contraseña</h2>
    <form method="post" action="/cuenta/clave" autocomplete="on">
      <input type="hidden" name="usuario" value="${h(user.usuario)}" autocomplete="username">
      ${debeCambiar ? '' : '<label>Contraseña actual<input type="password" name="actual" required autocomplete="current-password"></label>'}
      <label>Nueva contraseña<input type="password" name="clave" required minlength="6" autocomplete="new-password"></label>
      <label>Repite la nueva contraseña<input type="password" name="clave2" required minlength="6" autocomplete="new-password"></label>
      <button class="btn ancho">Guardar contraseña</button>
    </form>
  </div>
  ${debeCambiar ? '' : `
  <div class="panel zona-peligro"><h2>Eliminar mi cuenta</h2>
    <p class="muted">Se borrarán para siempre tu cuenta, tu perfil, tu currículum y tu historial. Las empresas ya no podrán ver tu información. Esta acción no se puede deshacer.</p>
    <form method="post" action="/cuenta/eliminar" onsubmit="return confirm('¿Seguro que quieres eliminar tu cuenta y todos tus datos? No se puede deshacer.')">
      <label>Escribe tu contraseña para confirmar<input type="password" name="clave" required autocomplete="current-password"></label>
      <button class="btn btn-rojo">Eliminar mi cuenta y mis datos</button>
    </form>
  </div>`}
  <p class="centro peq"><a href="/privacidad">Política de privacidad</a></p>
</section>`
  });
}

/* ---------- Recuperar contraseña ---------- */
function recuperar({ user, enviado, error, datos = {} }) {
  return layout({
    user, title: 'Recuperar contraseña', body: `
<section class="wrap estrecho">
  <h1>¿Olvidaste tu contraseña?</h1>
  ${enviado ? `<div class="caja centro gracias"><div class="gracias-ic">✓</div><h2>Solicitud recibida</h2>
    <p class="muted">Si los datos coinciden con una cuenta, nuestro equipo te enviará una <b>contraseña temporal por WhatsApp</b> al número registrado. Normalmente respondemos el mismo día.</p>
    <a class="btn btn-sec" href="/entrar">Volver a entrar</a></div>` : `
  <p class="sub">Escribe tu usuario y el teléfono que pusiste en tu perfil. Te enviaremos una contraseña temporal por WhatsApp.</p>
  ${error ? `<div class="flash flash-error">${h(error)}</div>` : ''}
  <form method="post" class="caja">
    <label>Usuario<input name="usuario" required maxlength="40" value="${h(datos.usuario)}" autocomplete="username"></label>
    <label>Teléfono / WhatsApp<input name="telefono" required maxlength="30" value="${h(datos.telefono)}" placeholder="809-555-0123" inputmode="tel"></label>
    <div class="trampa" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label>Deje este campo vacío<input name="sitio" tabindex="-1" autocomplete="off"></label></div>
    <button class="btn ancho">Solicitar contraseña temporal</button>
  </form>
  <p class="centro peq">¿No recuerdas tu usuario? <a href="/contacto">Escríbenos</a> y te ayudamos.</p>`}
</section>`
  });
}

/* ---------- Ficha del candidato para empresas ---------- */
const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor"><path d="M15 30h2V12h-2z"/><ellipse cx="16" cy="5" rx="2.2" ry="3.6"/><ellipse cx="12.2" cy="10" rx="2" ry="3.4" transform="rotate(-35 12.2 10)"/><ellipse cx="19.8" cy="10" rx="2" ry="3.4" transform="rotate(35 19.8 10)"/><ellipse cx="12.2" cy="16" rx="2" ry="3.4" transform="rotate(-35 12.2 16)"/><ellipse cx="19.8" cy="16" rx="2" ry="3.4" transform="rotate(35 19.8 16)"/><ellipse cx="12.4" cy="22" rx="1.9" ry="3.2" transform="rotate(-35 12.4 22)"/><ellipse cx="19.6" cy="22" rx="1.9" ry="3.2" transform="rotate(35 19.6 22)"/></g></svg>`;

function ficha({ p, d, pts, cv, opciones, asignacion }) {
  const { contacto, salario } = opciones;
  const fila = (t, v) => v ? `<div class="f-dato"><span>${t}</span><b>${h(v)}</b></div>` : '';
  const barra = (titulo, valor) => `<div class="f-valor"><div class="f-valor-top"><span>${h(titulo)}</span><b>${valor ?? '—'}</b></div><div class="f-barra"><i style="width:${valor || 0}%"></i></div></div>`;
  const nivelTxt = pts.total == null ? '' : pts.total >= 80 ? 'Sobresaliente' : pts.total >= 60 ? 'Bueno' : 'En desarrollo';
  const toggles = (k, label, on) => {
    const q = new URLSearchParams({ contacto: contacto ? '1' : '0', salario: salario ? '1' : '0', [k]: on ? '0' : '1' });
    return `<a class="f-toggle ${on ? 'on' : ''}" href="?${q}">${on ? '☑' : '☐'} ${label}</a>`;
  };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Ficha · ${h(p.nombre || 'Candidato')} · Mies</title>
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/ficha.css?v=1"></head><body>
<div class="f-barra-herr no-print">
  <a href="/admin/candidatos/${p.id}">← Volver</a>
  <div class="f-opciones">${toggles('contacto', 'Incluir datos de contacto', contacto)}${toggles('salario', 'Incluir aspiración salarial', salario)}</div>
  <button onclick="window.print()" class="f-btn">Imprimir / Guardar PDF</button>
</div>
<article class="hoja">
  <header class="f-cab">
    <div class="f-marca">${LOGO}<span>Mies</span></div>
    <div class="f-cab-der"><b>Ficha de candidato</b><span>${fecha(new Date().toISOString())}</span></div>
  </header>

  <section class="f-titulo">
    <div>
      <p class="f-pre">${asignacion ? `Propuesto para <b>${h(asignacion.puesto || '')}</b>${asignacion.empresa ? ` · ${h(asignacion.empresa)}` : ''}` : 'Candidato verificado por Mies'}</p>
      <h1>${h(p.nombre || 'Candidato')}</h1>
      <p class="f-sub">${[p.oficio, d.provincia].filter(Boolean).map(h).join(' · ')}</p>
    </div>
    ${pts.total != null ? `<div class="f-sello"><b>${pts.total}</b><span>Valores</span><small>${nivelTxt}</small></div>` : ''}
  </section>

  <section class="f-grid">
    ${fila('Nivel educativo', d.nivel)}
    ${fila('Años de experiencia', d.experiencia !== '' && d.experiencia != null ? String(d.experiencia) : '')}
    ${fila('Disponibilidad', d.disponibilidad)}
    ${salario ? fila('Aspiración salarial', d.salario) : ''}
  </section>

  <div class="f-dos">
    <section>
      <h2>Experiencia</h2>
      <p class="f-texto">${h(d.resumen || 'No indicada.')}</p>
      ${d.titulos ? `<h2>Formación y certificaciones</h2><p class="f-texto">${h(d.titulos)}</p>` : ''}
      ${d.web ? `<h2>Portafolio</h2><p><a href="${h(d.web)}">${h(d.web.replace(/^https?:\/\//, ''))}</a></p>` : ''}
    </section>
    <section>
      <h2>Perfil de valores</h2>
      <p class="f-nota">Evaluado por Mies con casos prácticos y autoevaluación (0–100).</p>
      ${D.VALORES.map(v => barra(v.titulo, pts[v.key])).join('')}
    </section>
  </div>

  <section class="f-pie-info">
    ${contacto ? `<div><h2>Contacto del candidato</h2><p>${h(d.telefono || '')}${d.correo ? ` · ${h(d.correo)}` : ''}</p></div>`
      : `<div><h2>Para coordinar una entrevista</h2><p>Comuníquese con Mies. Nosotros coordinamos con el candidato.</p></div>`}
    <div><h2>Currículum</h2><p>${cv ? 'Disponible · se adjunta por separado' : 'No aportado'}</p></div>
  </section>

  <footer class="f-pie">Mies · Banco de talento con valores · República Dominicana · Documento confidencial, uso exclusivo para el proceso de selección.</footer>
</article>
</body></html>`;
}

module.exports = { privacidad, cuenta, recuperar, ficha, SITIO };
