# Tasty · Operaciones

Aplicación privada para los locales Mr Tasty de Balbín y Perón, San Miguel. Incluye datos importados de los cuatro Excel entregados y de las dos planillas de consumo verificadas durante la construcción.

## Uso

- **Resumen:** facturación, gastos, resultados y márgenes históricos; comparación por local, distribución de gastos y consumo por día de la semana. Muestra por separado los movimientos nuevos del mes cargados en la app.
- **Pedidos y stock:** stock actual por insumo, proveedor, tamaño del bulto, demora, frecuencia, margen de seguridad y entregas pendientes. Sugiere compras usando las últimas ocho semanas por día de la semana. Guarda un borrador y exporta CSV; no envía pedidos al proveedor.
- **Facturas:** originales privados en almacenamiento persistente, extracción de texto, revisión manual, categorías, notas de crédito y prevención de duplicados. Las revisadas se incluyen en resultados. Sin conexión de Google, quedan pendientes de exportación.
- **Estado de resultados:** histórico con referencias a celdas y fórmulas de origen; cierre preliminar con facturas revisadas, ventas por canal y gastos manuales. Permite ventas diarias o totales mensuales, sin mezclarlos en el mismo local, canal y mes. Exportación CSV.
- **Candidatos:** búsqueda, filtros, datos de contacto y estados de selección. Importa correos de CV en tandas de 25, con rangos de seis meses, un año o todo el historial. Lee adjuntos PDF, JPG, PNG, TXT o Word desde una ficha y los hace buscables. La selección corresponde al equipo; no hay puntajes automáticos ni envío de correos.
- **Conexiones:** configuración y comprobación del acceso a Google; actualización de consumos y EERR.

## Activación pendiente

La aplicación puede guardar movimientos sin Google. Para habilitar el OCR, Gmail y la escritura/lectura de planillas, instalar y autorizar el conector desde **mrtastysanmiguel@gmail.com**, con permiso sobre las cuatro planillas. Los enlaces de los EERR privados aún deben incorporarse a las propiedades del conector.

Las instrucciones completas y los archivos están en `public/google-setup.html`, accesibles desde Conexiones. El conector no está instalado ni autorizado al entregar el código. Sus pruebas locales usan servicios simulados; la extracción real, los permisos de Google y la exportación real deben verificarse después de autorizar.

Los consumos se actualizan al abrir la app y cada 15 minutos mientras está abierta, tras configurar la conexión. Los EERR históricos y Gmail se actualizan desde sus botones. No existe todavía un servicio de sincronización cuando la app está cerrada.

Falta cargar los proveedores, bultos y plazos reales que el usuario enviará en fotos, y contar el stock actual. No se inventaron parámetros de proveedores. La cobertura actual comprende pan, papas y medallones de 80 g y 55 g, presentes en las hojas de consumo.

El Site se publica inicialmente privado para su propietario. El acceso del equipo deberá configurarse con sus cuentas cuando se indiquen. Las planillas mantienen sus permisos de Google; no necesitan ser públicas.

## Fuentes y criterios

- San Miguel / San Miguel 1 → **Balbín**; San Miguel 2 / II → **Perón**.
- Conteo es **consumo diario**, confirmado por el usuario. Los blancos, `?`, anotaciones y fechas duplicadas no se convierten en consumo cero.
- Las pestañas antiguas de stock dicen «STOCK MUNRO» y fueron excluidas de las sugerencias. La app exige un conteo actual de hasta 24 horas.
- Se requiere al menos 70 % de cobertura de 56 días, último consumo de hasta cuatro días y dos observaciones por día de semana proyectado. Sin cobertura suficiente no se muestra una cantidad sugerida.
- Las papas se expresan en bolsas, como la fuente. Los dos tamaños de carne se mantienen separados.
- Los EERR tienen 14 períodos/locales importados. Julio de 2026 es el último período común con los principales conceptos cargados en los archivos entregados. Agosto está incompleto. Febrero de Balbín contiene versiones alternativas y enero tiene una diferencia entre canales y ventas; las alertas se conservan.
- «Mercadería» sigue las compras del EERR; no equivale al costo de consumo ajustado por inventario.
- Una importación completa no implica cierre contable aprobado. No se suman facturas nuevas a los EERR históricos porque podrían estar contabilizadas allí.
- El conector escribe solamente en las pestañas nuevas `Registro App` y `EERR App AAAA-MM`; preserva las pestañas originales. La app consulta su propio libro de movimientos y el histórico original, sin importar de vuelta cambios manuales hechos en `Registro App`.
- Para corregir un registro ya exportado se necesita un ajuste documentado; se conserva el registro original. Los borradores y las ventas/gastos que aún no iniciaron sincronización pueden editarse.

