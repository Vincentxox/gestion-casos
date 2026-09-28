// Edge Function `cleanup-photos` (T-904; docs/BUSINESS_RULES.md, sección 7.1).
//
// La ejecuta una tarea programada cada hora con la cabecera `x-cron-secret`. Borra las
// reservas de fotos que nunca se confirmaron (más de 24 horas): primero sus archivos en
// Storage y después las filas. Las fotos confirmadas no se tocan. Se despliega sin
// verificación de JWT (`--no-verify-jwt`): la autorización es el secreto compartido.
import { json, serviceClient } from '../_shared/clients.ts'
import { safeEqual } from '../_shared/push.ts'

const BATCH_SIZE = 200

Deno.serve(async (request) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || !safeEqual(request.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'No autorizado' }, 401)
  }

  const service = serviceClient()
  try {
    const { data, error } = await service.rpc('claim_stale_photo_reservations', {
      batch_size: BATCH_SIZE,
    })
    if (error) throw error
    const stale = (data ?? []) as Array<{ id: string; image_path: string; thumb_path: string }>
    if (stale.length === 0) return json({ removed: 0 })

    const paths = stale.flatMap((photo) => [photo.image_path, photo.thumb_path])
    const { error: storageError } = await service.storage.from('case-media').remove(paths)
    if (storageError) throw storageError

    const { error: deleteError } = await service
      .from('case_photos')
      .delete()
      .in(
        'id',
        stale.map((photo) => photo.id),
      )
      .is('confirmed_at', null)
    if (deleteError) throw deleteError

    return json({ removed: stale.length })
  } catch (error) {
    console.error('cleanup-photos', error instanceof Error ? error.message : error)
    return json({ error: 'No fue posible limpiar las reservas' }, 500)
  }
})
