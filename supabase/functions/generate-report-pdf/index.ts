// Edge Function `generate-report-pdf` (T-904; docs/BUSINESS_RULES.md, sección 9).
//
// La app la llama con la sesión del usuario: `POST { caseId }`.
// 1. Con la sesión del usuario comprueba que puede ver la solicitud (RLS) y que está
//    aprobada.
// 2. Si la versión vigente ya tiene PDF, devuelve un enlace firmado de 5 minutos.
// 3. Si no, genera el PDF una sola vez (`pdf.ts`) a partir del contenido congelado y firmado:
//    datos, reporte, recursos, miniaturas de las fotos, las tres firmas con su trazo y
//    una hoja de evidencia (firmantes, IP, dispositivo, hashes y eventos). Lo sube a una
//    ruta propia sin sobrescribir y lo registra con un compare-and-set: si otra petición
//    publicó primero, borra su archivo y devuelve el registrado (`_shared/publishPdf.ts`).
//
// Respuestas: 200 { url, sha256, generatedAt }, 400 datos inválidos, 401 sin sesión,
// 404 solicitud no visible, 409 solicitud no aprobada, 500 error interno.
import { json, serviceClient, userClient } from '../_shared/clients.ts'
import { pdfPath, publishPdf, toArrayBufferBytes } from '../_shared/publishPdf.ts'

import { buildPdf, type EventRow, type FrozenContent, type SignatureRow } from './pdf.ts'

const SIGNED_URL_SECONDS = 300

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Inicia sesión para descargar el reporte' }, 401)

  let caseId: string
  try {
    const body = await request.json()
    caseId = String(body?.caseId ?? '')
  } catch {
    return json({ error: 'Solicitud inválida' }, 400)
  }
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) return json({ error: 'Solicitud inválida' }, 400)

  try {
    // 1. Visibilidad con la sesión del usuario.
    const asUser = userClient(authorization)
    const { data: visibleCase, error: caseError } = await asUser
      .from('cases')
      .select('id, organization_id, case_number, status')
      .eq('id', caseId)
      .maybeSingle()
    if (caseError) throw caseError
    if (!visibleCase) return json({ error: 'Solicitud no encontrada' }, 404)
    if (visibleCase.status !== 'aprobado') {
      return json({ error: 'El PDF se genera cuando la solicitud está aprobada' }, 409)
    }

    const service = serviceClient()
    const { data: version, error: versionError } = await service
      .from('case_report_versions')
      .select('id, version_number, content, content_hash, pdf_path, pdf_sha256, pdf_generated_at')
      .eq('case_id', caseId)
      .eq('status', 'vigente')
      .single()
    if (versionError) throw versionError

    // 2. Ya existe: solo un enlace nuevo.
    if (version.pdf_path) {
      return json(
        await signedResponse(
          service,
          version.pdf_path,
          version.pdf_sha256,
          version.pdf_generated_at,
        ),
      )
    }

    // 3. Generar una sola vez.
    const [
      { data: signatures, error: signaturesError },
      { data: events, error: eventsError },
      { data: organization },
    ] = await Promise.all([
      service
        .from('case_signatures')
        .select(
          'signature_type, signer_id, signer_role, signed_at, stroke_path, consent_text, ip_address, user_agent, signature_hash',
        )
        .eq('version_id', version.id)
        .order('signed_at'),
      service
        .from('case_events')
        .select('action, actor_id, actor_role, comment, created_at')
        .eq('case_id', caseId)
        .order('id'),
      service.from('organizations').select('name').eq('id', visibleCase.organization_id).single(),
    ])
    if (signaturesError) throw signaturesError
    if (eventsError) throw eventsError

    const personIds = [
      ...new Set([
        ...(signatures ?? []).map((row) => row.signer_id),
        ...(events ?? []).map((row) => row.actor_id),
      ]),
    ]
    const { data: people, error: peopleError } = await service
      .from('profiles')
      .select('id, full_name')
      .in('id', personIds)
    if (peopleError) throw peopleError
    const names = new Map((people ?? []).map((person) => [person.id, person.full_name as string]))

    const content = version.content as FrozenContent
    const thumbnails = await loadThumbnails(service, content.fotos ?? [])
    const generatedAt = new Date().toISOString()
    const bytes = await buildPdf({
      organizationName: organization?.name ?? '',
      caseNumber: visibleCase.case_number,
      versionNumber: version.version_number,
      contentHash: version.content_hash,
      content,
      signatures: (signatures ?? []) as SignatureRow[],
      events: (events ?? []) as EventRow[],
      names,
      thumbnails,
      generatedAt,
    })

    const sha256 = await sha256Hex(bytes)
    const path = pdfPath(
      visibleCase.organization_id,
      caseId,
      version.version_number,
      crypto.randomUUID(),
    )
    const published = await publishPdf(
      {
        async upload(target, data) {
          const { error } = await service.storage
            .from('case-reports')
            .upload(target, toArrayBufferBytes(data), {
              contentType: 'application/pdf',
              upsert: false,
            })
          if (error) throw error
        },
        async remove(target) {
          await service.storage.from('case-reports').remove([target])
        },
        async claim(pdf) {
          const { data, error } = await service
            .from('case_report_versions')
            .update({
              pdf_path: pdf.path,
              pdf_size_bytes: pdf.sizeBytes,
              pdf_sha256: pdf.sha256,
              pdf_generated_at: pdf.generatedAt,
            })
            .eq('id', version.id)
            .is('pdf_path', null)
            .select('pdf_path, pdf_sha256, pdf_generated_at')
            .maybeSingle()
          if (error) throw error
          return data
            ? { path: data.pdf_path, sha256: data.pdf_sha256, generatedAt: data.pdf_generated_at }
            : null
        },
        async current() {
          const { data, error } = await service
            .from('case_report_versions')
            .select('pdf_path, pdf_sha256, pdf_generated_at')
            .eq('id', version.id)
            .single()
          if (error) throw error
          if (!data.pdf_path) return null
          return {
            path: data.pdf_path,
            sha256: data.pdf_sha256,
            generatedAt: data.pdf_generated_at,
          }
        },
      },
      { path, bytes, sha256, generatedAt },
    )
    return json(
      await signedResponse(service, published.path, published.sha256, published.generatedAt),
    )
  } catch (error) {
    console.error('generate-report-pdf', caseId, error instanceof Error ? error.message : error)
    return json({ error: 'No fue posible generar el reporte. Inténtalo de nuevo.' }, 500)
  }
})

async function signedResponse(
  service: ReturnType<typeof serviceClient>,
  path: string,
  sha256: string | null,
  generatedAt: string | null,
) {
  const { data, error } = await service.storage
    .from('case-reports')
    .createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error) throw error
  return { url: data.signedUrl, sha256, generatedAt }
}

async function loadThumbnails(
  service: ReturnType<typeof serviceClient>,
  photos: FrozenContent['fotos'],
): Promise<Array<{ tipo: 'antes' | 'despues'; bytes: Uint8Array | null }>> {
  return await Promise.all(
    photos.map(async (photo) => {
      const { data } = await service.storage.from('case-media').download(photo.miniatura)
      return { tipo: photo.tipo, bytes: data ? new Uint8Array(await data.arrayBuffer()) : null }
    }),
  )
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toArrayBufferBytes(bytes))
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}
