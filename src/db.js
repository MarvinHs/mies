// Capa de base de datos: PostgreSQL en producción (DATABASE_URL), SQLite local para pruebas.
// Las consultas se escriben con "?" y se convierten a $1, $2... para PostgreSQL.
let engine = null;
let pool = null;
let lite = null;

const TABLAS = (pk) => [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id ${pk}, usuario TEXT UNIQUE NOT NULL, hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'candidato', creado TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sesiones (
    token TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL, expira BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS perfiles (
    id ${pk}, usuario_id INTEGER UNIQUE NOT NULL, datos TEXT NOT NULL DEFAULT '{}',
    nombre TEXT, telefono TEXT, provincia TEXT, oficio TEXT, experiencia INTEGER,
    puntaje INTEGER, estado TEXT NOT NULL DEFAULT 'borrador', nota_admin TEXT,
    enviado TEXT, actualizado TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS empresas (
    id ${pk}, nombre TEXT NOT NULL, rnc TEXT, sector TEXT, contacto TEXT, telefono TEXT,
    correo TEXT, direccion TEXT, notas TEXT, activa INTEGER NOT NULL DEFAULT 1, creado TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS solicitudes (
    id ${pk}, empresa_id INTEGER NOT NULL, puesto TEXT NOT NULL, oficio TEXT, cantidad INTEGER NOT NULL DEFAULT 1,
    salario TEXT, provincia TEXT, notas TEXT, estado TEXT NOT NULL DEFAULT 'abierta', creado TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS asignaciones (
    id ${pk}, perfil_id INTEGER NOT NULL, empresa_id INTEGER NOT NULL, solicitud_id INTEGER,
    puesto TEXT, estado TEXT NOT NULL DEFAULT 'propuesto', nota TEXT, creado TEXT NOT NULL, actualizado TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS eventos (
    id ${pk}, perfil_id INTEGER NOT NULL, texto TEXT NOT NULL, autor TEXT, fecha TEXT NOT NULL)`
];

async function init() {
  if (process.env.DATABASE_URL) {
    engine = 'pg';
    const { Pool } = require('pg');
    const url = process.env.DATABASE_URL;
    const needSsl = process.env.PGSSL === '1' || /\.render\.com|sslmode=require/.test(url);
    pool = new Pool({ connectionString: url, ssl: needSsl ? { rejectUnauthorized: false } : false, max: 5 });
    for (const sql of TABLAS('SERIAL PRIMARY KEY')) await pool.query(sql);
  } else {
    engine = 'sqlite';
    const { DatabaseSync } = require('node:sqlite');
    lite = new DatabaseSync(process.env.SQLITE_FILE || 'mies-local.db');
    for (const sql of TABLAS('INTEGER PRIMARY KEY AUTOINCREMENT')) lite.exec(sql);
  }
  console.log('Base de datos lista:', engine);
}

async function q(sql, params = []) {
  params = params.map(p => (p === undefined ? null : p));
  if (engine === 'pg') {
    let i = 0;
    const text = sql.replace(/\?/g, () => '$' + (++i));
    const r = await pool.query(text, params);
    return r.rows;
  }
  return lite.prepare(sql).all(...params);
}

async function one(sql, params) {
  const rows = await q(sql, params);
  return rows[0] || null;
}

module.exports = { init, q, one, get engine() { return engine; } };
