// Catálogos y preguntas del formulario de Mies
const PROVINCIAS = [
  'Distrito Nacional', 'Santo Domingo', 'Santiago', 'Azua', 'Bahoruco', 'Barahona', 'Dajabón',
  'Duarte', 'Elías Piña', 'El Seibo', 'Espaillat', 'Hato Mayor', 'Hermanas Mirabal', 'Independencia',
  'La Altagracia', 'La Romana', 'La Vega', 'María Trinidad Sánchez', 'Monseñor Nouel', 'Monte Cristi',
  'Monte Plata', 'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'San Cristóbal', 'San José de Ocoa',
  'San Juan', 'San Pedro de Macorís', 'Sánchez Ramírez', 'Santiago Rodríguez', 'Valverde'
];

const OFICIOS = [
  { grupo: 'Oficios técnicos', items: ['Electricista', 'Plomero', 'Técnico en refrigeración y aire acondicionado', 'Mecánico automotriz', 'Técnico en electrónica', 'Soldador', 'Albañil', 'Carpintero', 'Ebanista', 'Pintor', 'Herrero', 'Técnico en informática / soporte'] },
  { grupo: 'Operaciones y servicios', items: ['Operario de producción', 'Almacén y despacho', 'Chofer / mensajero', 'Seguridad', 'Limpieza y mantenimiento', 'Cocinero / ayudante de cocina', 'Camarero / mesero', 'Cajero', 'Vendedor', 'Servicio al cliente / call center'] },
  { grupo: 'Profesionales', items: ['Secretaria / recepción', 'Contabilidad', 'Administración', 'Recursos humanos', 'Mercadeo', 'Programador / desarrollador', 'Ingeniería', 'Arquitectura', 'Enfermería', 'Salud (otras áreas)', 'Docente', 'Diseño gráfico', 'Derecho'] },
  { grupo: 'Otro', items: ['Otro'] }
];

const NIVELES = ['Primaria', 'Bachillerato', 'Técnico', 'Universitario en curso', 'Grado universitario', 'Postgrado / maestría'];
const DISPONIBILIDAD = ['Inmediata', 'En 15 días', 'En 30 días', 'Medio tiempo', 'Solo fines de semana', 'Por proyecto'];
const SALARIOS = ['Menos de RD$15,000', 'RD$15,000 – 25,000', 'RD$25,000 – 35,000', 'RD$35,000 – 50,000', 'RD$50,000 – 75,000', 'RD$75,000 – 100,000', 'Más de RD$100,000', 'A convenir'];

const ESCALA = ['Nada', 'Poco', 'Algo', 'Bastante', 'Totalmente'];

