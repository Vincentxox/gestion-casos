import { Ionicons } from '@expo/vector-icons'
import type { RouteProp } from '@react-navigation/native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { MaintenanceModuleParams, MaintenanceModuleSection } from '@/navigation/types'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = {
  route: RouteProp<{ MaintenanceModule: MaintenanceModuleParams }, 'MaintenanceModule'>
}

const DEFAULT_SECTIONS: MaintenanceModuleSection[] = ['Agregar', 'Ver lista', 'Editar']
const SECTION_ICONS = {
  Agregar: 'add-circle-outline',
  'Ver lista': 'list-outline',
  Editar: 'create-outline',
  Generar: 'document-text-outline',
  'Registrar avance': 'checkmark-circle-outline',
} as const

export function MaintenanceModuleScreen({ route }: Props) {
  const sections = route.params.sections ?? DEFAULT_SECTIONS
  const [section, setSection] = useState<MaintenanceModuleSection>('Ver lista')

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>MÓDULO</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {route.params.title}
        </Text>
        <View style={styles.preview}>
          <Ionicons color={colors.primary} name="construct-outline" size={42} />
          <Text style={styles.previewTitle}>{section}</Text>
          <Text style={styles.previewText}>
            Esta sección se conectará a la base de datos en una siguiente fase.
          </Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        {sections.map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === item }}
            key={item}
            onPress={() => setSection(item)}
            style={styles.bottomAction}
          >
            <Ionicons
              color={section === item ? colors.primary : colors.textMuted}
              name={SECTION_ICONS[item]}
              size={23}
            />
            <Text style={[styles.bottomLabel, section === item && styles.bottomLabelSelected]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, gap: spacing.sm, padding: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  preview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  previewTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  previewText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  bottomAction: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  bottomLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  bottomLabelSelected: { color: colors.primary },
})
