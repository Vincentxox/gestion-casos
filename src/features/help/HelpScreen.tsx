import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Icon } from '@/components/ui/Icon'
import { hasPermission } from '@/features/auth/permissions'
import { CaseCard } from '@/features/cases/components/CaseCard'
import type { CaseRecord } from '@/features/cases/types'
import type { MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { statusMeta } from '@/theme/statusMeta'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'
import type { RouteProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import {
  CASE_CARD_GUIDE_LEGEND,
  getFaqFor,
  getGuidesFor,
  getTutorialFor,
  TUTORIAL_TITLES,
  type QuickGuide,
} from './helpContent'
import { useGuidedTour } from './tour/useGuidedTour'

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
  const profile = useAuthStore((state) => state.profile)
  const role = profile?.role
  const [query, setQuery] = useState('')
  const [openGuide, setOpenGuide] = useState<QuickGuide | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const seen = useGuidedTour((state) => state.seen)
  const startTour = useGuidedTour((state) => state.start)
  useEffect(() => {
    if (!navigation) return
    return navigation.addListener('blur', () => navigation.setParams({ section: undefined }))
  }, [navigation])
  if (!role) return null

  const canCreate = hasPermission(role, 'cases.create') && Boolean(profile.areaId)
  const allSteps = getTutorialFor(role, '', canCreate)
  const steps = getTutorialFor(role, query, canCreate)
  const guides = getGuidesFor(role, query, canCreate)
  const faqs = getFaqFor(role, query)
  const seenCount = allSteps.filter((step) => seen.includes(step.id)).length
  const nextIndex = allSteps.findIndex((step) => !seen.includes(step.id))
  const nextStep = allSteps[nextIndex]
  const nothingFound =
    query.trim().length > 0 && steps.length === 0 && guides.length === 0 && faqs.length === 0
  const start = (index = Math.max(0, nextIndex), repeat = false) =>
    void startTour(allSteps, index, repeat)
  const openDestination = (guide: QuickGuide) => {
    setOpenGuide(null)
    if (!navigation) return
    if (guide.destination === 'invitations')
      navigation.navigate('Administration', { screen: 'Invitations', initial: false })
    else if (guide.destination === 'create')
      navigation.navigate('CasesTab', { screen: 'CreateCase', initial: false })
    else if (guide.destination === 'indicators')
      navigation.navigate('CasesTab', { screen: 'Indicators', initial: false })
    else
      navigation.navigate('CasesTab', {
        screen: 'Cases',
        params:
          guide.destination === 'my-work' && role === 'tecnico'
            ? { scope: 'mis_trabajos' }
            : undefined,
      })
  }

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
            placeholder="¿Qué quieres hacer?"
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

        {!query.trim() ? (
          <View style={styles.startCard}>
            <View style={styles.startRow}>
              <View style={styles.ring}>
                <Svg height={58} width={58}>
                  <Circle
                    cx={29}
                    cy={29}
                    r={23}
                    stroke={colors.textMuted}
                    strokeWidth={5}
                    fill="none"
                  />
                  <Circle
                    cx={29}
                    cy={29}
                    r={23}
                    stroke={colors.sky}
                    strokeWidth={5}
                    fill="none"
                    strokeDasharray={`${(2 * Math.PI * 23 * seenCount) / allSteps.length} ${2 * Math.PI * 23}`}
                    rotation={-90}
                    origin="29,29"
                  />
                </Svg>
                <Text style={styles.ringText}>
                  {seenCount}/{allSteps.length}
                </Text>
              </View>
              <View style={styles.startCopy}>
                <Text style={styles.startOverline}>EMPIEZA AQUÍ</Text>
                <Text style={styles.startTitle}>
                  {seenCount === 0
                    ? `Aprende Nexo en ${allSteps.length} pasos`
                    : nextStep
                      ? `Sigue: ${nextStep.title}`
                      : 'Recorrido completado'}
                </Text>
                <Text style={styles.startSub}>
                  {TUTORIAL_TITLES[role]} · {allSteps.length} pasos
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => start(nextStep ? nextIndex : 0, !nextStep)}
              style={styles.startButton}
            >
              <Text style={styles.startButtonText}>
                {seenCount === 0
                  ? 'Empezar recorrido'
                  : nextStep
                    ? 'Continuar recorrido'
                    : 'Repetir recorrido'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {steps.length > 0 ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Tu recorrido
            </Text>
            <View>
              {steps.map((step) => {
                const index = allSteps.findIndex((entry) => entry.id === step.id)
                const done = seen.includes(step.id)
                const next = nextStep?.id === step.id
                return (
                  <Pressable
                    key={step.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Paso ${index + 1}: ${step.title}`}
                    onPress={() => start(index)}
                    style={styles.step}
                  >
                    <View
                      style={[
                        styles.stepDot,
                        next && styles.stepDotFirst,
                        done && styles.stepDotDone,
                      ]}
                    >
                      <Text style={[styles.stepNumber, done && styles.stepNumberDone]}>
                        {done ? '✓' : index + 1}
                      </Text>
                    </View>
                    <View style={styles.stepCopy}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDetail}>{done ? 'Visto' : step.where}</Text>
                    </View>
                    {next ? <Text style={styles.showMe}>Mostrarme</Text> : null}
                  </Pressable>
                )
              })}
            </View>
          </View>
        ) : null}

        {guides.length > 0 ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Guías rápidas
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.guideCards}
            >
              {guides.map((guide) => (
                <Pressable
                  key={guide.id}
                  accessibilityRole="button"
                  onPress={() => setOpenGuide(guide)}
                  style={styles.guideCard}
                >
                  <Text style={styles.guideCardTitle}>{guide.title}</Text>
                  <Text style={styles.guideCardDuration}>{guide.duration}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {route?.params?.section !== 'case-card' && !query.trim() ? <CaseCardGuide /> : null}

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
      {openGuide ? (
        <BottomSheet
          visible
          title={openGuide.title}
          subtitle={`${TUTORIAL_TITLES[role]} · ${openGuide.duration}`}
          onClose={() => setOpenGuide(null)}
          footerAction={{
            label:
              openGuide.destination === 'my-work' && role !== 'tecnico'
                ? 'Ir a Solicitudes'
                : openGuide.action,
            onPress: () => openDestination(openGuide),
          }}
          fitContent
          scrollable={false}
        >
          {openGuide.steps.map((step, index) => (
            <View key={step} style={styles.guideRow}>
              <Text style={styles.guideIndex}>{index + 1}</Text>
              <Text style={styles.guideStep}>{step}</Text>
            </View>
          ))}
        </BottomSheet>
      ) : null}
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
  startCard: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
  },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ring: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  ringText: {
    position: 'absolute',
    ...typography.caption,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  startCopy: { flex: 1, gap: spacing.xs },
  startOverline: { ...typography.overline, color: colors.skySoft },
  startTitle: { ...typography.heading, color: colors.white },
  startSub: { ...typography.caption, color: colors.skySoft },
  startButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  startButtonText: { ...typography.body, fontFamily: fonts.bold, color: colors.ink },
  stepDotDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepNumberDone: { color: colors.white },
  showMe: {
    ...typography.caption,
    fontFamily: fonts.bold,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  guideCards: { gap: spacing.sm },
  guideCard: {
    width: 140,
    minHeight: 86,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'space-between',
  },
  guideCardTitle: { ...typography.caption, fontFamily: fonts.bold, color: colors.ink },
  guideCardDuration: { ...typography.caption, color: colors.textMuted },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.base },
  guideIndex: {
    ...typography.caption,
    fontFamily: fonts.bold,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    width: 26,
    height: 26,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: radius.pill,
  },
  guideStep: { ...typography.body, flex: 1, color: colors.text },
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
