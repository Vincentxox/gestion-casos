// Lógica de `delete-account` que no depende de Deno ni de Supabase, para probarla con Node.

// Errores de las reglas de `prepare_account_deletion` que la persona puede resolver: se
// devuelven tal cual con 409. Cualquier otro error es interno (500).
const RULE_ERRORS = [
  'Pide que reasignen primero tus trabajos abiertos',
  'Nombra a otro administrador antes de eliminar tu cuenta',
]

export function ruleError(message: string | undefined): string | null {
  if (!message) return null
  return RULE_ERRORS.some((rule) => message.startsWith(rule)) ? message : null
}

// La carpeta que devuelve la base es `<empresa>/<persona>/`. Se comprueba antes de borrar
// para no tocar nunca la carpeta de otra persona.
export function isOwnPhotoFolder(folder: string, userId: string): boolean {
  const parts = folder.split('/')
  return (
    parts.length === 3 &&
    /^[0-9a-f-]{36}$/i.test(parts[0] ?? '') &&
    parts[1] === userId &&
    parts[2] === ''
  )
}
