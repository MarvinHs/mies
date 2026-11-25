const D = require('./data');

const h = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Santo_Domingo' });
};
const fechaHora = (iso) => iso ? new Date(iso).toLocaleString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo' }) : '—';
const badge = (estado, mapa = D.ESTADOS) => {
  const e = mapa[estado] || { t: estado, c: 'gris' };
  return `<span class="badge b-${e.c}">${h(e.t)}</span>`;
};

const LOGO = `<svg class="logo-ic" viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor"><path d="M15 30h2V12h-2z"/><ellipse cx="16" cy="5" rx="2.2" ry="3.6"/><ellipse cx="12.2" cy="10" rx="2" ry="3.4" transform="rotate(-35 12.2 10)"/><ellipse cx="19.8" cy="10" rx="2" ry="3.4" transform="rotate(35 19.8 10)"/><ellipse cx="12.2" cy="16" rx="2" ry="3.4" transform="rotate(-35 12.2 16)"/><ellipse cx="19.8" cy="16" rx="2" ry="3.4" transform="rotate(35 19.8 16)"/><ellipse cx="12.4" cy="22" rx="1.9" ry="3.2" transform="rotate(-35 12.4 22)"/><ellipse cx="19.6" cy="22" rx="1.9" ry="3.2" transform="rotate(35 19.6 22)"/></g></svg>`;

function layout({ title, user, body, flash, admin = false }) {
  let nav;
  if (!user) {
    nav = `<a href="/registro" class="nav-link">Registrarme</a><a href="/entrar" class="nav-link fuerte">Entrar</a>`;
  } else if (user.rol === 'admin') {
    nav = `<a href="/admin" class="nav-link">Panel</a><a href="/admin/candidatos" class="nav-link">Candidatos</a><a href="/admin/empresas" class="nav-link">Empresas</a>
      <form method="post" action="/salir" class="inline"><button class="nav-link boton-link">Salir</button></form>`;
  } else {
    nav = `<a href="/perfil" class="nav-link fuerte">Mi perfil</a>
      <form method="post" action="/salir" class="inline"><button class="nav-link boton-link">Salir</button></form>`;
  }
  const fl = flash ? `<div class="flash flash-${h(flash.tipo || 'ok')}">${h(flash.msg)}</div>` : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(title ? title + ' · ' : '')}Mies · Banco de talento con valores</title>
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/estilo.css?v=3"></head>
<body class="${admin ? 'es-admin' : ''}">
<header class="top"><div class="wrap top-in">
  <a href="/" class="marca">${LOGO}<span>Mies</span></a>
  <nav>${nav}</nav>
</div></header>
<main>${fl}${body}</main>
<footer class="pie"><div class="wrap">Mies · Banco de talento con valores · República Dominicana</div></footer>
</body></html>`;
}

/* ---------- Páginas públicas ---------- */
const IMG = {
  hero: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=70',
  tec: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=70',
  obra: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=70',
  ofi: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=70',
  entrevista: 'https://images.unsplash.com/photo-1565688534245-05d6b5be184a?auto=format&fit=crop&w=800&q=70'
};
const img = (src, alt, cls = '') => `<img src="${src}" alt="${h(alt)}" class="${cls}" loading="lazy" onerror="this.classList.add('roto')">`;

function inicio(user) {
  const cta = user ? (user.rol === 'admin' ? `<a class="btn" href="/admin">Ir al panel</a>` : `<a class="btn" href="/perfil">Completar mi perfil</a>`)
    : `<a class="btn" href="/registro">Crear mi perfil</a><a class="btn btn-sec" href="/entrar">Ya tengo cuenta</a>`;
  return layout({
    user, title: 'Inicio', body: `
<section class="hero wrap">
  <div class="hero-txt">
    <h1>Tu talento y tus valores, en un solo perfil</h1>
    <p class="lead">Técnicos, operarios y profesionales que se distinguen por su responsabilidad, ética, integridad y respeto. Regístrate una vez y deja que las empresas te encuentren.</p>
    <blockquote class="verso"><p>La mies a la verdad es mucha, mas los obreros pocos.</p><cite>Mateo 9:37</cite></blockquote>
    <div class="acciones">${cta}</div>
  </div>
  <div class="hero-img">${img(IMG.hero, 'Apretón de manos en una entrevista de trabajo')}</div>
</section>

