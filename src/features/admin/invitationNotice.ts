import { ROLE_LABELS, type AppRole } from '@/features/auth/types'

// Configurar en el entorno de compilación cuando exista un enlace público estable.
export const APP_DOWNLOAD_URL = process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL?.trim() ?? ''

export function formatInvitationNotice({
  organizationName,
  role,
  email,
  downloadUrl = APP_DOWNLOAD_URL,
}: {
  organizationName: string
  role: AppRole
  email: string
  downloadUrl?: string
}): string {
  const lines = [
    `Te invitaron a ${organizationName.trim()} en Nexo Casos con el rol de ${ROLE_LABELS[role]}.`,
    `Regístrate con ${email.trim().toLowerCase()} y confirma ese correo para entrar a la empresa.`,
  ]

  const link = downloadUrl.trim()
  if (link) lines.push(`Descarga la app: ${link}`)

  lines.push('Si ya tienes cuenta, abre la app y toca Comprobar acceso.')
  return lines.join('\n\n')
}
