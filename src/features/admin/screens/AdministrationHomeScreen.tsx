import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { AdministrationStackParamList } from '@/navigation/types'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = NativeStackScreenProps<AdministrationStackParamList, 'AdministrationHome'>

const OPTIONS = [
  {
    route: 'Users' as const,
    icon: 'people-outline' as const,
    title: 'Usuarios',
    description: 'Consulta el personal y asigna su área responsable.',
  },
  {
    route: 'Areas' as const,
    icon: 'business-outline' as const,
    title: 'Áreas',
    description: 'Organiza los departamentos que atenderán los casos.',
  },
  {
    route: 'Categories' as const,
    icon: 'pricetags-outline' as const,
    title: 'Categorías',
    description: 'Clasifica las solicitudes dentro de cada área.',
  },
]

export function AdministrationHomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CONFIGURACIÓN</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Administrar
          </Text>
          <Text style={styles.subtitle}>
            Gestiona la estructura utilizada para clasificar casos.
          </Text>
        </View>

        {OPTIONS.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.route}
            onPress={() => navigation.navigate(option.route)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.iconContainer}>
              <Ionicons color={colors.primary} name={option.icon} size={26} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <Ionicons color={colors.primary} name="chevron-forward" size={24} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.75 },
  iconContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
})
