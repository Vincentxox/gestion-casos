// Edge Function `delete-account` (contrato C-024; requisito de Google Play).
//
// La app la llama con la sesión del usuario: `POST` sin cuerpo.
// 1. Con la sesión del usuario llama a `prepare_account_deletion`, que aplica las reglas y
//    deja el perfil sin datos personales en una sola transacción.
// 2. Borra los archivos de su carpeta en `profile-photos`.
// 3. Borra su usuario de Auth en modo suave: el correo y el teléfono quedan ofuscados y el
//    correo se puede volver a registrar. Las filas que la empresa conserva siguen apuntando
//    a su identificador.
// Si falla el paso 2 o 3, la persona puede reintentar: el paso 1 ya no cambia nada.
//
// Respuestas: 200 { deleted: true }, 401 sin sesión, 409 una regla lo impide (mensaje en
// español), 500 error interno.
import { json, serviceClient, userClient } from '../_shared/clients.ts'
import { isOwnPhotoFolder, ruleError } from '../_shared/accountDeletion.ts'

const PHOTO_BUCKET = 'profile-photos'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Inicia sesión para eliminar tu cuenta' }, 401)

  try {
    const asUser = userClient(authorization)
    const { data: auth, error: authError } = await asUser.auth.getUser()
    if (authError || !auth.user)
      return json({ error: 'Inicia sesión para eliminar tu cuenta' }, 401)
    const userId = auth.user.id

    // 1. Perfil y reglas.
    const { data: folder, error: prepareError } = await asUser.rpc('prepare_account_deletion')
    if (prepareError) {
      const message = ruleError(prepareError.message)
      if (message) return json({ error: message }, 409)
      throw prepareError
    }

    const service = serviceClient()

    // 2. Fotos de perfil.
    if (typeof folder === 'string' && isOwnPhotoFolder(folder, userId)) {
      const { data: files, error: listError } = await service.storage
        .from(PHOTO_BUCKET)
        .list(folder.slice(0, -1), { limit: 1000 })
      if (listError) throw listError
      const paths = (files ?? []).map((file) => `${folder}${file.name}`)
      if (paths.length > 0) {
        const { error: removeError } = await service.storage.from(PHOTO_BUCKET).remove(paths)
        if (removeError) throw removeError
      }
    }

    // 3. Usuario de Auth.
    const { error: deleteError } = await service.auth.admin.deleteUser(userId, true)
    if (deleteError) throw deleteError

    return json({ deleted: true })
  } catch (error) {
    console.error('delete-account', error instanceof Error ? error.message : error)
    return json({ error: 'No fue posible eliminar tu cuenta. Inténtalo de nuevo.' }, 500)
  }
})
