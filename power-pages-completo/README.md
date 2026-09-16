# Aplicación completa: adaptación a Power Pages

Fuente: `../transporte-barranquilla-main/app`. El proyecto Next.js original se conserva sin cambios. Esta copia no incluye los módulos que solo existen en `C:/Users/saul8/transporte-barranquilla` (por ejemplo Modo TV).

## Estado real

- Pantallas originales reutilizadas: Seguimiento, Refusal, Check-in, gráficas, PDF, Arenosa, Modulación, Registro de modulación, Jornada, Asistencia, Personas, Rango y Administración.
- Navegación mediante fragmentos (`/#/seguimiento`) para no requerir rutas del servidor Next.js.
- Imágenes sin optimizador Next.js y estilos Tailwind compilados con Vite.
- Sesión de Power Pages/Microsoft: no se reutilizan cookies ni contraseñas de Supabase.
- Capa de datos para `/_api/` con CSRF, paginación, validación de JSON y control de concurrencia en actualizaciones.
- Cálculos originales de Administración y Personas reutilizados con lectores Dataverse.
- Las tablas están sin configurar intencionadamente. No se han creado tablas, migrado datos ni otorgado permisos.
- La sincronización masiva de Seguimiento, Asistencia y Check-in permanece bloqueada: falta portar sus transacciones, enriquecimiento de asistencia/capacidad, eliminación de filas omitidas y auditoría al servidor Dataverse. No se simula una grabación exitosa.
- Los lotes de Modulación/Rango/Perfiles usan operaciones individuales: una falla intermedia puede dejar un lote parcialmente escrito. Una clave única en Dataverse debe impedir duplicados concurrentes. La versión no está lista para producción.
- Auditoría: la pantalla puede leer una tabla configurada; la creación de eventos confiables corresponde a auditoría nativa/plug-in del servidor, nunca a privilegios del navegador.

## Ejecutar

```powershell
cd C:\Users\saul8\Downloads\transporte-barranquilla-main\power-pages-completo
npm.cmd ci
npm.cmd run test
npm.cmd run build
npm.cmd run dev
```

En local no se crea una sesión de prueba privilegiada. Se muestra el acceso de Microsoft hasta configurar el contexto del portal.

## Pendiente antes de publicar

1. Crear las tablas y relaciones de Dataverse. Cada DTO requiere clave estable, nombre, JSON y GUID; las fotos/evidencias grandes necesitan almacenamiento de archivo, no texto de 4.000 caracteres.
2. Completar `src/portal/config.ts` con nombres lógicos reales, longitud máxima y conjunto de entidades. Crear una clave única y relación a contacto/cuenta para la autorización por empresa.
3. Habilitar `Webapi/<nombre-lógico>/enabled` y enumerar explícitamente las columnas en `Webapi/<nombre-lógico>/fields`.
4. Configurar permisos de tabla por Contacto/Cuenta y roles específicos. No dar acceso global a empresas ni usar filtros del navegador como seguridad. Los roles de interfaz no sustituyen los permisos del servidor.
5. Renderizar `window.transportPortalSession` desde Liquid antes de arrancar la aplicación. Contiene `contactId`, `email`, `contractor`, `isAdmin`, `isPeople`, obtenidos del contacto y roles del portal. No contiene credenciales; las banderas solo controlan la interfaz.
6. Portar las operaciones transaccionales de servidor pendientes y verificar contratos con datos de pruebas, incluyendo aislamiento entre empresas, escritura, eliminación, importación y reportes.
7. Publicar como sitio SPA o preparar una carga para el portal tradicional. Este build genera varios archivos y no debe pasarse al antiguo `prepare-portal-deploy.mjs`, diseñado para un único módulo. No ejecutar la carga SPA contra el portal tradicional sin revisar el destino.

No se despliega automáticamente ni se cambia el portal existente desde este proyecto.

Documentación de la API y permisos: https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview
