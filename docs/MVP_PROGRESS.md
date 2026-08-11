# Seguimiento del MVP

Última actualización: 27 de julio de 2026.

## Etapa 1 — Preparación y configuración base

Estado: completada.

- [x] Proyecto Expo SDK 57 con React Native y TypeScript estricto.
- [x] Identificadores y configuración base para Android e iOS.
- [x] ESLint y Prettier configurados.
- [x] React Navigation y dependencias nativas compatibles.
- [x] React Query, Zustand, React Hook Form y Zod instalados.
- [x] Cliente de Supabase configurado mediante variables de entorno.
- [x] Archivos `.env` excluidos del repositorio.
- [x] Rama `feature/authentication` sincronizada con el repositorio remoto.
- [x] TypeScript, ESLint, Prettier y Expo Doctor aprobados.
- [x] Flujo CI preparado para calidad y pruebas en GitHub Actions.

## Etapa 2 — Autenticación, perfiles y control de acceso

Estado: completada para el alcance del MVP inicial.

- [x] Persistencia de sesión cifrada con `expo-secure-store`.
- [x] Renovación automática de la sesión según el estado de la aplicación.
- [x] Migración de perfiles y roles preparada.
- [x] Políticas RLS iniciales preparadas.
- [x] URL base de Supabase corregida (sin el sufijo `/rest/v1`).
- [x] Migración ejecutada y verificada en Supabase.
- [x] Registro con validación de contraseña.
- [x] Inicio de sesión con correo y contraseña.
- [x] Cierre de sesión y limpieza de datos sensibles.
- [x] Estado global y hook `useAuth`.
- [x] Navegación protegida.
- [x] Matriz de permisos y restricciones por rol.
- [x] Pruebas unitarias de validación de credenciales.
- [x] Pruebas unitarias del almacenamiento seguro de sesión.
- [x] Pruebas unitarias del servicio de autenticación.
- [x] Pruebas unitarias de las transiciones del estado global.
- [x] Pruebas del flujo completo en Android.
- [x] Bundle JavaScript generado para iOS.
- [ ] Prueba del flujo completo en un dispositivo iOS (Etapa 5).

Evidencia Android:

- [x] Pantalla de inicio de sesión renderizada correctamente en emulador.
- [x] Campos de correo y contraseña visibles.
- [x] Acción de ingreso disponible.
- [x] Navegación hacia creación de cuenta disponible.
- [x] Pantalla de registro renderizada correctamente.
- [x] Registro real completado contra Supabase Auth.
- [x] Correo del usuario confirmado.
- [x] Trigger creó automáticamente el perfil.
- [x] Nuevo perfil recibió el rol seguro `visualizador`.
- [x] Inicio de sesión real completado.
- [x] Perfil autenticado cargado desde Supabase.
- [x] Navegación protegida abrió el menú autenticado.
- [x] Nombre y rol `visualizador` renderizados correctamente.
- [x] Sesión persistida de forma cifrada en Android.
- [x] Sesión restaurada después de cerrar y abrir la aplicación.
- [x] Cierre de sesión eliminó la sesión persistida.
- [x] Reinicio posterior mantuvo al usuario fuera de la sesión.

Roles obligatorios:

- Administrador.
- Auditor.
- Visualizador.

Criterio de cierre: un usuario puede registrarse, confirmar su cuenta, iniciar y
cerrar sesión, recuperar una sesión válida y acceder únicamente a las funciones
permitidas por su rol. Las políticas RLS deben impedir la elevación de privilegios.

Mejora posterior al MVP:

- [ ] Evaluar e implementar inicio de sesión con Google.
- [ ] Evaluar e implementar inicio de sesión con Apple.

Estas opciones no bloquean el cierre de la etapa 2. Si la aplicación pública para
iOS utiliza Google como proveedor principal, se revisarán los requisitos vigentes
de App Store antes de su publicación.

Fuera del alcance obligatorio de este MVP inicial:

- [ ] SSO empresarial.
- [ ] Autenticación biométrica.
- [ ] Segundo factor de autenticación.
- [ ] Cierre automático por inactividad.

## Etapa 3 — Gestión principal de casos

Estado: en progreso. Primer incremento funcional preparado el 10 de agosto de 2026.

- [x] Menú principal y acceso al módulo.
- [x] Modelo de casos, prioridades y estados en Supabase.
- [x] RLS y permisos iniciales para administrador, auditor y visualizador.
- [x] Listado con búsqueda, filtros, actualización y estados de carga/error/vacío.
- [x] Creación básica con validación y permisos.
- [x] Historial automático de estado en base de datos.
- [x] Detalle del caso.
- [ ] Edición.
- [ ] Cambio de estado con comentario.
- [ ] Asignación de personal.
- [x] Visualización del historial.

## Etapa 4 — Documentos y funciones complementarias

Estado: pendiente.

- [ ] Adjuntos y Supabase Storage.
- [ ] Notas internas.
- [ ] Notificaciones.
- [ ] Reportes esenciales del MVP.
- [ ] Preferencias y perfil.

## Etapa 5 — Estabilización y entrega

Estado: pendiente.

- [ ] Estados de carga, error, vacío y sin conexión.
- [ ] Accesibilidad.
- [ ] Pruebas automatizadas de lógica crítica.
- [ ] Pruebas manuales en Android e iOS.
- [ ] Revisión de seguridad y RLS.
- [ ] Documentación de instalación y uso.
- [ ] Build de entrega.

## Próxima acción

Validar el primer incremento de la etapa 3 en Android con una cuenta
administradora. Después implementar detalle, edición, cambio de estado,
asignación y visualización del historial.

Comprobación remota de la etapa 3:

- `public.cases` existe y tiene RLS habilitado.
- `public.case_status_history` existe y tiene RLS habilitado.
- `cases` tiene tres políticas y `case_status_history` tiene una política.
- El historial inicial se crea mediante un trigger protegido.
- Las funciones de trigger no son ejecutables por usuarios anónimos.
