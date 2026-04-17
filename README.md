# Mr Tasty App — PHP Edition
### Sistema de gestión para hamburgueserías · Versión PHP para InfinityFree

---

## ¿Qué es esto?

App web completa para gestionar 2 locales de hamburguesería. Construida en **PHP + MySQL + vanilla JS**, diseñada para correr en hosting gratuito [InfinityFree](https://www.infinityfree.com/).

**Módulos:**
- 📄 **Remitos** — Carga de fotos, extracción OCR, carga manual y batch, cierre mensual
- 📊 **EERR** — Resumen mensual por proveedor, mapeo a categorías, exportación CSV
- 📦 **Stock** — Snapshots de inventario (manual o desde foto), historial
- ⚠️ **Mermas** — Registro de pérdidas, roturas, vencimientos y ajustes
- 🛒 **Pedido BLANCALUNA** — Sugerencia de pedido con base en stock + consumo promedio
- ⚙️ **Configuración** — CRUD de locales, proveedores, productos, aliases

**Stack:**
- Backend: PHP 7.4+
- Base de datos: MySQL 5.7+
- Frontend: Vanilla JS + Tailwind CSS (CDN)
- Hosting: InfinityFree (gratuito)

---

## PASO A PASO: Deploy en InfinityFree

### 1. Crear cuenta y sitio en InfinityFree

1. Ir a [infinityfree.com](https://www.infinityfree.com/) y crear cuenta gratuita
2. En el panel, hacer click en **"Create Account"** → elegir subdominio (ej: `mrtasty.infinityfreeapp.com`)
3. Esperar que el hosting se active (puede tardar hasta 10 minutos)

---

### 2. Crear la base de datos MySQL

1. En el panel de InfinityFree → **"MySQL Databases"**
2. Crear una nueva base de datos (anota el nombre, usuario y contraseña)
3. El host de la DB será algo como: `sql123.infinityfree.com`
4. Guardar estos datos — los vas a necesitar en el paso 4

---

### 3. Subir archivos por FTP

**Datos FTP** (se encuentran en el panel de InfinityFree):
- Host: `ftpupload.net` (o el que te asigne)
- Puerto: 21
- Usuario y contraseña: los de tu cuenta

**Software FTP recomendado:** [FileZilla](https://filezilla-project.org/) (gratuito)

**Pasos:**
1. Abrir FileZilla y conectar con los datos FTP
2. Navegar a la carpeta `htdocs/` en el servidor (panel derecho)
3. Subir **todos los archivos** de esta carpeta `mr-tasty-php/` al `htdocs/` del servidor
4. Verificar que la estructura quede así en el servidor:

```
htdocs/
├── .htaccess
├── index.php
├── setup.php
├── setup.sql
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── db.php
│   └── response.php
├── api/
│   ├── auth/
│   │   ├── login.php
│   │   ├── logout.php
│   │   └── me.php
│   ├── eerr.php
│   ├── eerr_export.php
│   ├── locales.php
│   ├── pedidos.php
│   ├── productos.php
│   ├── proveedores.php
│   ├── remitos.php
│   ├── remitos_summary.php
│   ├── remitos_trend.php
│   ├── settings.php
│   ├── stock.php
│   ├── stock_ajustes.php
│   ├── stock_calcular_consumo.php
│   ├── stock_trend.php
│   └── upload.php
├── public/
│   ├── css/
│   │   └── app.css
│   └── js/
│       ├── app.js
│       ├── configuracion.js
│       ├── dashboard.js
│       ├── eerr.js
│       ├── login.js
│       ├── pedidos.js
│       ├── remitos.js
│       └── stock.js
└── uploads/   ← crear esta carpeta vacía en el servidor
```

> ⚠️ **Importante:** La carpeta `uploads/` debe existir en el servidor y tener permisos de escritura. Creala vacía con FileZilla.

---

### 4. Configurar la base de datos en config/db.php

Antes de subir (o editar en el servidor via FTP), abrí `config/db.php` y completá con los datos de tu DB:

```php
define('DB_HOST', 'sql123.infinityfree.com');  // ← tu host MySQL
define('DB_NAME', 'if0_123456_mr_tasty');       // ← tu nombre de DB
define('DB_USER', 'if0_123456');                // ← tu usuario MySQL
define('DB_PASS', 'tu_contraseña');             // ← tu contraseña MySQL
```

---

### 5. Importar el schema de la base de datos

**Opción A — Via phpMyAdmin (recomendada):**
1. En el panel de InfinityFree → **"phpMyAdmin"**
2. Seleccionar tu base de datos
3. Click en **"Importar"** → seleccionar el archivo `setup.sql`
4. Click en **"Continuar"**

**Opción B — Via setup.php:**
1. Abrir en el navegador: `https://tu-sitio.infinityfreeapp.com/setup.php?run_sql=1`
2. Seguir las instrucciones en pantalla

---

### 6. Crear el usuario administrador

Abrir en el navegador:
```
https://tu-sitio.infinityfreeapp.com/setup.php
```

Esto crea el usuario administrador con:
- **Email:** `admin@mrtasty.com`
- **Contraseña:** `mrtasty2024`

> ⚠️ **IMPORTANTE: Después de completar el setup, eliminá el archivo `setup.php` del servidor por seguridad.**
> Podés hacerlo en FileZilla: click derecho sobre `setup.php` → Eliminar.

---

### 7. ¡Listo! Ingresar a la app

Abrir: `https://tu-sitio.infinityfreeapp.com`

Credenciales:
- **Email:** `admin@mrtasty.com`
- **Contraseña:** `mrtasty2024`

> 💡 **Recomendación:** Cambiar la contraseña después del primer ingreso (funcionalidad en Configuración).

---

## Variables de entorno / Configuración OCR

Para que la extracción automática de remitos y stock desde foto funcione, necesitás una API key de Anthropic (Claude):

1. Ir a [console.anthropic.com](https://console.anthropic.com/) y generar una API key
2. Editá `config/app.php` y reemplazá la línea de ANTHROPIC_API_KEY:

```php
define('ANTHROPIC_API_KEY', 'sk-ant-tu-api-key-aqui');
```

O bien, configurala desde la app en **Configuración → Delivery & API → Clave Anthropic**.

> Sin API key: la carga de imágenes igual funciona, pero los datos no se extraen automáticamente — los tenés que ingresar a mano en la pantalla de revisión.

---

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email | `admin@mrtasty.com` |
| Contraseña | `mrtasty2024` |
| Local 1 | San Miguel Balbn |
| Local 2 | San Miguel Peron |
| Proveedor OCR | BLANCALUNA |

---

## Solución de problemas frecuentes

### Error 500 al acceder
- Verificá que `config/db.php` tenga los datos correctos de MySQL
- Verificá que las tablas existan en la DB (correr `setup.sql`)
- En InfinityFree, los errores PHP se pueden ver en el panel → **"Error Logs"**

### No puedo iniciar sesión
- Asegurate de haber corrido `setup.php` para crear el usuario admin
- InfinityFree a veces tarda en propagar cambios. Esperá 5 min y reintentá.

### Las imágenes no se suben
- Verificá que la carpeta `uploads/` exista en `htdocs/` con permisos de escritura (chmod 755 o 777)
- El límite de subida es 10MB — InfinityFree puede tener restricciones propias en planes gratuitos

### Los JS no cargan / página en blanco
- Verificá que el `.htaccess` se subió (los archivos que empiezan con punto a veces se omiten en FileZilla — activar "Ver archivos ocultos" en el menú de FileZilla)
- En FileZilla: Servidor → Forzar mostrar archivos ocultos

### Error de cookie / sesión
- La app usa cookies `mt_token` para la sesión
- Si el sitio no tiene SSL activo, la cookie puede no funcionar (InfinityFree da SSL gratis — asegurate de acceder por `https://`)

---

## Estructura de archivos relevante

```
config/db.php         ← Credenciales de la base de datos ← EDITAR ESTO
config/app.php        ← Configuración general + API key OCR
setup.sql             ← Schema MySQL + datos iniciales
setup.php             ← Script de setup (ELIMINAR después de usar)
uploads/              ← Imágenes subidas (debe tener permisos de escritura)
```

---

## Roadmap de mejoras futuras

1. **Cambio de contraseña desde la UI** — Agregar pantalla en Configuración
2. **Notificaciones push** — Recordatorio los lunes/miércoles/viernes para el pedido BL
3. **Exportación EERR completa a Excel** — Rellenar template Excel del EERR mensual
4. **Histórico de precios por proveedor** — Trackear precio promedio en el tiempo
5. **Backup automático** — Export periódico de la DB
6. **Multi-usuario** — Soporte para más de un usuario con roles

---

## Versión

**v1.0.0** — PHP Edition · Abril 2026  
Migrado desde Next.js v0.4.0 para compatibilidad con hosting gratuito InfinityFree.
