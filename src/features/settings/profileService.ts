import { supabase } from '@/services/supabase/client'

export async function updateOwnName(userId: string, name: string) {
  const fullName = name.trim()
  if (fullName.length < 2 || fullName.length > 120)
    throw new Error('Usa entre 2 y 120 caracteres para tu nombre.')
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)
  if (error) throw error
  return fullName
}
