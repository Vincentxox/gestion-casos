// Edge Function `generate-report-pdf` (T-904; docs/BUSINESS_RULES.md, sección 9).
//
// La app la llama con la sesión del usuario: `POST { caseId }`.
// 1. Con la sesión del usuario comprueba que puede ver la solicitud (RLS) y que está
//    aprobada.
// 2. Si la versión vigente ya tiene PDF, devuelve un enlace firmado de 5 minutos.
// 3. Si no, genera el PDF una sola vez a partir del contenido congelado y firmado:
//    datos, reporte, recursos, miniaturas de las fotos, las tres firmas con su trazo y
//    una hoja de evidencia (firmantes, IP, dispositivo, hashes y eventos). Lo sube a una
//    ruta propia sin sobrescribir y lo registra con un compare-and-set: si otra petición
//    publicó primero, borra su archivo y devuelve el registrado (`_shared/publishPdf.ts`).
//
// Respuestas: 200 { url, sha256, generatedAt }, 400 datos inválidos, 401 sin sesión,
// 404 solicitud no visible, 409 solicitud no aprobada, 500 error interno.
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'npm:pdf-lib@1.17.1'

import { json, serviceClient, userClient } from '../_shared/clients.ts'
import { pdfPath, publishPdf, toArrayBufferBytes } from '../_shared/publishPdf.ts'
import {
  ACTION_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
  SIGNATURE_LABELS,
  describeUsage,
  fitStroke,
  formatDateTime,
  svgPathBounds,
  toWinAnsi,
  verificationCode,
  wrapText,
} from '../_shared/pdfText.ts'

const SIGNED_URL_SECONDS = 300
const PAGE = { width: 612, height: 792, margin: 48 } // Carta
const COLORS = {
  text: rgb(0.09, 0.17, 0.3),
  muted: rgb(0.37, 0.42, 0.52),
  line: rgb(0.84, 0.87, 0.91),
  brand: rgb(0.03, 0.37, 0.68),
  soft: rgb(0.96, 0.97, 0.98),
}

interface FrozenContent {
  version: number
  solicitud: Record<string, string | null>
  fechas: Record<string, string | null>
  reporte: Record<string, string | null>
  recursos: Array<Record<string, string | number | null>>
  fotos: Array<{ id: string; tipo: 'antes' | 'despues'; miniatura: string }>
}

interface SignatureRow {
  signature_type: string
  signer_id: string
  signer_role: string
  signed_at: string
  stroke_path: string
  consent_text: string
  ip_address: string | null
  user_agent: string | null
  signature_hash: string
}

interface EventRow {
  action: string
  actor_id: string
  actor_role: string
  comment: string | null
  created_at: string
}

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

// ---------------------------------------------------------------------------
// Composición del PDF
// ---------------------------------------------------------------------------

interface PdfInput {
  organizationName: string
  caseNumber: string
  versionNumber: number
  contentHash: string
  content: FrozenContent
  signatures: SignatureRow[]
  events: EventRow[]
  names: Map<string, string>
  thumbnails: Array<{ tipo: 'antes' | 'despues'; bytes: Uint8Array | null }>
  generatedAt: string
}

class Writer {
  page!: PDFPage
  y = 0
  readonly width = PAGE.width - PAGE.margin * 2

  constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.addPage()
  }

  addPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height])
    this.y = PAGE.height - PAGE.margin
  }

  ensure(height: number) {
    if (this.y - height < PAGE.margin + 24) this.addPage()
  }

  text(
    value: string,
    options: {
      size?: number
      bold?: boolean
      color?: ReturnType<typeof rgb>
      indent?: number
    } = {},
  ) {
    const size = options.size ?? 10
    const font = options.bold ? this.bold : this.regular
    const indent = options.indent ?? 0
    const lines = wrapText(toWinAnsi(value), this.width - indent, (line) =>
      font.widthOfTextAtSize(line, size),
    )
    for (const line of lines) {
      this.ensure(size + 4)
      this.page.drawText(line, {
        x: PAGE.margin + indent,
        y: this.y - size,
        size,
        font,
        color: options.color ?? COLORS.text,
      })
      this.y -= size + 4
    }
  }

  heading(value: string) {
    this.ensure(30)
    this.y -= 8
    this.text(value, { size: 13, bold: true, color: COLORS.brand })
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y + 1 },
      end: { x: PAGE.width - PAGE.margin, y: this.y + 1 },
      thickness: 0.8,
      color: COLORS.line,
    })
    this.y -= 6
  }

  field(label: string, value: string | null | undefined) {
    this.text(label.toUpperCase(), { size: 7.5, bold: true, color: COLORS.muted })
    this.text(value?.trim() ? value : '—', { size: 10 })
    this.y -= 3
  }

  gap(value = 6) {
    this.y -= value
  }
}

