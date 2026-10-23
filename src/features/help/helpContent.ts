import type { AppRole } from '@/features/auth/types'

export const CASE_CARD_GUIDE_LEGEND = [
  {
    label: 'Por aceptar',
    phase: 'nueva',
    status: 'solicitado',
    meaning: 'Nueva: el área técnica todavía no la acepta.',
  },
  {
    label: 'En curso',
    phase: 'curso',
    status: 'en_ejecucion',
    meaning: 'Aceptada, asignada o en ejecución.',
  },
  {
    label: 'En espera',
    phase: 'detenida',
    status: 'en_espera',
    meaning: 'Pausada, por ejemplo por un repuesto.',
  },
  {
    label: 'En revisión',
    phase: 'revision',
    status: 'reporte_enviado',
    meaning: 'Reporte enviado; falta validar y aprobar.',
  },
  {
    label: 'Cerrada',
    phase: 'cerrada',
    status: 'aprobado',
    meaning: 'Aprobada. También hay rechazadas y canceladas.',
  },
] as const

export type TourTargetId =
  | 'home-attention'
  | 'home-bell'
  | 'home-area-grid'
  | 'cases-scope'
  | 'cases-first-card'
  | 'cases-indicators'
  | 'tab:Home'
  | 'tab:CasesTab'
  | 'tab:Administration'
  | 'tab:Help'
  | 'tab:Profile'
  | 'tab:create'

export interface TutorialStep {
  id: string
  title: string
  detail: string
  where: string
  target: TourTargetId
  tab: 'Home' | 'CasesTab' | 'Administration' | 'Help'
  requires?: 'create' | 'indicators'
}

export interface QuickGuide {
  id: string
  title: string
  duration: '1 min' | '40 s' | '30 s'
  roles?: AppRole[]
  requires?: 'create' | 'indicators'
  steps: string[]
  action: string
  destination: 'create' | 'cases' | 'my-work' | 'invitations' | 'indicators'
}

export interface FaqEntry {
  id: string
  question: string
  answer: string
  roles?: AppRole[]
}

const help: TutorialStep = {
  id: 'ayuda',
  title: 'Ayuda siempre a mano',
  detail: 'Aquí repites este recorrido y tienes guías por tarea y preguntas frecuentes.',
  where: 'Ayuda',
  target: 'tab:Help',
  tab: 'Help',
}
const create: TutorialStep = {
  id: 'crear',
  title: 'Pide un servicio con +',
  detail:
    'Elige el tipo de servicio, describe el problema y di dónde está. El área técnica recibe el aviso.',
  where: 'Nueva solicitud',
  target: 'tab:create',
  tab: 'Home',
  requires: 'create',
}
const indicators: TutorialStep = {
  id: 'indicadores',
  title: 'Indicadores',
  detail: 'Las vencidas y los tiempos promedio para aceptar y resolver.',
  where: 'Solicitudes',
  target: 'cases-indicators',
  tab: 'CasesTab',
  requires: 'indicators',
}
const chiefAttention: TutorialStep = {
  id: 'inicio',
  title: 'Lo urgente, primero',
  detail: 'Arriba ves lo más importante: vencidas, lo que te toca decidir o «Todo a tiempo».',
  where: 'Inicio',
  target: 'home-attention',
  tab: 'Home',
}

export const TUTORIAL_TITLES: Record<AppRole, string> = {
  solicitante: 'Recorrido de solicitante',
  tecnico: 'Recorrido de técnico',
  jefe_area: 'Recorrido de jefe de área',
  administrador: 'Recorrido de administrador',
  auditor: 'Recorrido de auditor',
}

