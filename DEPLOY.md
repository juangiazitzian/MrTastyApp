# Puesta en producción

Guía para dejar la app andando en Vercel. Son cuatro servicios y se hace una sola vez. Ninguna clave de las que aparecen acá se guarda en el repositorio: todas van en el panel de Vercel.

Anotá los valores a medida que los vayas sacando, porque en el paso 4 se cargan todos juntos.

---

## 1. Base de datos (Turso)

Entrá a [turso.tech](https://turso.tech) y creá la cuenta con GitHub. Es gratis y el plan libre da 5 GB y 500 millones de lecturas por mes, muy por encima de lo que consumen dos locales.

Creá una base nueva; ponele `mrtasty`. Elegí la región más cercana a Buenos Aires (normalmente aparece como `gru`, São Paulo).

De la base necesitás dos datos:

- **La URL**, que arranca con `libsql://` → será `TURSO_DATABASE_URL`
- **Un token**, que se genera en la sección de tokens de la base → será `TURSO_AUTH_TOKEN`

---

## 2. Acceso con Google

Entrá a [console.cloud.google.com](https://console.cloud.google.com), creá un proyecto y llamalo `Mr Tasty Operaciones`.

Configurá primero la **pantalla de consentimiento** en *APIs y servicios → Pantalla de consentimiento de OAuth*. Elegí tipo **Externo**, poné el nombre de la app y `mrtastysanmiguel@gmail.com` como correo de soporte. No hace falta publicarla ni pasar verificación: mientras esté en modo prueba, agregá como *usuarios de prueba* los mismos correos del equipo.

Después creá las credenciales en *APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth*, tipo **Aplicación web**. En **URI de redirección autorizados** cargá estas dos, exactamente:

```
https://TU-DOMINIO.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

La primera la vas a poder completar recién después del paso 4, cuando Vercel te asigne el dominio. Volvé a esta pantalla y agregala entonces: si falta, el login devuelve `redirect_uri_mismatch`.

Guardá el **ID de cliente** (`AUTH_GOOGLE_ID`) y el **secreto** (`AUTH_GOOGLE_SECRET`).

---

## 3. Secreto de sesión

Es el que firma las cookies. Generalo con:

```bash
npx auth secret
```

Copiá el valor: es `AUTH_SECRET`.

---

## 4. Vercel

Entrá a [vercel.com](https://vercel.com) con tu cuenta de GitHub y elegí *Add New → Project*. Importá el repositorio `MrTastyApp`. Vercel detecta Next.js solo; no hay que tocar la configuración de build.

Antes de darle *Deploy*, cargá las variables de entorno:

| Variable | De dónde sale |
|---|---|
| `TURSO_DATABASE_URL` | Paso 1 |
| `TURSO_AUTH_TOKEN` | Paso 1 |
| `AUTH_GOOGLE_ID` | Paso 2 |
| `AUTH_GOOGLE_SECRET` | Paso 2 |
| `AUTH_SECRET` | Paso 3 |
| `ALLOWED_EMAILS` | Los correos habilitados, separados por coma |

En `ALLOWED_EMAILS` va la lista de quiénes pueden entrar, por ejemplo `juanigia47@gmail.com,mrtastysanmiguel@gmail.com`. **Si queda vacía no entra nadie**, incluido vos: está hecho así a propósito, para que un error de configuración deje la app cerrada y no abierta.

Una vez desplegada, creá el almacenamiento de las facturas en *Storage → Create → Blob*. Al conectarlo al proyecto, Vercel inyecta `BLOB_READ_WRITE_TOKEN` solo. Después de crearlo hay que **volver a desplegar** para que la app lo tome.

Con el dominio ya asignado, volvé al paso 2 y sumá la URI de redirección real.

---

## 5. Crear las tablas

La base arranca vacía. Desde tu computadora, con el proyecto clonado:

```bash
TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:migrate
```

En Windows con PowerShell:

```powershell
$env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; npm run db:migrate
```

Se corre una sola vez, y de nuevo solo si cambia `db/schema.ts`.

---

## 6. Conector de Google

Es independiente del hosting y se configura desde la app, en la sección **Conexiones**, que tiene las instrucciones completas. Se instala como Apps Script desde `mrtastysanmiguel@gmail.com`, con permiso sobre las cuatro planillas. Hasta que esté autorizado, la app funciona igual pero sin OCR, sin bandeja de Gmail y sin escribir en Sheets.

---

## Comprobación final

Entrá al dominio: tiene que mandarte a la pantalla de acceso. Entrá con un correo de la lista y debería abrirse el Resumen con los números de julio de 2026 ya cargados. Probá también con un correo que **no** esté en la lista: tiene que rechazarlo.

Si el login da `redirect_uri_mismatch`, falta la URI del paso 2. Si la app carga pero no guarda registros, revisá que las migraciones del paso 5 hayan corrido. Si falla la subida de una factura, falta el Blob store o el redespliegue posterior.
