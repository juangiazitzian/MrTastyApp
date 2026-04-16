# Mr Tasty App

Version actual: **0.4.0**

MVP para gestion de dos locales de hamburgueseria:

1. **Cierre mensual de remitos por proveedor** para completar el EERR
2. **Recomendador de pedido BLANCALUNA** basado en stock + consumo promedio
3. **Autenticacion** con usuario y contrasena (Web Crypto API)
4. **Graficos** de tendencia mensual, stock y distribucion por proveedor
5. **Mermas y ajustes** de stock con historial
6. **Consumo promedio automatico** calculado desde snapshots de stock

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite (desarrollo) / PostgreSQL (produccion)

## Setup rapido

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Generar cliente Prisma, crear DB y cargar seed
npm run setup

# 4. Arrancar en modo desarrollo
npm run dev
```

La app corre en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Default | Descripcion |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Conexion a base de datos |
| `DOCUMENT_PARSER_PROVIDER` | `mock` | Parser de imagenes: `mock`, `openai`, `anthropic` |
| `OPENAI_API_KEY` | - | API key para OCR con GPT-4 Vision |
| `ANTHROPIC_API_KEY` | - | API key para OCR con Claude Vision |
| `AUTH_SECRET` | - | Secreto para sesiones (cambiar en produccion) |
| `DEFAULT_CURRENCY` | `ARS` | Moneda por defecto |
| `TZ` | `America/Argentina/Buenos_Aires` | Timezone |

## Credenciales por defecto

Tras correr el seed, el usuario inicial es:

- **Email:** `admin@mrtasty.com`
- **Contrasena:** `mrtasty2024`

**Importante:** cambiala desde Configuracion despues de la primera sesion.

## Comandos utiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run db:studio    # Abrir Prisma Studio
npm run db:reset     # Resetear DB y re-seedear
npm run db:seed      # Solo ejecutar el seed
```

## Modulos

### Remitos

- Upload de foto/PDF con OCR automatico.
- Revision manual post-OCR y guardado directo, sin aprobacion/rechazo.
- Carga batch editable para cargar muchos remitos del mes con fecha, proveedor, numero y total.
- Eliminacion de remitos con confirmacion.
- Deduplicacion por proveedor + nro + fecha + total.
- Vista de lista con filtros por mes, local y proveedor.
- Totales por proveedor y por local.

### EERR

- Estado de Resultados completo con secciones de ventas, mercaderia, sueldos, gastos, impuestos y mantenimiento.
- Mercaderia se alimenta desde remitos.
- Ventas y gastos no vinculados a remitos se cargan manualmente por mes y por local/consolidado.
- Calculo de ventas, gastos, utilidad y porcentaje de utilidad.
- Exportacion CSV del EERR completo.

### Stock

- Carga manual o por foto.
- Revision y correccion post-OCR.
- Edicion y borrado de cargas de stock con confirmacion.
- Historial de snapshots por local.
- Grafico de evolucion de stock por producto.

### Mermas y Ajustes

- Registro de mermas, vencimientos, roturas y ajustes positivos/negativos.
- Historial con filtros por local y producto.
- Los ajustes son considerados en el calculo de consumo promedio.

### Consumo Promedio Automatico

- Boton "Recalcular consumo" en Pedidos BLANCALUNA.
- Formula: consumo = stock_inicial + compras_periodo - stock_final - ajustes
- Requiere al menos 2 snapshots de stock cargados.
- Sobreescribe el promedio diario calculado, respetando el manual como fallback.

### Pedido BLANCALUNA

- Calculo automatico basado en:
  - Stock actual (ultimo snapshot)
  - Promedio diario de uso
  - Dias de cobertura segun dia de la semana
  - Stock de seguridad por producto
- Formula: `pedido = max(0, redondear(stock_objetivo - stock_actual))`
- Detalle del calculo visible por producto.
- Edicion manual antes de confirmar.
- Historial de pedidos.

### Configuracion

- CRUD de locales, proveedores, productos.
- Alias de proveedores y productos para OCR.
- Stock de seguridad y unidades de redondeo por producto.
- Dias de entrega configurables.

## Arquitectura del parser OCR

El sistema de parseo usa interfaces abstractas:

- `DocumentParser` para remitos.
- `StockImageParser` para fotos de stock.

Implementaciones disponibles:

- `MockDocumentParser` / `MockStockImageParser`: datos de ejemplo para desarrollo.
- `AnthropicDocumentParser` / `AnthropicStockImageParser`: usa Claude Vision (recomendado).
- `OpenAIDocumentParser` / `OpenAIStockImageParser`: usa GPT-4 Vision.

Para usar Claude Vision: configurar `DOCUMENT_PARSER_PROVIDER=anthropic` y `ANTHROPIC_API_KEY` en el `.env`.

## Migracion a PostgreSQL

1. Cambiar el provider en `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Actualizar `DATABASE_URL` a una connection string de Postgres.
3. Ejecutar `npx prisma db push`.
4. Ejecutar `npm run db:seed`.

## Roadmap

- [ ] Autenticacion (NextAuth / Clerk)
- [ ] Consumo promedio calculado automatico desde snapshots + compras
- [ ] Notificaciones push para dias de pedido
- [ ] Generacion de Excel completo del EERR
- [ ] Soporte multi-moneda
- [ ] API de parseo con Anthropic Claude Vision
- [ ] Dashboard con graficos de tendencia
- [ ] PWA / modo offline
- [ ] Historico de precios por proveedor
- [ ] Mermas y ajustes de stock
- [ ] Integracion con WhatsApp para enviar pedidos

## Changelog

### v0.3.2

- Stock: se agrego edicion de snapshots existentes, incluyendo fecha, fuente, notas y cantidades por producto.
- Stock: se agrego borrado de cargas con confirmacion desde el ultimo stock y el historial.

### v0.3.1

- BLANCALUNA: se corrigieron los parametros iniciales de ketchup y mayonesa.
- Ketchup y mayonesa pasan a unidad `bolsa`, stock de seguridad `2`, consumo promedio `2`, consumo semana `1.5` y consumo fin de semana `2.3` por dia.
- El pedido de miercoles cubre Vie+Sab+Dom, por lo que el consumo esperado de ketchup/mayonesa queda cerca de 7 bolsas para todo el fin de semana.

### v0.3.0

- Fechas mostradas en formato argentino `DD/MM/AAAA` en vistas y exportaciones tocadas.
- Remitos: se elimino el flujo visible de aprobado/rechazado, se agrego borrado con confirmacion y se incorporo carga batch.
- EERR: se agrego una primera version completa editable basada en la planilla `EERR - San Miguel.xlsx`.
- Base de datos: se agrego `EerrEntry` para guardar importes manuales del EERR por mes/local.

### v0.2.0

- Fase 1 + Fase 2 completas.
- Tema oscuro aplicado.

## Estructura del proyecto

```text
mr-tasty-app/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── remitos/
│   │   ├── eerr/
│   │   ├── stock/
│   │   ├── pedidos/
│   │   ├── configuracion/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   └── lib/
└── public/
    └── uploads/
```
