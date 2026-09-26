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
      if (!registered) return null
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

const input = (id: string) => ({
  path: pdfPath('org', 'case', 1, id),
  bytes: new Uint8Array([1]),
  sha256: `hash-${id}`,
  generatedAt: 't',
})

test('si la base registró el PDF pero se perdió la respuesta, se conserva y se devuelve', async () => {
  const { store, files, registered } = memoryStore()
  const claim = store.claim
  store.claim = async (pdf) => {
    await claim(pdf)
    throw new Error('conexión interrumpida')
  }
  const result = await publishPdf(store, input('x'))
  assert.equal(result.path, pdfPath('org', 'case', 1, 'x'))
  assert.equal(registered()?.path, result.path)
  assert.ok(files.has(result.path), 'el archivo registrado no se borra')
})

test('si el registro falla y hay otro PDF registrado, se borra solo el propio', async () => {
  const { store, files } = memoryStore()
  await publishPdf(store, input('primero'))
  store.claim = async () => {
    throw new Error('conexión interrumpida')
  }
  const result = await publishPdf(store, input('segundo'))
  assert.equal(result.path, pdfPath('org', 'case', 1, 'primero'))
  assert.deepEqual([...files.keys()], [pdfPath('org', 'case', 1, 'primero')])
})

test('si el registro falla sin nada registrado, se conserva el archivo y se informa el error', async () => {
  const { store, files } = memoryStore()
  store.claim = async () => {
    throw new Error('sin conexión')
  }
  await assert.rejects(publishPdf(store, input('x')), /sin conexión/)
  assert.ok(files.has(pdfPath('org', 'case', 1, 'x')))
})

test('si tampoco se puede consultar lo registrado, no se borra nada', async () => {
  const { store, files } = memoryStore()
  store.claim = async () => {
    throw new Error('sin conexión')
  }
  store.current = async () => {
    throw new Error('base no disponible')
  }
  await assert.rejects(publishPdf(store, input('x')), /base no disponible/)
  assert.ok(files.has(pdfPath('org', 'case', 1, 'x')))
})

test('pdfPath usa una ruta por generación bajo la empresa y la solicitud', () => {
  assert.equal(pdfPath('o', 'c', 2, 'g1'), 'o/c/v2/g1.pdf')
})
