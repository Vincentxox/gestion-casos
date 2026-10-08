import { render } from '@testing-library/react-native'

import { ReportContent } from '../components/ReportContent'
import type { FrozenReportContent } from '../types'

jest.mock('@/features/photos/usePhotos', () => ({
  usePhotoUrl: () => ({ data: null, error: null }),
}))

const content: FrozenReportContent = {
  version: 1,
  solicitud: {
    id: 'case-1',
    numero: 'CAS-2026-00002',
    titulo: 'Reparación',
    descripcion: 'Sin energía',
    ubicacion: 'Taller',
    prioridad: 'alta',
    tipo_servicio: 'Electricidad',
    area_solicitante: 'Administración',
    area_destino: 'Mantenimiento',
    creada_por: 'Ana',
    tecnico: 'Luis',
  },
  fechas: {
    creada: '2026-09-24T08:00:00Z',
    asignada: '2026-09-24T15:00:00Z',
    enviada: '2026-09-25T12:00:00Z',
  },
  reporte: {
    diagnostico: 'Cable dañado',
    trabajo_realizado: 'Se cambió el cable',
    causa: null,
    observaciones: null,
  },
  recursos: [
    { recurso: 'Cable', clase: 'material', cantidad: 2, unidad: 'm', horas: null },
    { recurso: null, tecnico: 'Luis', tipo: 'mano_de_obra', cantidad: null, horas: 1.5 },
  ],
  fotos: [
    { id: 'before-1', tipo: 'antes', imagen: 'before.jpg', miniatura: 'before-thumb.jpg' },
    { id: 'after-1', tipo: 'despues', imagen: 'after.jpg', miniatura: 'after-thumb.jpg' },
  ],
}

test('ordena las secciones y muestra tiempos, recursos y fotos accesibles', async () => {
  const screen = await render(<ReportContent content={content} />)
  const labels = screen
    .getAllByText(/Firmas · progreso|Trabajo realizado|Tiempos|Recursos y mano de obra|Fotografías/)
    .map((node) => node.props.children)
  expect(labels).toEqual([
    'Firmas · progreso',
    'Trabajo realizado',
    'Tiempos',
    'Recursos y mano de obra',
    'Fotografías',
  ])
  expect(screen.getByText('CAS-2026-00002 · Versión 1')).toBeTruthy()
  expect(screen.getByText('Alta')).toBeTruthy()
  expect(screen.getByLabelText('Prioridad: Alta')).toBeTruthy()
  expect(screen.getByText('Administración')).toBeTruthy()
  expect(screen.getByText('Ana')).toBeTruthy()
  expect(screen.getByText('Asignada')).toBeTruthy()
  expect(screen.getByText('Material')).toBeTruthy()
  expect(screen.getByText('2 m')).toBeTruthy()
  expect(screen.getByText('1.5 h')).toBeTruthy()
  expect(screen.getByText('Resuelta en 1 d 4 h')).toBeTruthy()
  expect(screen.getByText('Antes · 1')).toBeTruthy()
  expect(screen.getByText('Después · 1')).toBeTruthy()
  expect(screen.getByLabelText('Ampliar foto antes 1 de 1')).toBeTruthy()
  expect(screen.getByLabelText('Ampliar foto después 1 de 1')).toBeTruthy()
})

test('oculta secciones y campos vacíos, indica el turno y muestra la firma', async () => {
  const signature = {
    id: 's1',
    versionId: 'v1',
    type: 'ejecucion' as const,
    signerId: 'u1',
    signerName: 'Luis',
    signerRole: 'administrador',
    signedAt: '2026-09-24T16:00:00Z',
    consentText: 'Acepto',
    strokePath: 'M 10 10 L 800 800',
  }
  const screen = await render(
    <ReportContent
      content={{ ...content, version: 0, fechas: {}, recursos: [], fotos: [] }}
      signatures={[signature]}
      currentAction="validate"
      verificationHash="abcdef123456"
    />,
  )
  expect(screen.queryByText('Tiempos')).toBeNull()
  expect(screen.queryByText('Fotografías')).toBeNull()
  expect(screen.queryByText('Recursos y mano de obra')).toBeNull()
  expect(screen.queryByText('Causa')).toBeNull()
  expect(screen.getByText('Validación técnica · te toca')).toBeTruthy()
  expect(screen.getByLabelText('Firma de ejecución de Luis')).toBeTruthy()
  expect(screen.getByText('Código de verificación: ABCD-EF12-3456')).toBeTruthy()
})

test('la prioridad media usa el distintivo común y un reporte firmado evidencia que no hubo recursos', async () => {
  const screen = await render(
    <ReportContent
      content={{
        ...content,
        solicitud: { ...content.solicitud, prioridad: 'media' },
        recursos: [],
        fotos: [],
      }}
    />,
  )
  expect(screen.getByLabelText('Prioridad: Media')).toBeTruthy()
  expect(screen.getByText('Sin recursos registrados')).toBeTruthy()
})