// p = puntos del caso (2 = respuesta esperada)
const VALORES = [
  {
    key: 'resp', titulo: 'Responsabilidad',
    desc: 'Cumplir lo que te toca, a tiempo y sin que te lo tengan que recordar.',
    pregunta: 'Tu supervisor te asignó una tarea con fecha de entrega y ves que no podrás terminarla a tiempo. ¿Qué haces?',
    opciones: [
      { v: 'a', t: 'Espero al día de entrega y explico lo que pasó', p: 0 },
      { v: 'b', t: 'Aviso con anticipación, explico el motivo y propongo una nueva fecha', p: 2 },
      { v: 'c', t: 'Me quedo trabajando de más sin decir nada y entrego lo que pueda', p: 1 }
    ],
    frase: 'Cumplo mis horarios y compromisos aunque nadie me supervise.'
  },
  {
    key: 'etica', titulo: 'Ética',
    desc: 'Elegir lo correcto aunque lo incorrecto sea más fácil o te convenga.',
    pregunta: 'Un cliente te ofrece un pago extra, sin que la empresa lo sepa, para que su pedido pase antes que los demás. ¿Qué haces?',
    opciones: [
      { v: 'a', t: 'Lo consulto con mi supervisor antes de decidir', p: 1 },
      { v: 'b', t: 'Lo acepto si no perjudica mucho a los demás', p: 0 },
      { v: 'c', t: 'Lo rechazo con respeto y sigo el orden establecido', p: 2 }
    ],
    frase: 'Prefiero perder una oportunidad antes que conseguirla con engaños.'
  },
  {
    key: 'integ', titulo: 'Integridad',
    desc: 'Ser la misma persona cuando te ven y cuando no te ven.',
    pregunta: 'Descubres un error tuyo en un trabajo ya entregado y nadie lo ha notado. ¿Qué haces?',
    opciones: [
      { v: 'a', t: 'Informo el error y propongo cómo corregirlo', p: 2 },
      { v: 'b', t: 'Lo corrijo solo si alguien lo nota', p: 0 },
      { v: 'c', t: 'Lo corrijo discretamente sin mencionarlo', p: 1 }
    ],
    frase: 'Mis acciones son las mismas cuando me ven que cuando no me ven.'
  },
  {
    key: 'respeto', titulo: 'Respeto',
    desc: 'Tratar con dignidad a todos, sin importar su cargo u opinión.',
    pregunta: 'Un compañero no está de acuerdo con tu forma de hacer un trabajo y te lo dice frente al equipo. ¿Qué haces?',
    opciones: [
      { v: 'a', t: 'Le respondo que yo conozco mejor el tema', p: 0 },
      { v: 'b', t: 'Sigo a mi manera sin discutir', p: 1 },
      { v: 'c', t: 'Lo escucho, explico mi punto con calma y buscamos un acuerdo', p: 2 }
    ],
    frase: 'Trato con la misma cortesía a mis jefes, compañeros y clientes.'
  }
];

const FE = [
  { key: 'fe_cree', t: '¿Crees en Dios?', opciones: ['Sí', 'No', 'No estoy seguro'] },
  { key: 'fe_presencia', t: '¿Qué tan presente está tu fe en tu forma de trabajar?', opciones: ['Mucho', 'Bastante', 'Algo', 'Poco', 'Nada'] },
  { key: 'fe_ambiente', t: '¿Te sentirías cómodo en un ambiente laboral con valores cristianos, como una oración al iniciar la jornada?', opciones: ['Sí', 'Me da igual', 'No'] }
];

const ESTADOS = {
  borrador: { t: 'Borrador', c: 'gris' },
  pendiente: { t: 'Pendiente de revisión', c: 'azul' },
  aceptado: { t: 'Aceptado · disponible', c: 'verde' },
  en_espera: { t: 'En espera', c: 'ambar' },
  rechazado: { t: 'Rechazado', c: 'rojo' },
  colocado: { t: 'Colocado', c: 'oro' }
};

const ESTADOS_ASIG = {
  propuesto: { t: 'Propuesto a la empresa', c: 'azul' },
  entrevista: { t: 'En entrevista', c: 'ambar' },
  contratado: { t: 'Contratado', c: 'verde' },
  no_seleccionado: { t: 'No seleccionado', c: 'rojo' },
  finalizado: { t: 'Relación finalizada', c: 'gris' }
};

function puntajes(d) {
  const out = {};
  let total = 0, n = 0;
  for (const v of VALORES) {
    const op = v.opciones.find(o => o.v === d[v.key + '_caso']);
    const esc = parseInt(d[v.key + '_esc'], 10);
    if (!op || !(esc >= 1 && esc <= 5)) { out[v.key] = null; continue; }
    const s = Math.round((op.p / 2) * 50 + ((esc - 1) / 4) * 50);
    out[v.key] = s; total += s; n++;
  }
  out.total = n === VALORES.length ? Math.round(total / n) : null;
  return out;
}

module.exports = { PROVINCIAS, OFICIOS, NIVELES, DISPONIBILIDAD, SALARIOS, ESCALA, VALORES, FE, ESTADOS, ESTADOS_ASIG, puntajes };