<section class="franja"><div class="wrap">
  <h2>¿Qué es Mies?</h2>
  <p class="lead">Mies es un servicio de reclutamiento y colocación laboral. Reunimos perfiles de personas trabajadoras y los evaluamos no solo por lo que saben hacer, sino por cómo actúan en el trabajo. Las empresas nos piden el personal que necesitan y nosotros les presentamos candidatos verificados.</p>
  <div class="tarjetas">
    <figure class="tarjeta">${img(IMG.tec, 'Técnico trabajando')}<figcaption><b>Oficios técnicos</b>Electricistas, mecánicos, técnicos de refrigeración, soldadores y más.</figcaption></figure>
    <figure class="tarjeta">${img(IMG.obra, 'Trabajadores en una obra')}<figcaption><b>Operaciones</b>Operarios, almacén, choferes, seguridad y servicios.</figcaption></figure>
    <figure class="tarjeta">${img(IMG.ofi, 'Equipo de oficina')}<figcaption><b>Profesionales</b>Contabilidad, administración, informática, salud y educación.</figcaption></figure>
  </div>
</div></section>

<section class="wrap pasos-sec">
  <div class="pasos-img">${img(IMG.entrevista, 'Entrevista de trabajo')}</div>
  <div>
    <h2>Cómo funciona</h2>
    <ol class="pasos">
      <li><b>Crea tu cuenta</b> con un usuario y una contraseña.</li>
      <li><b>Llena tu perfil</b>: tus datos, tu área, tus valores y una referencia.</li>
      <li><b>Nuestro equipo lo revisa</b> y te avisa cuando quede aprobado.</li>
      <li><b>Te presentamos</b> a las empresas que buscan personas como tú.</li>
    </ol>
    <h3 class="mt">Para empresas</h3>
    <p>¿Necesitas personal confiable? Escríbenos y cuéntanos el puesto, la cantidad y la zona. Te enviamos candidatos evaluados en responsabilidad, ética, integridad y respeto.</p>
  </div>
</section>

<section class="valores-banda"><div class="wrap valores-grid">
  ${D.VALORES.map(v => `<div><h3>${h(v.titulo)}</h3><p>${h(v.desc)}</p></div>`).join('')}
</div></section>`
  });
}

function authForm({ user, modo, error, usuario = '' }) {
  const reg = modo === 'registro';
  return layout({
    user, title: reg ? 'Registrarme' : 'Entrar', body: `
<section class="wrap estrecho">
  <h1>${reg ? 'Crea tu cuenta' : 'Entrar a Mies'}</h1>
  <p class="sub">${reg ? 'Con tu usuario y contraseña podrás entrar cuando quieras a completar o actualizar tu perfil.' : 'Escribe tu usuario y contraseña.'}</p>
  ${error ? `<div class="flash flash-error">${h(error)}</div>` : ''}
  <form method="post" class="caja" autocomplete="on">
    <label>Usuario<input name="usuario" required minlength="3" maxlength="40" pattern="[A-Za-z0-9._\\-@]+" value="${h(usuario)}" autocomplete="username" placeholder="Ej.: juan.perez"></label>
    ${reg ? '<p class="ayuda">Letras, números, punto, guion o @. Sin espacios.</p>' : ''}
    <label>Contraseña<input type="password" name="clave" required minlength="${reg ? 6 : 1}" autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
    ${reg ? '<label>Repite la contraseña<input type="password" name="clave2" required minlength="6" autocomplete="new-password"></label>' : ''}
    <button class="btn ancho">${reg ? 'Crear cuenta' : 'Entrar'}</button>
  </form>
  <p class="centro">${reg ? '¿Ya tienes cuenta? <a href="/entrar">Entra aquí</a>' : '¿Primera vez? <a href="/registro">Crea tu cuenta</a>'}</p>
