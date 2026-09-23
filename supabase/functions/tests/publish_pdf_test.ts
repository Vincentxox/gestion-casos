// Ejecutar con: node --experimental-strip-types --test supabase/functions/tests/*_test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { pdfPath, publishPdf, type PdfStore, type PublishedPdf } from '../_shared/publishPdf.ts'

// Almacén en memoria que imita Storage (sin sobrescritura) y el compare-and-set de la
// versión. Las operaciones ceden el turno para intercalar las generaciones.
function memoryStore() {
  const files = new Map<string, Uint8Array>()
  let registered: (PublishedPdf & { sizeBytes: number }) | null = null
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
  const store: PdfStore = {
    async upload(path, bytes) {
      await tick()
      if (files.has(path)) throw new Error('The resource already exists')
      files.set(path, bytes)
    },
    async remove(path) {
      await tick()
      files.delete(path)
    },
    async claim(pdf) {
      await tick()
      if (registered) return null
      registered = pdf
      return { path: pdf.path, sha256: pdf.sha256, generatedAt: pdf.generatedAt }
    },
    async current() {
      await tick()
      if (!registered) throw new Error('sin PDF')
      return {
        path: registered.path,
        sha256: registered.sha256,
        generatedAt: registered.generatedAt,
      }
    },
  }
  return { store, files, registered: () => registered }
}

test('dos generaciones simultáneas publican un solo PDF y el hash coincide con el archivo', async () => {
  const { store, files, registered } = memoryStore()
  const make = (id: string, byte: number) => ({
    path: pdfPath('org', 'case', 1, id),
    bytes: new Uint8Array([byte, byte, byte]),
    sha256: `hash-${id}`,
    generatedAt: `2026-09-23T00:00:0${byte}Z`,
  })
  const [first, second] = await Promise.all([
    publishPdf(store, make('a', 1)),
    publishPdf(store, make('b', 2)),
  ])

  assert.deepEqual(first, second)
  assert.equal(files.size, 1)
  const winner = registered()
  assert.ok(winner)
  assert.equal(first.path, winner.path)
  assert.equal(first.sha256, winner.sha256)
  // El archivo que queda es exactamente el del hash registrado.
  const byte = winner.path.endsWith('/a.pdf') ? 1 : 2
  assert.deepEqual(files.get(winner.path), new Uint8Array([byte, byte, byte]))
})

test('si el registro falla, se borra el archivo subido', async () => {
  const { store, files } = memoryStore()
  store.claim = async () => {
    throw new Error('sin conexión')
  }
  await assert.rejects(
    publishPdf(store, {
      path: pdfPath('org', 'case', 1, 'x'),
      bytes: new Uint8Array([1]),
      sha256: 'h',
      generatedAt: 't',
    }),
    /sin conexión/,
  )
  assert.equal(files.size, 0)
})

test('pdfPath usa una ruta por generación bajo la empresa y la solicitud', () => {
  assert.equal(pdfPath('o', 'c', 2, 'g1'), 'o/c/v2/g1.pdf')
})
