import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { supabase } from '@/services/supabase/client'

import type {
  AreaChief,
  ReportDraft,
  ReportDraftInput,
  ReportSignature,
  ReportVersion,
} from './types'

interface DraftRow {
  case_id: string
  diagnosis: string | null
  work_done: string | null
  cause: string | null
  observations: string | null
  updated_at: string
}

function mapDraft(row: DraftRow): ReportDraft {
  return {
    caseId: row.case_id,
    diagnosis: row.diagnosis ?? '',
    workDone: row.work_done ?? '',
    cause: row.cause ?? '',
    observations: row.observations ?? '',
    updatedAt: row.updated_at,
  }
}

export async function getReportDraft(caseId: string): Promise<ReportDraft | null> {
  const { data, error } = await supabase
    .from('case_reports')
    .select('case_id, diagnosis, work_done, cause, observations, updated_at')
    .eq('case_id', caseId)
    .maybeSingle()
  if (error) throw error
  return data ? mapDraft(data as DraftRow) : null
}

export async function saveReportDraft(caseId: string, input: ReportDraftInput) {
  const payload = {
    diagnosis: input.diagnosis.trim(),
    work_done: input.workDone.trim(),
    cause: input.cause.trim() || null,
    observations: input.observations.trim() || null,
  }
  const existing = await getReportDraft(caseId)
  const query = existing
    ? supabase.from('case_reports').update(payload).eq('case_id', caseId)
    : supabase.from('case_reports').insert({ case_id: caseId, ...payload })
  const { data, error } = await query
    .select('case_id, diagnosis, work_done, cause, observations, updated_at')
    .single()
  if (error) throw error
  return mapDraft(data as DraftRow)
}

interface VersionRow {
  id: string
  case_id: string
  version_number: number
  status: ReportVersion['status']
  content: ReportVersion['content']
  content_hash: string
  created_at: string
  returned_at: string | null
  return_reason: string | null
  returned_by: { full_name: string } | null
}

export async function listReportVersions(caseId: string): Promise<ReportVersion[]> {
  const { data, error } = await supabase
    .from('case_report_versions')
    .select(
      'id, case_id, version_number, status, content, content_hash, created_at, returned_at, return_reason, returned_by:profiles!case_report_versions_returned_by_fkey(full_name)',
    )
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return (data as unknown as VersionRow[]).map((row) => ({
    id: row.id,
    caseId: row.case_id,
    versionNumber: row.version_number,
    status: row.status,
    content: row.content,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    returnedAt: row.returned_at,
    returnedByName: row.returned_by?.full_name ?? null,
    returnReason: row.return_reason,
  }))
}

interface SignatureRow {
  id: string
  version_id: string
  signature_type: ReportSignature['type']
  signer_id: string
  signer_role: string
  signed_at: string
  consent_text: string
  stroke_path: string
  signer: { full_name: string } | null
}

export async function listReportSignatures(caseId: string): Promise<ReportSignature[]> {
  const { data, error } = await supabase
    .from('case_signatures')
    .select(
      'id, version_id, signature_type, signer_id, signer_role, signed_at, consent_text, stroke_path, signer:profiles!case_signatures_signer_id_fkey(full_name)',
    )
    .eq('case_id', caseId)
    .order('signed_at')
  if (error) throw error
  return (data as unknown as SignatureRow[]).map((row) => ({
    id: row.id,
    versionId: row.version_id,
    type: row.signature_type,
    signerId: row.signer_id,
    signerName: row.signer?.full_name || 'Usuario sin nombre',
    signerRole: row.signer_role,
    signedAt: row.signed_at,
    consentText: row.consent_text,
    strokePath: row.stroke_path,
  }))
}

export async function listAreaChiefs(): Promise<AreaChief[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, area_id')
    .eq('role', 'jefe_area')
  if (error) throw error
  return (data as { id: string; area_id: string | null }[])
    .filter((row): row is { id: string; area_id: string } => Boolean(row.area_id))
    .map((row) => ({ id: row.id, areaId: row.area_id }))
}

export type SignatureAction = 'submit' | 'validate' | 'approve'

export async function signReport(
  caseId: string,
  action: SignatureAction,
  stroke: string,
): Promise<void> {
  const rpc = {
    submit: 'submit_case_report',
    validate: 'validate_case_report',
    approve: 'approve_case_report',
  } as const
  const { error } = await supabase.rpc(rpc[action], {
    target_case_id: caseId,
    signature_stroke: stroke,
    accepts_terms: true,
  })
  if (error) throw error
}

export async function returnReport(caseId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('return_case_report', {
    target_case_id: caseId,
    return_reason: reason.trim(),
  })
  if (error) throw error
}

export async function generateReportPdf(caseId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
    body: { caseId },
  })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    if (status === 409) throw new Error('El PDF se genera cuando la solicitud está aprobada')
    if (status === 404) throw new Error('Solicitud no encontrada')
    throw new Error('No fue posible generar el reporte. Inténtalo de nuevo.')
  }
  const url = (data as { url?: unknown })?.url
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error('No fue posible generar el reporte. Inténtalo de nuevo.')
  }
  return url
}

export async function downloadReportPdf(
  caseId: string,
  caseNumber: string,
  versionNumber: number,
): Promise<string> {
  const url = await generateReportPdf(caseId)
  const safeNumber = caseNumber.replace(/[^A-Za-z0-9-]/g, '-')
  const file = new File(Paths.cache, `Reporte-${safeNumber}-v${versionNumber}.pdf`)
  try {
    const downloaded = await File.downloadFileAsync(url, file, { idempotent: true })
    return downloaded.uri
  } catch {
    // Android may leave a partial file when a download is interrupted.
    if (file.exists) file.delete()
    throw new Error('No fue posible preparar el PDF. Inténtalo de nuevo.')
  }
}

export async function shareReportPdf(
  caseId: string,
  caseNumber: string,
  versionNumber: number,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('No es posible compartir en este dispositivo')
  }
  const uri = await downloadReportPdf(caseId, caseNumber, versionNumber)
  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir reporte',
      UTI: 'com.adobe.pdf',
    })
  } finally {
    const file = new File(uri)
    if (file.exists) file.delete()
  }
}