El resumen curado está en `data/reviewed.json`. Las pruebas de conciliación usan `tests/fixtures/eerr.json`. Los volcados originales y archivos temporales locales están excluidos de Git.

## Identidad visual

Se investigaron [Mr Tasty](https://mrtasty.com.ar/) y [su sitio de franquicias](https://franquiciasmrtasty.com/). Logo oficial, naranja `#F28E19`, grafito y fondos claros. Tipografía de sistema; no se distribuyen las fuentes comerciales del sitio oficial. Incluye estados de foco, hover, transiciones, animación de entrada y respeto de la preferencia de reducir movimiento.

## Implementación

React 19, Vinext/Vite, componentes Radix/shadcn, Recharts, Cloudflare Worker, D1 y R2. La configuración de Sites está en `.openai/hosting.json`. Se preserva el modelo de autenticación de Sites; todas las rutas de datos requieren sesión y las mutaciones comprueban el origen.

Los secretos del conector se guardan del lado servidor y no se retornan en las APIs. Apps Script exige HMAC SHA-256, ventana de cinco minutos y nonce de un solo uso. Usa permisos de Gmail de solo lectura y `drive.file` para documentos temporales del OCR. El conector elimina únicamente los documentos temporales que él mismo crea. Los originales cargados en la app permanecen en R2.

La sincronización de registros es idempotente por ID. Antes del envío se fija el contenido para impedir cambios concurrentes entre el registro local y Sheets. Ante una respuesta incierta se puede reintentar; no se debe editar un registro cuya sincronización comenzó. Los registros guardan versión y una bitácora de creación/actualización.

Límites explícitos: 8 MB por archivo; tres adjuntos compatibles por lectura de correo; hasta 10.000 registros por tipo, con error en lugar de mostrar totales recortados; 5.000 filas de conteo; 60 pestañas de EERR por local y sus primeras 100 filas. Ampliar o paginar antes de superar esos límites. Un PDF no legible por OCR se conserva para revisión manual.

## Desarrollo y validación

Node.js >=22.13.0. Comandos del proyecto: `npm run install:ci`, `npm run dev`, `npm run build`, `npm test`, `npx tsc --noEmit`. La vista local usa `http://127.0.0.1:5173/`. El perfil local de Sites simula el inicio de sesión solo en loopback; esa simulación queda fuera de la compilación de producción.

Migraciones D1 generadas en `drizzle/`. El proceso de publicación de Sites empaqueta Worker, recursos estáticos y migraciones. La base local y sus registros temporales de prueba no se publican.

Las pruebas verifican cálculo de pedidos, tratamiento de faltantes/cero, fechas, importes, conciliación con los Excel, duplicados, notas de crédito, exportación CSV segura, firma/repetición del conector, cuenta autorizada y lectura/paginación de Gmail con simuladores. Las comprobaciones HTTP locales cubren autenticación, guardado persistente, versiones concurrentes, archivos y el rechazo de mezcla de ventas mensuales/diarias. No se realizó una sesión de pruebas visuales de navegador ni una autorización real de Google.

Documentación de las integraciones: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [conversión/OCR de Drive](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [adjuntos de Gmail](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get).
