import { useAuthStore } from '@/store/authStore'

/**
 * Expone el estado y las operaciones de autenticación al resto de la aplicación.
 */
export function useAuth() {
  return useAuthStore()
}
