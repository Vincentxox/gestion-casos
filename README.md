# Nexo Casos

Aplicación móvil para solicitudes de mantenimiento entre áreas de una empresa. La
propuesta del producto incorpora atención técnica, registro de recursos y cierre
con reporte firmado. El código actual todavía implementa un gestor de casos más
sencillo; el nuevo flujo se desarrollará por fases, sin confundirlo con una
función ya disponible.

El proyecto utiliza React Native, Expo SDK 57, TypeScript y Supabase.

Las [reglas de negocio](docs/BUSINESS_RULES.md) describen el producto objetivo;
el [plan del MVP](docs/MVP_PLAN.md) ordena la implementación y el
[seguimiento](docs/MVP_PROGRESS.md) distingue lo construido de lo pendiente.
La coordinación entre agentes está en [AGENTS.md](AGENTS.md) y
[AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md).

## Requisitos

- Node.js 22 LTS.
- npm.
- Expo Go en un dispositivo o emulador compatible. Para compilación iOS local,
  una Mac con Xcode y CocoaPods configurados.

## Preparación local

1. Instala las dependencias con `npm ci`.
2. Copia `.env.example` como `.env`.
3. Completa las variables públicas de Supabase.
4. Verifica que los proveedores de correo y Google estén habilitados en Supabase.
5. Ejecuta `npm run verify`.
6. Inicia Expo con `npm start`.

Para abrir directamente el emulador Android, ejecuta `npm run android`.

El acceso por correo y contraseña puede validarse con Expo Go. Google OAuth usa
el esquema nativo `gestion-casos://auth/callback`; su prueba integral requiere
una compilación de desarrollo o instalable que contenga ese esquema. Expo Go
continúa siendo suficiente para desarrollar y comprobar el resto de las
pantallas de autenticación.

## Variables de entorno

| Variable                               | Uso                                              |
| -------------------------------------- | ------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`             | URL HTTPS del proyecto Supabase.                 |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable utilizada por el cliente móvil. |

Las variables con prefijo `EXPO_PUBLIC_` forman parte del bundle y no deben
contener secretos. Nunca agregues una clave `service_role` o `sb_secret_`.

## Comandos

| Comando                 | Función                                      |
| ----------------------- | -------------------------------------------- |
| `npm start`             | Inicia Metro para Expo Go.                   |
| `npm run android`       | Abre el proyecto en el emulador Android.     |
| `npm run ios`           | Inicia Expo para el simulador iOS en macOS.  |
| `npm test`              | Ejecuta las pruebas unitarias.               |
| `npm run test:coverage` | Ejecuta pruebas y verifica cobertura mínima. |
| `npm run typecheck`     | Comprueba tipos TypeScript.                  |
| `npm run lint`          | Ejecuta ESLint.                              |
| `npm run format:check`  | Comprueba el formato.                        |
| `npm run verify`        | Ejecuta todas las comprobaciones de calidad. |

En macOS, `npx expo run:ios` compila e instala una versión nativa en el
simulador; requiere Xcode y CocoaPods. Para una compilación en EAS, el único
perfil configurado actualmente en `eas.json` es `preview`: usa
`npx eas-cli build --platform android --profile preview` para el APK de prueba.
Una compilación iOS para simulador o distribución requiere configurar y revisar
un perfil apropiado; no se obtiene una app instalable para iPhone con Expo Go.

## Estructura base

```text
src/
  components/             Controles reutilizables y accesibles
  config/                 Validación de configuración pública
  features/auth/          Autenticación, validaciones y permisos
  features/admin/         Administración básica de usuarios
  features/areas/         Catálogo de áreas
  features/categories/    Catálogo de categorías
  features/cases/         Listado, formulario y detalle de casos
  features/home/          Pantalla de inicio
  features/settings/      Perfil y ajustes actuales
  navigation/             Rutas públicas y protegidas
  services/supabase/      Cliente y almacenamiento seguro de sesión
  store/                  Estado global de autenticación
  theme/                  Colores, espaciado y radios reutilizables
```

La sesión se guarda mediante `expo-secure-store`. Los permisos visibles en el
cliente mejoran la experiencia, pero la autorización real se mantiene en las
políticas RLS y funciones de Supabase.

La automatización de GitHub ejecuta Expo Doctor, formato, TypeScript, ESLint,
pruebas y cobertura en cada cambio de las ramas `feature/**` y en cada pull
request.
