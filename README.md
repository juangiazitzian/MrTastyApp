# Mr Tasty App

MVP para gestion de hamburgueserias. Dos modulos principales:

1. **Cierre mensual de remitos por proveedor** — para completar el EERR
2. **Recomendador de pedido BLANCALUNA** — basado en stock + consumo promedio

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
| `OPENAI_API_KEY` | — | API key para OCR con GPT-4 Vision |
| `ANTHROPIC_API_KEY` | — | API key para OCR con Claude Vision |
| `DEFAULT_CURRENCY` | `ARS` | Moneda por defecto |
| `TZ` | `America/Argentina/Buenos_Aires` | Timezone |

## Comandos utiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run db:studio    # Abrir Prisma Studio (UI de base de datos)
npm run db:reset     # Resetear DB y re-seedear
npm run db:seed      # Solo ejecutar el seed
```

## Modulos

### Remitos
- Upload de foto/PDF con OCR automatico
- Revision manual post-OCR
- Deduplicacion por proveedor + nro + fecha + total
- Vista de lista con filtros por mes, local, proveedor, estado
- Totales por proveedor y por local

### EERR
- Vista agrupada por categoria EERR (seccion MERCADERIA)
- Mapeo automatico proveedor → categoria EERR
- Exportacion CSV listo para copiar al EERR

### Stock
- Carga manual o por foto
- Revision y correccion post-OCR
- Historial de snapshots por local

### Pedido BLANCALUNA
- Calculo automatico basado en:
  - Stock actual (ultimo snapshot)
  - Promedio diario de uso
  - Dias de cobertura segun dia de la semana
  - Stock de seguridad por producto
- Formula: `pedido = max(0, redondear(stock_objetivo - stock_actual))`
- Detalle del calculo visible por producto
- Edicion manual antes de confirmar
- Historial de pedidos

### Configuracion
- CRUD de locales, proveedores, productos
- Alias de proveedores y productos (para OCR)
- Stock de seguridad y unidades de redondeo por producto
- Dias de entrega configurables

## Arquitectura del parser OCR

El sistema de parseo usa interfaces abstractas:
- `DocumentParser` — para remitos
- `StockImageParser` — para fotos de stock

Implementaciones disponibles:
- `MockDocumentParser` / `MockStockImageParser` — datos de ejemplo para desarrollo
- `OpenAIDocumentParser` / `OpenAIStockImageParser` — usa GPT-4 Vision

Para agregar un nuevo provider (ej: Anthropic, Google Vision), crear una clase que implemente la interfaz y registrarla en `src/lib/parsers/index.ts`.

## Migracion a PostgreSQL

1. Cambiar el provider en `prisma/schema.prisma`:
   ```
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Actualizar `DATABASE_URL` a una connection string de Postgres
3. Ejecutar `npx prisma db push`
4. Ejecutar `npm run db:seed`

## Roadmap v0.2

- [ ] Autenticacion (NextAuth / clerk)
- [ ] Consumo promedio calculado automatico (desde snapshots + compras)
- [ ] Notificaciones push para dias de pedido
- [ ] Template de EERR con generacion de Excel completo
- [ ] Soporte multi-moneda
- [ ] API de parseo con Anthropic Claude Vision
- [ ] Dashboard con graficos de tendencia
- [ ] PWA / modo offline
- [ ] Historico de precios por proveedor
- [ ] Mermas y ajustes de stock
- [ ] Integracion con WhatsApp para enviar pedidos

## Estructura del proyecto

```
mr-tasty-app/
├── prisma/
│   ├── schema.prisma      # Modelo de datos
│   └── seed.ts            # Datos iniciales
├── src/
│   ├── app/
│   │   ├── api/           # API Routes
│   │   ├── remitos/       # Pagina de remitos
│   │   ├── eerr/          # Pagina EERR
│   │   ├── stock/         # Pagina de stock
│   │   ├── pedidos/       # Pagina de pedidos
│   │   ├── configuracion/ # Pagina de config
│   │   ├── layout.tsx     # Layout principal
│   │   └── page.tsx       # Dashboard
│   ├── components/
│   │   ├── ui/            # Componentes base (Button, Input, etc)
│   │   └── layout/        # Sidebar, header, filtros
│   └── lib/
│       ├── db.ts          # Cliente Prisma
│       ├── utils.ts       # Utilidades
│       ├── parsers/       # Abstraccion de OCR
│       ├── alias-resolver.ts
│       └── recommendation-engine.ts
└── public/
    └── uploads/           # Imagenes subidas
```
