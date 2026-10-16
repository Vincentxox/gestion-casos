/** Returns business messages from RPCs without exposing technical database errors. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const { code, message } = error
    if (typeof code === 'string' && typeof message === 'string') {
      return code === 'P0001' ? message : fallback
    }
  }

  return error instanceof Error ? error.message : fallback
}
