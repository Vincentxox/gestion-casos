import { useEffect, useRef } from 'react'

import { ActionSheet } from '@/components/actions/ActionSheet'

export function CatalogActionSheet({
  name,
  active,
  visible,
  onClose,
  onEdit,
  onToggle,
}: {
  name: string
  active: boolean
  visible: boolean
  onClose: () => void
  onEdit: () => void
  onToggle: () => void
}) {
  const pendingAction = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (pendingAction.current) clearTimeout(pendingAction.current)
    },
    [],
  )

  return (
    <ActionSheet<'edit' | 'toggle'>
      title={`Opciones de ${name}`}
      actions={[
        { id: 'edit', label: 'Editar', icon: 'pencil-outline' },
        {
          id: 'toggle',
          label: active ? 'Desactivar' : 'Activar',
          icon: active ? 'close-circle-outline' : 'checkmark-circle-outline',
          destructive: active,
        },
      ]}
      visible={visible}
      onClose={onClose}
      onSelect={(action) => {
        onClose()
        // Espera a que cierre el modal antes de abrir el formulario o una alerta nativa.
        pendingAction.current = setTimeout(() => {
          if (action === 'edit') onEdit()
          else onToggle()
          pendingAction.current = null
        }, 300)
      }}
    />
  )
}
