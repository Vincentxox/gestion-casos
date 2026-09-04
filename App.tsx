import { StatusBar } from 'expo-status-bar'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { hasPublicEnvironmentConfiguration } from '@/config/env'
import { colors, radius, spacing } from '@/theme/tokens'

const foundationItems = [
  {
    title: 'Aplicación multiplataforma',
    description: 'Expo SDK 57 preparado para Android y iOS.',
  },
  {
    title: 'Código confiable',
    description: 'TypeScript estricto, ESLint, Prettier y pruebas automatizadas.',
  },
  {
    title: 'Arquitectura escalable',
    description: 'Configuración, servicios y tema separados por responsabilidad.',
  },
] as const

export default function App() {
  const isSupabaseConfigured = hasPublicEnvironmentConfiguration()

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandMark}>
            <Text style={styles.brandInitials}>GC</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>BASE DEL PROYECTO</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Gestión de Casos
            </Text>
            <Text style={styles.subtitle}>
              Preparación técnica lista para construir los módulos del MVP.
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusDot} />
              <Text style={styles.statusTitle}>Etapa 1 completada</Text>
            </View>
            <Text style={styles.statusText}>
              Entorno validado y compatible con Expo Go, Android e iOS.
            </Text>
          </View>

          <View style={styles.foundationList}>
            {foundationItems.map((item, index) => (
              <View key={item.title} style={styles.foundationItem}>
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.integrationCard}>
            <Text style={styles.integrationLabel}>INTEGRACIÓN</Text>
            <View style={styles.integrationRow}>
              <Text style={styles.integrationTitle}>Supabase</Text>
              <Text
                accessibilityLabel={
                  isSupabaseConfigured ? 'Supabase configurado' : 'Supabase pendiente de configurar'
                }
                style={[
                  styles.integrationStatus,
                  isSupabaseConfigured ? styles.statusReady : styles.statusPending,
                ]}
              >
                {isSupabaseConfigured ? 'Configurado' : 'Pendiente'}
              </Text>
            </View>
            <Text style={styles.integrationText}>
              Las credenciales públicas se leen desde variables locales y nunca se muestran en
              pantalla.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brandMark: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  brandInitials: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  heading: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  statusCard: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statusText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  foundationList: {
    gap: spacing.md,
  },
  foundationItem: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  itemNumber: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  itemNumberText: {
    color: colors.primary,
    fontWeight: '800',
  },
  itemContent: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  itemDescription: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  integrationCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  integrationLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  integrationTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  integrationStatus: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '800',
  },
  statusReady: {
    backgroundColor: colors.successSoft,
    color: colors.success,
  },
  statusPending: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
  },
  integrationText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
})
