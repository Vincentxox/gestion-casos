# Gestión de Casos

Aplicación móvil universitaria para registrar y dar seguimiento a casos desde
Android y iOS. El proyecto utiliza React Native con Expo SDK 57 y TypeScript.

## Requisitos

- Node.js 22 LTS.
- npm.
- Expo Go en un dispositivo o un emulador Android configurado.

## Preparación local

1. Instala las dependencias con `npm ci`.
2. Copia `.env.example` como `.env`.
3. Completa las variables públicas de Supabase.
4. Ejecuta `npm run verify`.
5. Inicia Expo con `npm start`.

Para abrir directamente el emulador Android, ejecuta `npm run android`. Durante
esta etapa no es necesario generar un APK.

## Variables de entorno

| Variable                               | Uso                                              |
| -------------------------------------- | ------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`             | URL HTTPS del proyecto Supabase.                 |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable utilizada por el cliente móvil. |

Las variables con prefijo `EXPO_PUBLIC_` forman parte del bundle y no deben
contener secretos. Nunca agregues una clave `service_role` o `sb_secret_`.

## Comandos

| Comando                | Función                                      |
| ---------------------- | -------------------------------------------- |
| `npm start`            | Inicia Metro para Expo Go.                   |
| `npm run android`      | Abre el proyecto en el emulador Android.     |
| `npm test`             | Ejecuta las pruebas unitarias.               |
| `npm run typecheck`    | Comprueba tipos TypeScript.                  |
| `npm run lint`         | Ejecuta ESLint.                              |
| `npm run format:check` | Comprueba el formato.                        |
| `npm run verify`       | Ejecuta todas las comprobaciones de calidad. |

## Estructura base

```text
src/
  config/                 Validación de configuración pública
  services/supabase/      Cliente de Supabase
  theme/                  Colores, espaciado y radios reutilizables
```

La automatización de GitHub ejecuta las mismas comprobaciones en cada cambio de
las ramas `feature/**` y en cada pull request.
