// Publicación atómica del PDF de una versión (sin dependencias de Deno ni de Supabase).
//
// Cada generación sube su PDF a una ruta propia y nunca sobrescribe (`upsert: false`).
// Después intenta registrarlo en la versión con un compare-and-set (`pdf_path is null`).
// Solo una generación gana; las demás borran su archivo y devuelven el registrado. Así
// el archivo descargado siempre coincide con el `pdf_sha256` guardado.
//
// Un archivo solo se borra cuando se comprobó que hay otro PDF registrado. Si el
// registro falla (por ejemplo, la base lo guardó pero se perdió la respuesta), se
// consulta qué quedó registrado antes de decidir; ante cualquier duda el archivo se
// conserva: un archivo huérfano es preferible a borrar el PDF registrado.

export interface PublishedPdf {
  path: string
  sha256: string
  generatedAt: string
}

export interface PdfStore {
  // Sube sin sobrescribir; debe fallar si la ruta ya existe.
  upload(path: string, bytes: Uint8Array): Promise<void>
  remove(path: string): Promise<void>
  // Registra el PDF solo si la versión aún no tiene uno; devuelve null si perdió.
  claim(pdf: PublishedPdf & { sizeBytes: number }): Promise<PublishedPdf | null>
  // Lee el PDF registrado en la versión, o null si todavía no tiene.
  current(): Promise<PublishedPdf | null>
}

export function pdfPath(
  organizationId: string,
  caseId: string,
  versionNumber: number,
  generationId: string,
): string {
  return `${organizationId}/${caseId}/v${versionNumber}/${generationId}.pdf`
}

export async function publishPdf(
  store: PdfStore,
  input: { path: string; bytes: Uint8Array; sha256: string; generatedAt: string },
): Promise<PublishedPdf> {
  await store.upload(input.path, input.bytes)
  let winner: PublishedPdf | null
  try {
    winner = await store.claim({
      path: input.path,
      sha256: input.sha256,
      generatedAt: input.generatedAt,
      sizeBytes: input.bytes.byteLength,
    })
  } catch (claimError) {
    // Resultado incierto: se comprueba qué quedó registrado. Si falla la consulta, se
    // propaga el error sin borrar nada.
    const registered = await store.current()
    if (registered?.path === input.path) return registered
    if (registered) {
      // Otra generación está registrada: este archivo seguro no lo está.
      await store.remove(input.path).catch(() => {})
      return registered
    }
    // Nada registrado todavía, pero la escritura podría seguir en curso y confirmarse
    // después: se conserva el archivo y se propaga el error para que se reintente.
    throw claimError
  }
  if (winner) return winner
  // Otra generación registró primero: se descarta este archivo.
  const registered = await store.current()
  if (!registered) throw new Error('No se encontró el PDF registrado')
  if (registered.path !== input.path) await store.remove(input.path).catch(() => {})
  return registered
}

// Copia a un `Uint8Array` respaldado por `ArrayBuffer` (lo exigen `crypto.subtle` y los
// tipos de TypeScript 5.7+).
export function toArrayBufferBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}
