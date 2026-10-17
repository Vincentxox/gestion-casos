import type { AppRole } from '@/features/auth/types'

export interface TutorialStep {
  id: string
  title: string
  detail: string
}

export interface FaqEntry {
  id: string
  question: string
  answer: string
  roles?: AppRole[]
}

export const TUTORIAL_TITLES: Record<AppRole, string> = {
  administrador: 'Tu recorrido · administración',
  jefe_area: 'Tu recorrido · jefe de área',
  tecnico: 'Tu recorrido · técnico',
  solicitante: 'Tu recorrido · solicitante',
  auditor: 'Tu recorrido · auditoría',
}

export const TUTORIAL_STEPS: Record<AppRole, TutorialStep[]> = {
  solicitante: [
    {
      id: 'crear',
      title: 'Crea una solicitud',
      detail:
        'Toca el botón + de la barra inferior, elige el tipo de servicio, describe el problema e indica dónde está.',
    },
    {
      id: 'seguir',
      title: 'Sigue su avance',
      detail:
        'En Casos verás el estado de cada solicitud de tu área y quién la atiende. Toca una para ver su historial.',
    },
    {
      id: 'avisos',
      title: 'Revisa tus avisos',
      detail:
        'La campana de Inicio te avisa cuando aceptan, asignan o terminan una solicitud que te interesa.',
    },
    {
      id: 'cancelar',
      title: 'Cancela si ya no hace falta',
      detail:
        'Puedes retirar una solicitud que creaste mientras el área técnica todavía no la acepta.',
    },
  ],
  tecnico: [
    {
      id: 'inicio',
      title: 'Mira lo que te toca',
      detail: 'Inicio muestra los trabajos asignados a ti y los que están por vencer.',
    },
    {
      id: 'ejecutar',
      title: 'Inicia o pausa el trabajo',
      detail:
        'Dentro del caso toca Iniciar trabajo. Si falta un repuesto, acceso o información, pausa el trabajo y escribe el motivo.',
    },
    {
      id: 'recursos',
      title: 'Registra recursos y fotos',
      detail:
        'Anota los materiales, equipos y herramientas que usaste, y agrega fotos de antes y después.',
    },
    {
      id: 'reporte',
      title: 'Firma y envía el reporte',
      detail:
        'Completa el diagnóstico y el trabajo realizado, revisa el reporte completo y fírmalo para enviarlo.',
    },
  ],
  jefe_area: [
    {
      id: 'inicio',
      title: 'Conoce tu Inicio',
      detail:
        'Arriba ves lo pendiente de tu área: solicitudes por aceptar, por asignar y reportes por revisar.',
    },
    {
      id: 'asignar',
      title: 'Acepta y asigna casos',
      detail:
        'Si diriges un área técnica, acepta o rechaza cada solicitud y asigna a un técnico de tu área.',
    },
    {
      id: 'firmar',
      title: 'Valida o da conformidad',
      detail:
        'Revisa el reporte completo y fírmalo. Si falta algo, devuélvelo explicando qué debe corregirse.',
    },
    {
      id: 'indicadores',
      title: 'Lee tus indicadores',
      detail:
        'En Inicio verás los casos vencidos y los tiempos promedio de aceptación y resolución.',
    },
  ],
  administrador: [
    {
      id: 'configurar',
      title: 'Configura tu empresa',
      detail: 'En Administrar crea las áreas, los tipos de servicio y los recursos que se usan.',
    },
    {
      id: 'equipo',
      title: 'Suma a tu equipo',
      detail:
        'Envía invitaciones o comparte el código de la empresa y aprueba las solicitudes de acceso.',
    },
    {
      id: 'plazos',
      title: 'Define los plazos',
      detail:
        'En Plazos por prioridad fija cuánto tiempo hay para aceptar y resolver cada solicitud.',
    },
    {
      id: 'indicadores',
      title: 'Sigue los indicadores',
      detail: 'Inicio resume los casos vencidos, los tiempos promedio y los casos por prioridad.',
    },
  ],
  auditor: [
    {
      id: 'casos',
      title: 'Consulta todos los casos',
      detail: 'Puedes ver todos los casos de tu empresa. Tu acceso es solo de lectura.',
    },
    {
      id: 'reportes',
      title: 'Revisa reportes y firmas',
      detail: 'Cada caso guarda su historial, sus reportes firmados y quién firmó cada uno.',
    },
    {
      id: 'indicadores',
      title: 'Lee los indicadores',
      detail: 'Inicio resume los casos vencidos, los tiempos promedio y los casos por prioridad.',
    },
  ],
}

export const FAQ: FaqEntry[] = [
  {
    id: 'visibilidad',
    question: '¿Quién ve mis solicitudes?',
    answer:
      'Las personas de tu área, el área técnica que la atiende, la administración y la auditoría de tu empresa.',
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
      'El trabajo se pausó, por ejemplo mientras llega un repuesto. El motivo queda en el historial del caso.',
  },
  {
    id: 'cancelar',
    question: '¿Puedo cancelar una solicitud?',
    answer:
      'Sí, quien la creó o el jefe del área solicitante puede retirarla mientras el área técnica no la acepta.',
    roles: ['solicitante', 'jefe_area', 'administrador'],
  },
  {
    id: 'devolver',
    question: '¿Cómo devuelvo un reporte?',
    answer:
      'Abre el caso, revisa el reporte y toca Devolver reporte. Escribe qué falta: el técnico lo verá en la siguiente versión.',
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
      'Las fotos quedan guardadas en el teléfono y se suben solas cuando vuelve la señal. Para ver casos actualizados o firmar necesitas conexión.',
  },
  {
    id: 'vencida',
    question: '¿Qué significa «Vencida»?',
    answer: 'Que pasó el plazo fijado para aceptar o resolver la solicitud según su prioridad.',
  },
]

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es')
}

export function getFaqFor(role: AppRole, query = ''): FaqEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  return FAQ.filter((entry) => !entry.roles || entry.roles.includes(role)).filter((entry) => {
    if (words.length === 0) return true
    const haystack = normalize(`${entry.question} ${entry.answer}`)
    return words.every((word) => haystack.includes(word))
  })
}

export function getTutorialFor(role: AppRole, query = ''): TutorialStep[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return TUTORIAL_STEPS[role]
  return TUTORIAL_STEPS[role].filter((step) => {
    const haystack = normalize(`${step.title} ${step.detail}`)
    return words.every((word) => haystack.includes(word))
  })
}
