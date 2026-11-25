# Mies · Banco de talento con valores

Plataforma de reclutamiento y colocación laboral para República Dominicana.

## Funciones

**Candidatos**
- Registro con usuario y contraseña.
- Formulario de perfil: datos de contacto, área (oficio, nivel, experiencia, disponibilidad, aspiración salarial),
  valores (responsabilidad, ética, integridad, respeto), fe (opcional), referencia y consentimiento.
- Campo opcional de **página web o portafolio** para mostrar sus proyectos.
- **Currículum opcional** (PDF o Word, máx. 2 MB). Se guarda en la base de datos; solo lo ven el candidato y los administradores.
- Pueden guardar como borrador y enviar cuando esté completo. Ven el estado de su perfil.

**Administración** (`/admin`)
- Resumen con conteo por estado.
- Lista de candidatos con filtros (estado, oficio, provincia, búsqueda) y orden por puntaje de valores.
- Detalle del candidato con puntaje de valores (0–100), enlace a su web, ver/descargar su CV e historial.
- En la lista, 📎 indica quién tiene CV y hay filtro «Solo con CV».
- Acciones: **Aceptar**, **Poner en espera**, **Rechazar**.
- **Empresas**: crear, editar, activar/desactivar.
- **Solicitudes** de personal por empresa (puesto, oficio, cantidad, provincia, salario).
- **Colocar** candidatos aceptados en una empresa/solicitud. Estados de la colocación:
  propuesto → entrevista → contratado. Si queda «No seleccionado» o «Relación finalizada»,
  el candidato vuelve automáticamente al mercado laboral para **recolocarlo**.
- Crear otros administradores y cambiar contraseña.

## Puntaje de valores
Cada valor = 50 % caso práctico (respuesta esperada 50, intermedia 25, inadecuada 0) + 50 % escala de acuerdo.
El puntaje total es el promedio de los cuatro valores. Las respuestas de fe no afectan el puntaje.

## Tecnología
- Node.js (sin framework) + PostgreSQL (`pg`).
- Sin `DATABASE_URL` usa SQLite local (`node:sqlite`) para pruebas.

## Variables de entorno
| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `ADMIN_USER` / `ADMIN_PASS` | Administrador inicial (solo se crea si no existe ningún admin) |
| `PORT` | Puerto (Render lo asigna) |

## Correr localmente
```bash
npm install
ADMIN_USER=admin ADMIN_PASS=clave1234 npm start
# http://localhost:3000
```

## Respaldo y restauración
- **Descargar:** Panel → Administradores → «Descargar respaldo» (o `/admin/respaldo`). Baja un JSON con todas las tablas (los CV van en base64).
- **Restaurar** en una base vacía:
  ```bash
  npm install
  DATABASE_URL="postgresql://usuario:clave@host/base?sslmode=require" node scripts/restaurar.js mies-respaldo-AAAA-MM-DD.json
  ```

## Despliegue en Render
- Web Service (Node): build `npm install`, start `npm start`.
- Base de datos: PostgreSQL en [Neon](https://neon.com) (plan gratuito, región us-east-1).
  La cadena de conexión va en la variable `DATABASE_URL` del servicio en Render.
