import { useQuery } from '@tanstack/react-query'

export const profilePhotoQueryKey = ['profile-photo-url'] as const

export function useSignedProfilePhoto(path: string) {
  return useQuery({
    queryKey: [...profilePhotoQueryKey, path],
    queryFn: () => {
      // Evita cargar el cliente de Supabase en pantallas que solo muestran iniciales.
      const { getSignedProfilePhotoUrl } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./profilePhotoService') as typeof import('./profilePhotoService')
      return getSignedProfilePhotoUrl(path)
    },
    retry: false,
    staleTime: 240_000, // El enlace firmado dura 300 s; renovar con un minuto de margen.
  })
}
