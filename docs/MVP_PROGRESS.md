# Seguimiento del MVP

Última actualización: 22 de septiembre de 2026.

Este archivo registra **lo que ya existe en el código**. El producto objetivo
aprobado se describe en [BUSINESS_RULES.md](BUSINESS_RULES.md) y su ejecución
por fases en [MVP_PLAN.md](MVP_PLAN.md). Las etapas históricas de abajo se
cerraron para el alcance inicial; no significan que el nuevo MVP B2B esté
terminado.

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
- [x] Variables públicas validadas y claves privilegiadas rechazadas en el cliente.
- [x] Dependencias alineadas con las versiones estables de Expo SDK 57.

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
- [x] Inicio de sesión con Google mediante Supabase OAuth.
- [x] Mensajes de error traducidos a partir de códigos estables de Supabase Auth.
- [x] Recuperación visible cuando falla la restauración de una sesión.
- [x] Mostrar y ocultar contraseñas con controles accesibles.
- [x] Registro y limpieza del ciclo de renovación automática de tokens.
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

- [x] Evaluar e implementar inicio de sesión con Google.
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

Estado: completada para el alcance funcional y técnico del MVP inicial.

- [x] Menú principal y acceso al módulo.
- [x] Modelo de casos, prioridades y estados en Supabase.
- [x] RLS y permisos iniciales para administrador, auditor y visualizador.
- [x] Listado con búsqueda, filtros, actualización y estados de carga/error/vacío.
- [x] Creación básica con validación y permisos.
- [x] Historial automático de estado en base de datos.
- [x] Detalle del caso.
- [x] Edición con validación y permisos.
- [x] Cambio de estado con comentario obligatorio y registro atómico.
- [x] Asignación y retiro de personal responsable.
- [x] Visualización del historial.

Evidencia técnica:

- [x] Formulario reutilizable para creación y edición.
- [x] Navegación hacia edición, cambio de estado y asignación desde el detalle.
- [x] Acciones visibles únicamente según la matriz de permisos.
- [x] RLS mantiene las escrituras restringidas al administrador.
- [x] RPC de cambio de estado ejecutada como `SECURITY INVOKER`.
- [x] Comentario obligatorio entre 3 y 500 caracteres validado en móvil y PostgreSQL.
- [x] Trigger registra automáticamente estado anterior, nuevo estado, usuario y comentario.
- [x] Usuarios anónimos no pueden ejecutar el cambio de estado.
- [x] Migraciones aplicadas al proyecto remoto de Supabase.
- [x] Prueba transaccional remota aprobada sin modificar datos permanentes.
- [x] Bundle Android generado correctamente.
- [x] TypeScript, ESLint y Prettier aprobados en su validación inicial. El estado
      de pruebas actual es de 67 pruebas aprobadas, según la revisión del 22/09/2026.

Validación manual recomendada:

- [ ] Recorrer creación, edición, estado y asignación en un dispositivo Android con la cuenta administradora.
- [ ] Confirmar que auditor y visualizador no reciben acciones administrativas.

## Etapa 4 — Documentos y funciones complementarias

Estado: pendiente.

- [ ] Adjuntos y Supabase Storage.
- [ ] Notas internas.
- [ ] Notificaciones.
- [ ] Reportes esenciales del MVP.
- [ ] Preferencias y perfil.

## Ampliación priorizada para el cierre del MVP

- [x] Navegación principal con barra inferior para Inicio, Casos y Perfil.
- [x] Accesos y acciones visibles de acuerdo con los permisos del rol.
- [x] Perfil de consulta con cierre seguro de sesión.
- [x] Catálogo administrable de áreas o departamentos con RLS.
- [x] Categorías administrables relacionadas con áreas y protegidas con RLS.
- [ ] Vistas de casos por usuario y área, con filtros ampliados.
- [ ] Dashboard con indicadores operativos.
- [ ] Datos legibles de creador y responsable en el detalle.
- [ ] Notas de seguimiento.
- [ ] Adjuntos privados.
- [x] Administración básica de usuarios y catálogos, con roles, áreas y
      categorías actuales. El modelo multiempresa y los nuevos roles siguen
      pendientes.
- [ ] Reporte básico.

## Etapa 5 — Estabilización y entrega

Estado: pendiente.

- [ ] Estados de carga, error, vacío y sin conexión.
- [ ] Accesibilidad.
- [ ] Pruebas automatizadas de lógica crítica.
- [ ] Pruebas manuales en Android e iOS.
- [ ] Revisión de seguridad y RLS.
- [ ] Documentación de instalación y uso.
- [ ] Build de entrega.

## Etapa 6 — Identidad e introducción de la aplicación

Estado: completada para Android y Expo Go.

- [x] Nombre visible actualizado a `Nexo Casos`.
- [x] Identificador técnico, paquete y esquema OAuth conservados para evitar regresiones.
- [x] Nueva marca visual adaptada al propósito de conexión y seguimiento.
- [x] Icono principal, icono adaptativo de Android, versión monocromática y favicon.
- [x] Recurso gráfico para la introducción y pantalla de acceso.
- [x] Introducción animada con entrada, permanencia y salida.
- [x] Respeto de la preferencia de reducción de movimiento del dispositivo.
- [x] Implementación con `Animated` de React Native, sin dependencias adicionales.

## Nuevo plan del MVP B2B

Las funcionalidades anteriores son la base técnica. Quedan pendientes las fases
del [plan actualizado](MVP_PLAN.md):

- [ ] Fase 0: normalizar finales de línea, aclarar el historial de migraciones
      y actualizar documentación.
- [ ] Fase 1: empresas, invitaciones, nuevos roles y tipos de área.
- [ ] Fase 2: flujo de solicitudes, transiciones autorizadas y visibilidad por
      área y rol.
- [ ] Fase 3: catálogo y registro de recursos usados.
- [ ] Fase 4: reporte versionado, firmas y PDF privado.
- [ ] Fase 5: notificaciones, tiempos por prioridad e indicadores.
- [ ] Fase 6: seguridad, pruebas Android/iOS, distribución y documentación.

Próxima acción: cerrar la fase 0 y revisar los contratos de backend antes de
modificar el cliente. El [tablero de relevo](AGENT_HANDOFF.md) conserva el estado
de cada tarea.

Comprobación remota de la etapa 3:

- `public.cases` existe y tiene RLS habilitado.
- `public.case_status_history` existe y tiene RLS habilitado.
- `cases` tiene tres políticas y `case_status_history` tiene una política.
- El historial inicial se crea mediante un trigger protegido.
- Las funciones de trigger no son ejecutables por usuarios anónimos.
- El cambio de estado requiere comentario y se ejecuta respetando RLS.
- Existe una cuenta administradora para validar las acciones de escritura.
