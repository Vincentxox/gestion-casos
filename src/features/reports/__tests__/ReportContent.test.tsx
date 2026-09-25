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
  fechas: { asignada: '2026-09-24T15:00:00Z' },
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

test('presenta etiquetas de oración, recursos con unidad y fotos por momento', async () => {
  const screen = await render(<ReportContent content={content} />)
  expect(screen.getByText('Tipo de servicio')).toBeTruthy()
  expect(screen.getByText('Alta')).toBeTruthy()
  expect(screen.getByText('Asignada')).toBeTruthy()
  expect(screen.getByText('Material')).toBeTruthy()
  expect(screen.getByText('Cantidad: 2 m')).toBeTruthy()
  expect(screen.getByText('Horas: 1.5 h')).toBeTruthy()
  expect(screen.getByText('Antes')).toBeTruthy()
  expect(screen.getByText('Después')).toBeTruthy()
})
