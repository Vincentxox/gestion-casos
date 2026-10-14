import type { Database as GeneratedDatabase } from './database.types'

/**
 * Ajustes a los tipos generados por Supabase.
 *
 * - Columnas que un trigger completa en el servidor (empresa, autor, número del caso…):
 *   el cliente no las envía, así que son opcionales al insertar.
 * - Parámetros de RPC que aceptan `null`: el generador los marca siempre como obligatorios
 *   y no nulos.
 *
 * `database.types.ts` se genera desde el proyecto de Supabase con
 * `npx supabase gen types typescript --project-id <id> > src/services/supabase/database.types.ts`
 * y después `npx prettier --write src/services/supabase/database.types.ts`.
 * Al regenerarlo, revisa que estas listas sigan coincidiendo con las
 * migraciones.
 */
type ServerFilledColumns = {
  areas: 'organization_id'
  case_reports: 'organization_id' | 'updated_by'
  case_resource_usages: 'organization_id' | 'registered_by'
  cases: 'case_number' | 'created_by' | 'organization_id' | 'requesting_area_id' | 'target_area_id'
  categories: 'organization_id'
  organization_invitations: 'organization_id'
  resources: 'organization_id'
}

type NullableRpcArgs = {
  approve_access_request: 'new_area_id'
  reject_access_request: 'note'
  set_member_access: 'new_area_id'
  transition_case: 'action_comment'
}

type GeneratedPublic = GeneratedDatabase['public']
type GeneratedTables = GeneratedPublic['Tables']
type GeneratedFunctions = GeneratedPublic['Functions']

type Simplify<T> = { [K in keyof T]: T[K] } & {}

type OptionalKeys<T, K extends keyof T> = Simplify<Omit<T, K> & Partial<Pick<T, K>>>

type NullableKeys<T, K extends keyof T> = Simplify<Omit<T, K> & { [P in K]: T[P] | null }>

type Tables = {
  [T in keyof GeneratedTables]: T extends keyof ServerFilledColumns
    ? {
        Row: GeneratedTables[T]['Row']
        Insert: OptionalKeys<
          GeneratedTables[T]['Insert'],
          Extract<ServerFilledColumns[T], keyof GeneratedTables[T]['Insert']>
        >
        Update: GeneratedTables[T]['Update']
        Relationships: GeneratedTables[T]['Relationships']
      }
    : GeneratedTables[T]
}

type Functions = {
  [F in keyof GeneratedFunctions]: F extends keyof NullableRpcArgs
    ? {
        Args: NullableKeys<
          GeneratedFunctions[F]['Args'],
          Extract<NullableRpcArgs[F], keyof GeneratedFunctions[F]['Args']>
        >
        Returns: GeneratedFunctions[F]['Returns']
      }
    : GeneratedFunctions[F]
}

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedPublic, 'Tables' | 'Functions'> & {
    Tables: Tables
    Functions: Functions
  }
}
