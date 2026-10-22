import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Icon } from '@/components/ui/Icon'
import { CaseCard } from '@/features/cases/components/CaseCard'
import type { CaseRecord } from '@/features/cases/types'
import type { MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { statusMeta } from '@/theme/statusMeta'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'
import type { RouteProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { CASE_CARD_GUIDE_LEGEND, getFaqFor, getTutorialFor, TUTORIAL_TITLES } from './helpContent'

const EXAMPLE_CASE = {
  id: 'guide-example',
  caseNumber: 'CAS-2026-00001',
  title: 'Fuga de agua en baño 2do piso',
  status: 'en_ejecucion',
  priority: 'media',
  location: 'Edificio B',
  assigneeName: 'Brandon',
  assignedTo: 'guide-assignee',
} as CaseRecord

export function HelpScreen({
  route,
  navigation,
}: {
  route?: RouteProp<MainTabParamList, 'Help'>
  navigation?: BottomTabNavigationProp<MainTabParamList, 'Help'>
} = {}) {
  const role = useAuthStore((state) => state.profile?.role)
  const [query, setQuery] = useState('')
  const [openStep, setOpenStep] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  useEffect(() => {
    if (!navigation) return
    return navigation.addListener('blur', () => navigation.setParams({ section: undefined }))
  }, [navigation])
  if (!role) return null

  const steps = getTutorialFor(role, query)
  const faqs = getFaqFor(role, query)
  const nothingFound = query.trim().length > 0 && steps.length === 0 && faqs.length === 0

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          Ayuda
        </Text>
        {route?.params?.section === 'case-card' && !query.trim() ? <CaseCardGuide /> : null}
        <View style={styles.search}>
          <Icon name="search" size="inline" color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Buscar en la ayuda"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="¿Qué necesitas saber?"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
        </View>

        {nothingFound ? (
          <Text style={styles.empty}>
            No encontramos nada sobre «{query.trim()}». Prueba con otra palabra.
          </Text>
        ) : null}

        {route?.params?.section !== 'case-card' && !query.trim() ? <CaseCardGuide /> : null}

        {steps.length > 0 ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {TUTORIAL_TITLES[role]}
            </Text>
            <View>
              <View style={styles.spine} />
              {steps.map((step, index) => {
                const open = openStep === step.id
                return (
                  <Pressable
                    key={step.id}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={`Paso ${index + 1}: ${step.title}`}
                    onPress={() => setOpenStep(open ? null : step.id)}
                    style={styles.step}
                  >
                    <View style={[styles.stepDot, index === 0 && styles.stepDotFirst]}>
                      <Text style={[styles.stepNumber, index === 0 && styles.stepNumberFirst]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.stepCopy}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      {open ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
                    </View>
                    <Icon
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size="inline"
                      color={colors.textMuted}
                    />
                  </Pressable>
                )
              })}
            </View>
          </View>
        ) : null}

        {faqs.length > 0 ? (
          <View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Preguntas frecuentes
            </Text>
            {faqs.map((faq) => {
              const open = openFaq === faq.id
              return (
                <View key={faq.id} style={styles.faq}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenFaq(open ? null : faq.id)}
                    style={styles.faqQuestion}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Text
                      importantForAccessibility="no"
                      style={[styles.faqSign, open && styles.faqSignOpen]}
                    >
                      +
                    </Text>
                  </Pressable>
                  {open ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
                </View>
              )
            })}
          </View>
        ) : null}

        <View style={styles.contact}>
          <View style={styles.contactIcon}>
            <Icon name="chatbubble-outline" size="base" color={colors.primaryDark} />
          </View>
          <View style={styles.contactCopy}>
            <Text style={styles.contactTitle}>¿Sigues con dudas?</Text>
            <Text style={styles.contactText}>Escribe al administrador de tu empresa.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function CaseCardGuide() {
  const exampleDate = new Date()
  exampleDate.setHours(9, 40, 0, 0)
  return (
    <View accessibilityLabel="Cómo leer una solicitud" style={styles.guide}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Cómo leer una solicitud
      </Text>
      <CaseCard item={{ ...EXAMPLE_CASE, createdAt: exampleDate.toISOString() }} guideMarkers />
      <Text style={styles.guideCopy}>
        <Text style={styles.guideNumber}>1</Text> Qué se pidió y cuándo.{' '}
        <Text style={styles.guideNumber}>2</Text> En qué va y dónde es.{' '}
        <Text style={styles.guideNumber}>3</Text> Cuánto falta: los 5 pasos son pedir, aceptar,
        hacer el trabajo, revisar y aprobar. <Text style={styles.guideNumber}>4</Text> Quién la
        atiende.
      </Text>
      <View style={styles.legend}>
        {CASE_CARD_GUIDE_LEGEND.map((entry) => {
          const phase = phaseColors[entry.phase]
          return (
            <View key={entry.phase} style={styles.legendRow}>
              <View style={[styles.legendBadge, { backgroundColor: phase.bg }]}>
                <Icon name={statusMeta[entry.status].icon} color={phase.fg} size={14} />
                <Text style={[styles.legendBadgeText, { color: phase.fg }]}>{entry.label}</Text>
              </View>
              <Text style={styles.legendMeaning}>{entry.meaning}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    gap: spacing.roomy,
    paddingHorizontal: spacing.compact,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    color: colors.ink,
  },
  search: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.base,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: { ...typography.body, flex: 1, minHeight: 48, color: colors.text },
  empty: { ...typography.body, color: colors.textMuted },
  section: { gap: spacing.xs },
  sectionTitle: {
    ...typography.heading,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    color: colors.ink,
    paddingBottom: spacing.sm,
  },
  spine: {
    position: 'absolute',
    left: 13,
    top: 30,
    bottom: 30,
    width: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
  },
  step: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.sm,
  },
  stepDot: {
    width: 29,
    height: 29,
    alignSelf: 'flex-start',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.track,
    backgroundColor: colors.background,
  },
  stepDotFirst: { borderWidth: 3, borderColor: colors.sky },
  stepNumber: { ...typography.caption, fontFamily: fonts.bold, color: colors.textMuted },
  stepNumberFirst: { color: colors.ink },
  stepCopy: { flex: 1, gap: spacing.xs },
  stepTitle: { ...typography.body, fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  stepDetail: { ...typography.body, color: colors.textMuted },
  faq: { borderBottomWidth: 1, borderBottomColor: colors.track },
  faqQuestion: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
  },
  faqQuestionText: {
    ...typography.body,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  faqSign: { fontFamily: fonts.regular, fontSize: 26, lineHeight: 28, color: colors.primary },
  faqSignOpen: { transform: [{ rotate: '45deg' }] },
  faqAnswer: {
    ...typography.body,
    color: colors.textMuted,
    paddingRight: spacing.xl,
    paddingBottom: spacing.md,
  },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  contactIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  contactCopy: { flex: 1, gap: 2 },
  contactTitle: { ...typography.body, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  contactText: { ...typography.body, color: colors.textMuted },
  guide: { gap: spacing.base },
  guideCopy: { ...typography.body, color: colors.textMuted },
  guideNumber: { fontFamily: fonts.bold, color: colors.textMuted },
  legend: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  legendRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.track,
  },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  legendBadgeText: { ...typography.caption, fontFamily: fonts.bold },
  legendMeaning: { ...typography.body, flex: 1, fontSize: 14, color: colors.textMuted },
})
