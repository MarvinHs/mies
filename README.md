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
- **Mi cuenta:** cambiar contraseña y eliminar su cuenta con todos sus datos.
- **¿Olvidaste tu contraseña?** El candidato pide ayuda con su usuario y teléfono; el admin le genera una
  contraseña temporal y se la envía por WhatsApp. Al entrar debe crear una nueva.
- No se permite enviar un registro con un teléfono que ya usa otra cuenta.

**Contacto** (`/contacto`)
- Formulario con nombre, correo y mensaje. Se guarda en el panel (Mensajes) y se envía por correo con FormSubmit
  al correo de la variable `CONTACTO_CORREO`. El primer envío manda a ese correo un enlace de activación de FormSubmit que hay que confirmar una sola vez.
- Protección: campo trampa para bots y máximo 5 mensajes por hora por IP.

**Administración** (`/admin`)
- Resumen con conteo por estado.
- Lista de candidatos con filtros (estado, oficio, provincia, búsqueda) y orden por puntaje de valores.
- Detalle del candidato con puntaje de valores (0–100), enlace a su web, ver/descargar su CV e historial.
- En la lista, 📎 indica quién tiene CV y hay filtro «Solo con CV».
- **Ficha para empresa** imprimible / PDF (A4) con marca Mies, sin datos de fe ni notas internas;
  opciones para incluir contacto y aspiración salarial.
- **Avisar por WhatsApp** con mensajes listos (aprobado, en espera, propuesto, entrevista, contratado, etc.).
- Alerta de **posible duplicado** cuando dos perfiles comparten teléfono.
- Generar **contraseña temporal** y **eliminar candidato** con todos sus datos.
- Acciones: **Aceptar**, **Poner en espera**, **Rechazar**.
- **Empresas**: crear, editar, activar/desactivar.
- **Solicitudes** de personal por empresa (puesto, oficio, cantidad, provincia, salario).
- **Colocar** candidatos aceptados en una empresa/solicitud. Estados de la colocación:
  propuesto → entrevista → contratado. Si queda «No seleccionado» o «Relación finalizada»,
  el candidato vuelve automáticamente al mercado laboral para **recolocarlo**.
- Crear otros administradores y cambiar contraseña.

**Público**
- Política de privacidad (`/privacidad`) conforme a la Ley 172-13.
- Vista previa al compartir en WhatsApp/Facebook (Open Graph) e ícono para celulares.

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
| `SITIO_URL` | Dirección pública del sitio (para enlaces y vista previa). Ej.: `https://mies-c85p.onrender.com` |
| `CONTACTO_CORREO` | Correo que recibe los mensajes del formulario de contacto |
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