export const TUTORIAL_STEPS: Record<AppRole, TutorialStep[]> = {
  solicitante: [
    {
      id: 'inicio',
      title: 'Lo urgente, primero',
      detail:
        'Arriba ves lo más importante: lo que se pasó del plazo, lo que te toca o «Todo a tiempo».',
      where: 'Inicio',
      target: 'home-attention',
      tab: 'Home',
    },
    {
      id: 'avisos',
      title: 'Tus avisos',
      detail: 'La campana te avisa cuando aceptan, asignan o terminan una solicitud tuya.',
      where: 'Inicio',
      target: 'home-bell',
      tab: 'Home',
    },
    create,
    {
      id: 'seguir',
      title: 'Sigue cada solicitud',
      detail:
        'La etiqueta dice en qué va y la barra cuántos de los 5 pasos lleva. Ábrela para ver Seguimiento y Mensajes.',
      where: 'Solicitudes',
      target: 'cases-first-card',
      tab: 'CasesTab',
    },
    help,
  ],
  tecnico: [
    {
      id: 'inicio',
      title: 'Lo urgente, primero',
      detail:
        'Arriba ves lo que te toca ahora, por ejemplo iniciar un trabajo. Si algo se pasó del plazo, aquí aparece en rojo.',
      where: 'Inicio',
      target: 'home-attention',
      tab: 'Home',
    },
    {
      id: 'avisos',
      title: 'Tus avisos',
      detail: 'Te avisamos cuando te asignan un trabajo o devuelven un reporte.',
      where: 'Inicio',
      target: 'home-bell',
      tab: 'Home',
    },
    {
      id: 'mis-trabajos',
      title: 'Mis trabajos',
      detail:
        'Lo que tienes asignado y lo que trabajaste o firmaste antes, aunque luego se haya reasignado. En «Mi área» ves el resto de tu área.',
      where: 'Solicitudes',
      target: 'cases-scope',
      tab: 'CasesTab',
    },
    {
      id: 'tu-paso',
      title: 'Tu paso, abajo',
      detail:
        'Dentro de la solicitud, el botón azul es lo que te toca: Iniciar trabajo, Reanudar trabajo o Completar reporte. Pausar está en el menú ⋮.',
      where: 'Detalle de la solicitud',
      target: 'cases-first-card',
      tab: 'CasesTab',
    },
    help,
  ],
  jefe_area: [
    chiefAttention,
    {
      id: 'tu-area',
      title: 'Tu área en números',
      detail: 'Por aceptar, En curso y En revisión. Toca uno para ver esas solicitudes.',
      where: 'Inicio',
      target: 'home-area-grid',
      tab: 'Home',
    },
    create,
    {
      id: 'decidir',
      title: 'Acepta, asigna y revisa',
      detail:
        'En la solicitud, el botón azul es tu paso: Aceptar solicitud, Asignar personal o Revisar y validar. Reasignar, Editar y Cancelar están en el menú ⋮.',
      where: 'Solicitudes',
      target: 'cases-first-card',
      tab: 'CasesTab',
    },
    indicators,
  ],
  administrador: [
    chiefAttention,
    {
      id: 'avisos',
      title: 'Tus avisos',
      detail: 'Te avisamos de solicitudes nuevas, vencidas y pedidos de acceso.',
      where: 'Inicio',
      target: 'home-bell',
      tab: 'Home',
    },
    {
      id: 'admin',
      title: 'Configura tu empresa',
      detail:
        'Áreas, tipos de servicio, plazos, usuarios e invitaciones. El número en la pestaña dice cuánto falta completar.',
      where: 'Admin',
      target: 'tab:Administration',
      tab: 'Administration',
    },
    {
      id: 'solicitudes',
      title: 'Todas las solicitudes',
      detail:
        'Ves todas las de tu empresa. Dentro de cada una, Reasignar y Cancelar están en el menú ⋮.',
      where: 'Solicitudes',
      target: 'cases-first-card',
      tab: 'CasesTab',
    },
    indicators,
  ],
  auditor: [
    {
      id: 'inicio',
      title: 'Lo urgente, primero',
      detail: 'Arriba ves si hay solicitudes vencidas en tu empresa.',
      where: 'Inicio',
      target: 'home-attention',
      tab: 'Home',
    },
    {
      id: 'solicitudes',
      title: 'Consulta todo',
      detail:
        'Puedes ver todas las solicitudes, su seguimiento y los reportes firmados. Tu acceso es de solo lectura.',
      where: 'Solicitudes',
      target: 'cases-first-card',
      tab: 'CasesTab',
    },
    indicators,
    help,
  ],
}

