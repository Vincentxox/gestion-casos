export interface ReportDraft {
  caseId: string
  diagnosis: string
  workDone: string
  cause: string
  observations: string
  updatedAt: string
}

export type ReportDraftInput = Pick<
  ReportDraft,
  'diagnosis' | 'workDone' | 'cause' | 'observations'
>

export interface FrozenReportContent {
  version: number
  solicitud: {
    id: string
    numero: string
    titulo: string
    descripcion: string
    ubicacion: string
    prioridad: string
    tipo_servicio: string
    area_solicitante: string
    area_destino: string
    creada_por: string
    tecnico: string | null
  }
  fechas: Record<string, string | null>
  reporte: {
    diagnostico: string
    trabajo_realizado: string
    causa: string | null
    observaciones: string | null
  }
  recursos: Record<string, unknown>[]
  fotos: { id: string; tipo: 'antes' | 'despues'; imagen: string; miniatura: string }[]
}

export interface ReportVersion {
  id: string
  caseId: string
  versionNumber: number
  status: 'vigente' | 'devuelta'
  content: FrozenReportContent
  contentHash: string
  createdAt: string
  returnedAt: string | null
  returnedByName: string | null
  returnReason: string | null
}

export interface ReportSignature {
  id: string
  versionId: string
  type: 'ejecucion' | 'validacion_tecnica' | 'conformidad'
  signerId: string
  signerName: string
  signerRole: string
  signedAt: string
  consentText: string
  strokePath: string
}

export interface AreaChief {
  id: string
  areaId: string
}
