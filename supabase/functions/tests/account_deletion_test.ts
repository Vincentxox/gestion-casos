// Ejecutar con: node --experimental-strip-types --test supabase/functions/tests/
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isOwnPhotoFolder, ruleError } from '../_shared/accountDeletion.ts'

const org = '11111111-2222-3333-4444-555555555555'
const user = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

test('ruleError devuelve solo los errores de las reglas que la persona puede resolver', () => {
  assert.equal(
    ruleError('Pide que reasignen primero tus trabajos abiertos: CAS-2026-00009'),
    'Pide que reasignen primero tus trabajos abiertos: CAS-2026-00009',
  )
  assert.equal(
    ruleError('Nombra a otro administrador antes de eliminar tu cuenta'),
    'Nombra a otro administrador antes de eliminar tu cuenta',
  )
  assert.equal(ruleError('Acceso denegado'), null)
  assert.equal(ruleError('permission denied for function prepare_account_deletion'), null)
  assert.equal(ruleError(undefined), null)
})

test('isOwnPhotoFolder acepta solo la carpeta de la propia persona', () => {
  assert.equal(isOwnPhotoFolder(`${org}/${user}/`, user), true)
  assert.equal(isOwnPhotoFolder(`${org}/otra-persona/`, user), false)
  assert.equal(isOwnPhotoFolder(`${org}/${user}`, user), false)
  assert.equal(isOwnPhotoFolder(`${org}/${user}/foto.jpg`, user), false)
  assert.equal(isOwnPhotoFolder(`../${user}/`, user), false)
  assert.equal(isOwnPhotoFolder('', user), false)
})