export const QUICK_GUIDES: QuickGuide[] = [
  {
    id: 'crear',
    title: 'Crear una solicitud',
    duration: '1 min',
    requires: 'create',
    steps: [
      'Toca + abajo a la derecha.',
      'Elige el tipo de servicio y la prioridad.',
      'Describe el problema y di dónde está. Puedes agregar fotos.',
      'Toca «Enviar solicitud».',
    ],
    action: 'Crear solicitud',
    destination: 'create',
  },
  {
    id: 'seguir',
    title: 'Seguir y escribir mensajes',
    duration: '40 s',
    roles: ['solicitante', 'tecnico', 'jefe_area', 'administrador'],
    steps: [
      'Abre la solicitud en Solicitudes.',
      'En Seguimiento ves cada paso, con la fecha y quién lo hizo.',
      'En Mensajes escribes a quienes participan.',
    ],
    action: 'Ir a Solicitudes',
    destination: 'cases',
  },
  {
    id: 'trabajo',
    title: 'Hacer el trabajo y reportar',
    duration: '1 min',
    roles: ['tecnico', 'jefe_area'],
    steps: [
      'Abre el trabajo y toca «Iniciar trabajo».',
      'Si falta un repuesto, toca ⋮ › «Pausar trabajo» y escribe el motivo. Para seguir, «Reanudar trabajo».',
      'Registra los recursos y las fotos de antes y después.',
      'Toca «Completar reporte», revísalo y fírmalo para enviarlo.',
    ],
    action: 'Ir a Mis trabajos',
    destination: 'my-work',
  },
  {
    id: 'asignar',
    title: 'Aceptar y asignar',
    duration: '40 s',
    roles: ['jefe_area', 'administrador'],
    steps: [
      'Abre una solicitud «Por aceptar».',
      'Toca «Aceptar solicitud», o en ⋮ «Rechazar solicitud» con el motivo.',
      'Toca «Asignar personal» y elige a la persona.',
      'Para cambiarla, ⋮ › «Reasignar personal». Si está vencida, el botón aparece también abajo.',
    ],
    action: 'Ir a Solicitudes',
    destination: 'cases',
  },
  {
    id: 'revisar',
    title: 'Validar y aprobar el reporte',
    duration: '1 min',
    roles: ['jefe_area', 'administrador'],
    steps: [
      'Abre una solicitud «En revisión».',
      'Toca «Revisar y validar» o «Revisar y aprobar».',
      'Lee el reporte completo y fírmalo.',
      'Si falta algo, toca «Devolver» y explica qué corregir.',
    ],
    action: 'Ir a Solicitudes',
    destination: 'cases',
  },
  {
    id: 'equipo',
    title: 'Sumar a tu equipo',
    duration: '30 s',
    roles: ['administrador'],
    steps: [
      'En Admin › Invitaciones envía una invitación.',
      'O comparte el código de la empresa en Admin › Mi empresa.',
      'Aprueba los pedidos en Admin › Solicitudes de acceso.',
    ],
    action: 'Ir a Invitaciones',
    destination: 'invitations',
  },
  {
    id: 'indicadores',
    title: 'Leer los indicadores',
    duration: '30 s',
    requires: 'indicators',
    steps: [
      'En Solicitudes toca «Indicadores».',
      '«Vencidas» son las que pasaron su plazo.',
      'Los tiempos promedio son de aceptación y de resolución.',
    ],
    action: 'Abrir Indicadores',
    destination: 'indicators',
  },
]

