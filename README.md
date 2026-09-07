# Nexo Casos

Aplicación móvil para conectar el registro, la asignación y el seguimiento de casos.
El proyecto utiliza React Native, Expo SDK 57, TypeScript y Supabase.

## Requisitos

- Node.js 22 LTS.
- npm.
- Expo Go en un dispositivo o un emulador Android configurado.

## Preparación local

1. Instala las dependencias con `npm ci`.
2. Copia `.env.example` como `.env`.
3. Completa las variables públicas de Supabase.
4. Verifica que los proveedores de correo y Google estén habilitados en Supabase.
5. Ejecuta `npm run verify`.
6. Inicia Expo con `npm start`.

Para abrir directamente el emulador Android, ejecuta `npm run android`. Durante
esta etapa no es necesario generar un APK.

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
| `npm test`              | Ejecuta las pruebas unitarias.               |
| `npm run test:coverage` | Ejecuta pruebas y verifica cobertura mínima. |
| `npm run typecheck`     | Comprueba tipos TypeScript.                  |
| `npm run lint`          | Ejecuta ESLint.                              |
| `npm run format:check`  | Comprueba el formato.                        |
| `npm run verify`        | Ejecuta todas las comprobaciones de calidad. |

## Estructura base

```text
src/
  components/             Controles reutilizables y accesibles
  config/                 Validación de configuración pública
  features/auth/          Autenticación, validaciones y permisos
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