</section>`
  });
}

/* ---------- Formulario de perfil ---------- */
const sel = (name, opciones, val, ph, req = '') => `<select name="${name}" ${req}><option value="">${h(ph)}</option>${opciones.map(o => `<option${o === val ? ' selected' : ''}>${h(o)}</option>`).join('')}</select>`;

function bloqueCv(cv) {
  const tam = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  return `<section class="bloque" id="cv"><h2>Tu currículum <span class="opc-tag">Opcional</span></h2><p class="sub">Si tienes un CV, súbelo en PDF o Word (máximo 2 MB). Solo lo verá el equipo de Mies y las empresas a las que te presentemos.</p>
    <div class="caja cv-caja">
      <div id="cv-estado">${cv ? `<div class="cv-actual">📄 <a href="/perfil/cv" target="_blank" rel="noopener">${h(cv.archivo)}</a> <span class="muted peq">· ${tam(cv.tamano)} · subido ${fecha(cv.subido)}</span></div>` : '<p class="muted" style="margin:0 0 10px">Aún no has subido tu currículum.</p>'}</div>
      <div class="cv-acciones">
        <label class="btn btn-sec btn-peq cv-elegir">${cv ? 'Reemplazar archivo' : 'Elegir archivo'}<input type="file" name="cv" form="form-cv" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" id="cv-input"></label>
        <button class="btn btn-peq" form="form-cv" id="cv-subir">Subir</button>
        ${cv ? '<button class="btn btn-peq btn-sec" form="form-cv-borrar" onclick="return confirm(\'¿Quitar tu currículum?\')">Quitar</button>' : ''}
      </div>
      <p class="muted peq" id="cv-msg" style="margin:8px 0 0"></p>
    </div></section>`;
}

function perfilForm({ user, perfil, d, errores = [], flash, cv = null }) {
  const oficioSel = `<select name="oficio"><option value="">Elige tu área</option>${D.OFICIOS.map(g => `<optgroup label="${h(g.grupo)}">${g.items.map(o => `<option${o === d.oficio ? ' selected' : ''}>${h(o)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const estado = perfil ? perfil.estado : 'borrador';
  const avisos = {
    borrador: 'Tu perfil aún no se ha enviado. Puedes guardar y seguir luego; cuando esté completo pulsa «Enviar registro».',
    pendiente: 'Recibimos tu registro. Nuestro equipo lo está revisando.',
    aceptado: '¡Tu perfil fue aprobado! Ya forma parte del banco de talento y podemos presentarte a empresas.',
    en_espera: 'Tu perfil está en espera. Te contactaremos cuando haya una oportunidad acorde a tu área.',
    rechazado: 'Por ahora tu perfil no fue aprobado. Puedes actualizar tus datos y volver a enviarlo.',
    colocado: '¡Felicidades! Fuiste colocado en una empresa a través de Mies.'
  };
  const valoresHtml = D.VALORES.map(v => `
    <fieldset class="valor">
      <legend>${h(v.titulo)}</legend>
      <p class="ayuda">${h(v.desc)}</p>
      <p class="preg">${h(v.pregunta)}</p>
      <div class="opciones">${v.opciones.map(o => `<label class="op"><input type="radio" name="${v.key}_caso" value="${o.v}"${d[v.key + '_caso'] === o.v ? ' checked' : ''}> <span>${h(o.t)}</span></label>`).join('')}</div>
      <p class="preg">¿Qué tan de acuerdo estás? <em>“${h(v.frase)}”</em></p>
      <div class="escala">${D.ESCALA.map((t, i) => `<label><input type="radio" name="${v.key}_esc" value="${i + 1}"${String(d[v.key + '_esc']) === String(i + 1) ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>
    </fieldset>`).join('');

  const feHtml = D.FE.map(f => `<label>${h(f.t)}${sel(f.key, f.opciones, d[f.key], 'Prefiero no responder')}</label>`).join('');

  return layout({
    user, flash, title: 'Mi perfil', body: `
<section class="wrap estrecho-form">
  <div class="cab-perfil"><h1>Mi perfil</h1>${badge(estado)}</div>
  <div class="aviso">${h(avisos[estado] || '')}</div>
  ${errores.length ? `<div class="flash flash-error"><b>Para enviar tu registro falta:</b><ul>${errores.map(e => `<li>${h(e)}</li>`).join('')}</ul></div>` : ''}
  <form method="post" action="/perfil" class="form-perfil">
    <section class="bloque"><h2>Tus datos</h2><p class="sub">Así te contactarán los empleadores.</p>
      <div class="caja">
        <label>Nombre completo<input name="nombre" value="${h(d.nombre)}" maxlength="120"></label>
        <div class="dos">
          <label>Teléfono / WhatsApp<input name="telefono" value="${h(d.telefono)}" placeholder="809-555-0123" maxlength="30"></label>
          <label>Correo <span class="opc">(opcional)</span><input type="email" name="correo" value="${h(d.correo)}" maxlength="120"></label>
        </div>
        <div class="dos">
          <label>Provincia${sel('provincia', D.PROVINCIAS, d.provincia, 'Elige tu provincia')}</label>
          <label>Sector o municipio<input name="sector" value="${h(d.sector)}" maxlength="100"></label>
        </div>
      </div>
    </section>

    <section class="bloque"><h2>Tu área</h2><p class="sub">Oficio técnico o profesión, tu formación y cuándo puedes trabajar.</p>
      <div class="caja">
        <div class="dos">
          <label>Oficio o profesión${oficioSel}</label>
          <label>Si elegiste «Otro», ¿cuál? <span class="opc">(opcional)</span><input name="oficio_otro" value="${h(d.oficio_otro)}" maxlength="80"></label>
        </div>
        <div class="dos">
          <label>Nivel educativo${sel('nivel', D.NIVELES, d.nivel, 'Elige una opción')}</label>
          <label>Años de experiencia<input type="number" name="experiencia" min="0" max="60" value="${h(d.experiencia)}"></label>
        </div>
        <div class="dos">
          <label>Disponibilidad${sel('disponibilidad', D.DISPONIBILIDAD, d.disponibilidad, 'Elige una opción')}</label>
          <label>Aspiración salarial mensual${sel('salario', D.SALARIOS, d.salario, 'Elige un rango')}</label>
        </div>
        <label>Títulos, certificaciones y cursos <span class="opc">(opcional)</span><textarea name="titulos" rows="2" maxlength="600" placeholder="Ej.: Licenciatura en Contabilidad, curso de Excel avanzado, licencia categoría 3">${h(d.titulos)}</textarea></label>
        <label>Cuéntanos brevemente tu experiencia<textarea name="resumen" rows="4" maxlength="1500">${h(d.resumen)}</textarea></label>
        <label>Página web o portafolio <span class="opc">(opcional)</span><input type="text" name="web" value="${h(d.web)}" maxlength="300" placeholder="Ej.: www.miportafolio.com, tu LinkedIn, Behance o GitHub" inputmode="url"></label>
        <p class="ayuda">Si tienes fotos de tus trabajos o proyectos publicados en algún sitio, pon el enlace aquí.</p>
      </div>
    </section>

    ${bloqueCv(cv)}

    <section class="bloque"><h2>Tus valores</h2><p class="sub">Responde con sinceridad. No hay trampa: buscamos conocer cómo actúas en el trabajo.</p>
      ${valoresHtml}
    </section>

    <section class="bloque"><h2>Tu fe <span class="opc-tag">Opcional</span></h2><p class="sub">Puedes dejar estas preguntas sin responder. No afectan tu registro.</p>
      <div class="caja">${feHtml}</div>
    </section>

    <section class="bloque"><h2>Tu referencia</h2><p class="sub">Alguien que pueda hablar de tu trabajo y tu carácter: un exjefe, maestro, líder comunitario o pastor.</p>
      <div class="caja">
        <label>Nombre<input name="ref_nombre" value="${h(d.ref_nombre)}" maxlength="120"></label>
        <div class="dos">
          <label>Relación contigo<input name="ref_relacion" value="${h(d.ref_relacion)}" placeholder="Ej.: exsupervisor" maxlength="80"></label>
          <label>Teléfono<input name="ref_telefono" value="${h(d.ref_telefono)}" maxlength="30"></label>
        </div>
      </div>
    </section>

    <section class="bloque"><h2>Tu consentimiento</h2><p class="sub">Solo usamos tu información para conectarte con empleadores.</p>
      <div class="caja"><label class="check"><input type="checkbox" name="consentimiento" value="si"${d.consentimiento === 'si' ? ' checked' : ''}> <span>Autorizo que mis datos, incluidas mis respuestas opcionales sobre fe si las di, se compartan con empleadores registrados en Mies y que se contacte a mi referencia.</span></label></div>
    </section>

    <div class="barra-acciones">
      <button class="btn btn-sec" name="accion" value="guardar" formnovalidate>Guardar y seguir luego</button>
      <button class="btn" name="accion" value="enviar">${estado === 'borrador' || estado === 'rechazado' ? 'Enviar registro' : 'Guardar cambios'}</button>
    </div>
  </form>
  <form id="form-cv" method="post" action="/perfil/cv" enctype="multipart/form-data"></form>
  <form id="form-cv-borrar" method="post" action="/perfil/cv/borrar"></form>
  <script>
  (function () {
    var f = document.getElementById('form-cv'), inp = document.getElementById('cv-input'), msg = document.getElementById('cv-msg'), btn = document.getElementById('cv-subir');
    if (!window.fetch || !window.FormData) return;
    btn.style.display = 'none';
    inp.addEventListener('change', function () {
      var a = inp.files[0]; if (!a) return;
      if (a.size > ${2 * 1024 * 1024}) { msg.textContent = 'El archivo pasa de 2 MB. Guárdalo como PDF más liviano.'; msg.className = 'error-txt'; inp.value = ''; return; }
      var fd = new FormData(); fd.append('cv', a);
      msg.className = 'muted peq'; msg.textContent = 'Subiendo ' + a.name + '…';
      fetch('/perfil/cv', { method: 'POST', body: fd, headers: { 'X-Mies': '1' }, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          inp.value = '';
          if (!j.ok) { msg.className = 'error-txt'; msg.textContent = j.error; return; }
          document.getElementById('cv-estado').innerHTML = '<div class="cv-actual">📄 <a href="/perfil/cv" target="_blank" rel="noopener"></a> <span class="muted peq">· ' + j.tamano + ' · subido hoy</span></div>';
          document.querySelector('#cv-estado a').textContent = j.archivo;
          msg.className = 'ok-txt'; msg.textContent = '✓ Currículum guardado. Tus demás datos no se han perdido; recuerda guardarlos abajo.';
        })
        .catch(function () { msg.className = 'error-txt'; msg.textContent = 'No se pudo subir. Revisa tu conexión e inténtalo otra vez.'; });
    });
  })();
  </script>
</section>`
  });
}

module.exports = { h, fecha, fechaHora, badge, layout, inicio, authForm, perfilForm, sel };