export const FAQ: FaqEntry[] = [
  {
    id: 'visibilidad',
    question: '¿Quién ve mis solicitudes?',
    answer:
      'Las personas de tu área, el área técnica que la atiende, la administración y la auditoría de tu empresa. También quien trabajó o firmó en ella.',
  },
  {
    id: 'estados',
    question: '¿Qué significa cada estado?',
    answer:
      'Solicitada espera revisión. Aceptada y Asignada ya tienen responsable. En ejecución se está trabajando. Reporte enviado y Validada esperan firmas. Aprobada queda cerrada.',
  },
  {
    id: 'espera',
    question: '¿Qué es «En espera»?',
    answer:
      'El trabajo se pausó, por ejemplo mientras llega un repuesto. El motivo queda en Seguimiento.',
  },
  {
    id: 'cancelar',
    question: '¿Puedo cancelar una solicitud?',
    answer:
      'Sí, quien la creó o el jefe del área solicitante puede retirarla mientras el área técnica no la acepta. Está en el menú ⋮ de la solicitud.',
    roles: ['solicitante', 'jefe_area', 'administrador'],
  },
  {
    id: 'devolver',
    question: '¿Cómo devuelvo un reporte?',
    answer:
      'Abre la solicitud, toca Revisar y validar y luego Devolver. Escribe qué falta: el técnico lo verá en la siguiente versión.',
    roles: ['jefe_area', 'administrador'],
  },
  {
    id: 'firma',
    question: '¿Por qué tengo que firmar?',
    answer:
      'La firma deja constancia de quién hizo, validó o aprobó el trabajo. Al firmar, el reporte queda guardado y ya no se puede editar.',
  },
  {
    id: 'sin-internet',
    question: '¿Funciona sin internet?',
    answer:
      'Si no hay señal, Solicitudes muestra lo último que se cargó. Las fotos se guardan en el teléfono y se suben solas al volver la señal. Para firmar o cambiar el estado necesitas conexión.',
  },
  {
    id: 'vencida',
    question: '¿Qué significa «Vencida»?',
    answer: 'Que pasó el plazo fijado para aceptar o resolver la solicitud según su prioridad.',
  },
  {
    id: 'mis-trabajos',
    question: '¿Qué aparece en «Mis trabajos»?',
    answer:
      'Lo que tienes asignado y las solicitudes en las que trabajaste o firmaste antes, aunque después se reasignaran o cambiaras de área.',
    roles: ['tecnico'],
  },
  {
    id: 'menu',
    question: '¿Dónde edito, reasigno o cancelo?',
    answer:
      'En el menú ⋮ arriba a la derecha de la solicitud. Solo aparece lo que tu rol puede hacer en ese momento.',
    roles: ['solicitante', 'tecnico', 'jefe_area', 'administrador'],
  },
  {
    id: 'contrasena',
    question: 'Olvidé mi contraseña',
    answer:
      'En la pantalla de inicio de sesión toca «¿Olvidaste tu contraseña?» y escribe tu correo. Abre el enlace del correo en el teléfono donde tienes la app. Si lo abres en la computadora, escanea el código QR con el teléfono.',
  },
  {
    id: 'repetir',
    question: '¿Puedo repetir el recorrido?',
    answer: 'Sí. Arriba en Ayuda toca «Repetir recorrido», o «Mostrarme» en cualquier paso.',
  },
]

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

function matches(query: string, value: string): boolean {
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => normalize(value).includes(word))
}

export function getTutorialFor(role: AppRole, query = '', canCreate = true): TutorialStep[] {
  return TUTORIAL_STEPS[role].filter(
    (step) =>
      (step.requires !== 'create' || canCreate) &&
      matches(query, `${step.title} ${step.detail} ${step.where}`),
  )
}

export function getGuidesFor(role: AppRole, query = '', canCreate = true): QuickGuide[] {
  return QUICK_GUIDES.filter(
    (guide) =>
      (!guide.roles || guide.roles.includes(role)) &&
      (guide.requires !== 'create' || (canCreate && role !== 'auditor')) &&
      (guide.requires !== 'indicators' ||
        ['administrador', 'jefe_area', 'auditor'].includes(role)) &&
      matches(query, `${guide.title} ${guide.steps.join(' ')}`),
  )
}

export function getFaqFor(role: AppRole, query = ''): FaqEntry[] {
  return FAQ.filter(
    (entry) =>
      (!entry.roles || entry.roles.includes(role)) &&
      matches(query, `${entry.question} ${entry.answer}`),
  )
}