async function buildPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Reporte ${input.caseNumber} v${input.versionNumber}`)
  doc.setAuthor(toWinAnsi(input.organizationName))
  doc.setCreator('Nexo Casos')
  doc.setProducer('Nexo Casos')
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const w = new Writer(doc, regular, bold)
  const { content } = input
  const code = verificationCode(input.contentHash)

  // Encabezado
  w.text(input.organizationName || 'Nexo Casos', { size: 9, bold: true, color: COLORS.muted })
  w.text('Reporte de cierre', { size: 20, bold: true })
  w.text(`${input.caseNumber} · Versión ${input.versionNumber} · Aprobada`, {
    size: 11,
    color: COLORS.muted,
  })
  w.text(`Código de verificación: ${code}`, { size: 10, bold: true, color: COLORS.brand })
  w.gap(4)

  // Solicitud
  const s = content.solicitud ?? {}
  w.heading('Solicitud')
  w.field('Título', s.titulo)
  w.field('Descripción', s.descripcion)
  w.field('Tipo de servicio', s.tipo_servicio)
  w.field(
    'Área solicitante → área técnica',
    `${s.area_solicitante ?? '—'} → ${s.area_destino ?? '—'}`,
  )
  w.field('Ubicación', s.ubicacion)
  w.field('Prioridad', PRIORITY_LABELS[s.prioridad ?? ''] ?? s.prioridad)
  w.field('Solicitada por', s.creada_por)
  w.field('Técnico responsable', s.tecnico)

  const f = content.fechas ?? {}
  w.heading('Fechas')
  w.field('Creada', formatDateTime(f.creada))
  w.field('Aceptada', formatDateTime(f.aceptada))
  w.field('Inicio del trabajo', formatDateTime(f.iniciada))
  w.field('Reporte enviado', formatDateTime(f.enviada))

  // Reporte
  const r = content.reporte ?? {}
  w.heading('Reporte del trabajo')
  w.field('Diagnóstico', r.diagnostico)
  w.field('Trabajo realizado', r.trabajo_realizado)
  w.field('Causa', r.causa)
  w.field('Observaciones', r.observaciones)

  // Recursos
  w.heading('Recursos y mano de obra')
  if (!content.recursos?.length) w.text('Sin recursos registrados.', { color: COLORS.muted })
  for (const usage of content.recursos ?? []) {
    const name =
      usage.tipo === 'mano_de_obra'
        ? `Mano de obra · ${usage.tecnico ?? ''}`
        : String(usage.recurso ?? '')
    w.text(`• ${name} — ${describeUsage(usage as Parameters<typeof describeUsage>[0])}`)
    if (usage.notas) w.text(String(usage.notas), { size: 9, color: COLORS.muted, indent: 10 })
  }

  // Fotos (miniaturas: el PDF queda liviano; las originales siguen en Storage)
  await drawPhotos(w, doc, input.thumbnails)

  // Firmas
  w.heading('Firmas')
  const boxWidth = (w.width - 16) / 3
  const boxHeight = 70
  w.ensure(boxHeight + 60)
  const top = w.y
  for (const [index, type] of ['ejecucion', 'validacion_tecnica', 'conformidad'].entries()) {
    const signature = input.signatures.find((row) => row.signature_type === type)
    const left = PAGE.margin + index * (boxWidth + 8)
    w.page.drawRectangle({
      x: left,
      y: top - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: COLORS.line,
      borderWidth: 0.8,
      color: COLORS.soft,
    })
    if (signature) {
      const bounds = svgPathBounds(signature.stroke_path)
      if (bounds) {
        const placement = fitStroke(bounds, { left, top, width: boxWidth, height: boxHeight })
        w.page.drawSvgPath(signature.stroke_path, {
          x: placement.x,
          y: placement.y,
          scale: placement.scale,
          borderColor: COLORS.text,
          borderWidth: Math.max(0.8 / placement.scale, 1),
        })
      }
    }
    const lines = [
      SIGNATURE_LABELS[type] ?? type,
      signature ? (input.names.get(signature.signer_id) ?? '—') : 'Sin firma',
      signature
        ? `${ROLE_LABELS[signature.signer_role] ?? signature.signer_role} · ${formatDateTime(signature.signed_at)}`
        : '',
    ]
    lines.forEach((line, lineIndex) => {
      w.page.drawText(toWinAnsi(line), {
        x: left,
        y: top - boxHeight - 12 - lineIndex * 11,
        size: lineIndex === 0 ? 8.5 : 8,
        font: lineIndex === 0 ? bold : regular,
        color: lineIndex === 0 ? COLORS.brand : COLORS.text,
        maxWidth: boxWidth,
      })
    })
  }
  w.y = top - boxHeight - 48

  // Hoja de evidencia
  w.addPage()
  w.text('Hoja de evidencia', { size: 18, bold: true })
  w.text(
    'Firma electrónica simple (Decreto 47-2008). Fechas y horas del servidor, en hora de Guatemala. La IP y el dispositivo los registró el servidor.',
    { size: 9, color: COLORS.muted },
  )
  w.heading('Integridad del contenido')
  w.field('Hash SHA-256 de la versión firmada', input.contentHash)
  w.field('Código de verificación', code)
  w.field('Versión', String(input.versionNumber))

  w.heading('Firmas registradas')
  for (const signature of input.signatures) {
    w.text(
      `${SIGNATURE_LABELS[signature.signature_type] ?? signature.signature_type} — ${input.names.get(signature.signer_id) ?? '—'} (${ROLE_LABELS[signature.signer_role] ?? signature.signer_role})`,
      { bold: true },
    )
    w.text(
      `Fecha: ${formatDateTime(signature.signed_at)} · IP: ${signature.ip_address ?? 'no disponible'}`,
      { size: 9, indent: 10 },
    )
    w.text(`Dispositivo: ${signature.user_agent ?? 'no disponible'}`, { size: 9, indent: 10 })
    w.text(`Consentimiento: «${signature.consent_text}»`, { size: 9, indent: 10 })
    w.text(`Hash de la firma: ${signature.signature_hash}`, {
      size: 8,
      color: COLORS.muted,
      indent: 10,
    })
    w.gap(4)
  }

  w.heading('Historial de la solicitud')
  for (const event of input.events) {
    const who = input.names.get(event.actor_id) ?? '—'
    w.text(
      `${formatDateTime(event.created_at)} · ${who} (${ROLE_LABELS[event.actor_role] ?? event.actor_role}) · ${ACTION_LABELS[event.action] ?? event.action}`,
      { size: 9 },
    )
    if (event.comment) w.text(`«${event.comment}»`, { size: 8.5, color: COLORS.muted, indent: 10 })
  }
  w.gap(8)
  w.text(`Generado por Nexo Casos el ${formatDateTime(input.generatedAt)}.`, {
    size: 8,
    color: COLORS.muted,
  })

  // Pie de página en todas las hojas
  const pages = doc.getPages()
  pages.forEach((page, index) => {
    page.drawText(
      toWinAnsi(
        `${input.caseNumber} · v${input.versionNumber} · Código ${code} · Página ${index + 1} de ${pages.length}`,
      ),
      {
        x: PAGE.margin,
        y: PAGE.margin - 20,
        size: 7.5,
        font: regular,
        color: COLORS.muted,
      },
    )
  })

  return await doc.save()
}

async function drawPhotos(
  w: Writer,
  doc: PDFDocument,
  thumbnails: Array<{ tipo: 'antes' | 'despues'; bytes: Uint8Array | null }>,
) {
  w.heading('Fotos')
  if (thumbnails.length === 0) {
    w.text('Sin fotos.', { color: COLORS.muted })
    return
  }
  const columns = 3
  const cell = (w.width - (columns - 1) * 8) / columns
  for (const kind of ['antes', 'despues'] as const) {
    const group = thumbnails.filter((photo) => photo.tipo === kind)
    if (group.length === 0) continue
    w.text(kind === 'antes' ? 'Antes' : 'Después', { bold: true, size: 9, color: COLORS.muted })
    w.ensure(cell + 8)
    const top = w.y
    for (const [index, photo] of group.entries()) {
      const left = PAGE.margin + (index % columns) * (cell + 8)
      let image: PDFImage | null = null
      try {
        image = photo.bytes ? await doc.embedJpg(photo.bytes) : null
      } catch {
        image = null // WebP u otro formato: se muestra el recuadro vacío.
      }
      if (image) {
        const scale = Math.min(cell / image.width, cell / image.height)
        const width = image.width * scale
        const height = image.height * scale
        w.page.drawImage(image, { x: left + (cell - width) / 2, y: top - height, width, height })
      } else {
        w.page.drawRectangle({
          x: left,
          y: top - cell,
          width: cell,
          height: cell,
          borderColor: COLORS.line,
          borderWidth: 0.8,
        })
        w.page.drawText('Imagen no disponible', {
          x: left + 6,
          y: top - cell / 2,
          size: 8,
          font: w.regular,
          color: COLORS.muted,
        })
      }
    }
    w.y = top - cell - 10
  }
}
