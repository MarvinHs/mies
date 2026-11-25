// Restaura un respaldo JSON de Mies (descargado desde Panel → Administradores → Descargar respaldo).
// Uso:  DATABASE_URL="postgresql://..." node scripts/restaurar.js mies-respaldo-AAAA-MM-DD.json
// La base de destino debe estar vacía (sin datos). Las tablas se crean solas si no existen.
const fs = require('node:fs');
const path = require('node:path');
const db = require(path.join(__dirname, '..', 'src', 'db'));

const ORDEN = ['usuarios', 'perfiles', 'empresas', 'solicitudes', 'asignaciones', 'eventos', 'cvs'];

(async () => {
  const archivo = process.argv[2];
  if (!archivo) { console.error('Indica el archivo: node scripts/restaurar.js respaldo.json'); process.exit(1); }
  const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  await db.init();
  for (const t of ORDEN) {
    const hay = await db.one(`SELECT COUNT(*) AS n FROM ${t}`);
    if (Number(hay.n) > 0) { console.error(`La tabla ${t} ya tiene datos. Usa una base vacía.`); process.exit(1); }
  }
  for (const t of ORDEN) {
    const filas = (datos.tablas && datos.tablas[t]) || [];
    for (const f of filas) {
      if (t === 'cvs' && typeof f.contenido === 'string') f.contenido = Buffer.from(f.contenido, 'base64');
      const cols = Object.keys(f);
      await db.q(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map(c => f[c]));
    }
    if (db.engine === 'pg' && filas.length) {
      await db.q(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}))`);
    }
    console.log(`${t}: ${filas.length} registro(s)`);
  }
  console.log('Restauración terminada.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
