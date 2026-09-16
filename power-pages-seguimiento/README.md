# Seguimiento para Power Pages

Versión React/Vite de Seguimiento que utiliza la Web API de Power Pages y Dataverse. No utiliza Supabase ni Vercel. La aplicación anterior del repositorio permanece separada en la raíz.

## Compilar desde GitHub o Codespaces

```sh
cd power-pages-seguimiento
npm ci
npm run build
```

GitHub Actions compila esta carpeta y entrega el artefacto `seguimiento-power-pages`. Abrir el repositorio en vscode.dev no publica el sitio.

## Publicación pendiente

Instalar Power Platform CLI 1.44 o posterior y autenticarse con una cuenta autorizada:

```sh
pac auth create --environment https://org6a8c9fdb.crm3.dynamics.com
pac pages upload-code-site --rootPath .
```

La configuración usa el nombre `Transporte Barranquilla - Seguimiento`. La primera carga puede crear un sitio SPA independiente: no se debe asumir que reemplaza el sitio tradicional `TransportTranking`. Verificar el destino y activar el sitio desde Power Pages manteniéndolo privado. No cambiar permisos ni restricciones de archivos sin autorización del administrador.

GitHub no elimina los bloqueos de autenticación de Microsoft. No guardar contraseñas, tokens ni archivos de entorno en el repositorio.

## Dataverse después de la carga

Las tablas y permisos no se crean en este paso. Ajustar los nombres lógicos en `src/config.ts`, habilitar la Web API y conceder permisos de lectura, creación y escritura al rol autenticado apropiado. Sin esa configuración, la aplicación no podrá guardar o recuperar rutas.

Documentación: https://learn.microsoft.com/en-us/power-pages/configure/create-code-sites
