import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Icon } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
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
import { getTourProgress } from './tour/tourProgress'

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
  const { seenCount, nextIndex, nextStep } = getTourProgress(allSteps, seen)
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
            <View style={styles.startHeading}>
              <Text style={styles.startTitle}>Aprende Nexo en {allSteps.length} pasos</Text>
              <Text style={styles.startCount}>
                {seenCount} de {allSteps.length}
              </Text>
            </View>
            {allSteps.map((step, index) => {
              const done = seen.includes(step.id)
              const current = nextStep?.id === step.id
              return (
                <View key={step.id} style={styles.tourStep}>
                  <View
                    style={[
                      styles.tourCircle,
                      done
                        ? styles.tourCircleDone
                        : current
                          ? styles.tourCircleCurrent
                          : styles.tourCirclePending,
                    ]}
                  >
                    {done ? (
                      <Icon name="checkmark" size={18} color={colors.ink} />
                    ) : (
                      <Text style={[styles.tourStepNumber, current && styles.tourStepCurrent]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.tourStepTitle,
                      done && styles.tourStepDone,
                      current && styles.tourStepCurrent,
                    ]}
                  >
                    {step.title}
                  </Text>
                </View>
              )
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => start(nextStep ? nextIndex : 0, !nextStep)}
              style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
            >
              <Text style={styles.startButtonText}>
                {nextStep ? `Continuar: ${nextStep.title}` : 'Repetir recorrido'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {guides.length > 0 ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Guías rápidas
            </Text>
            <View style={styles.guideCards}>
              {guides.map((guide) => (
                <Pressable
                  key={guide.id}
                  accessibilityRole="button"
                  onPress={() => setOpenGuide(guide)}
                  style={({ pressed }) => [styles.guideCard, pressed && styles.rowPressed]}
                >
                  <IconTile
                    icon="play-circle-outline"
                    size={40}
                    backgroundColor={colors.surfaceMuted}
                    iconColor={colors.ink}
                  />
                  <Text style={styles.guideCardTitle}>{guide.title}</Text>
                  <Text style={styles.guideCardDuration}>{guide.duration}</Text>
                  <Icon name="chevron-forward" color={colors.textMuted} size={18} />
                </Pressable>
              ))}
            </View>
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
                    style={({ pressed }) => [styles.faqQuestion, pressed && styles.rowPressed]}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <View style={open && styles.faqChevronOpen}>
                      <Icon name="chevron-down" color={colors.textMuted} size={18} />
                    </View>
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
  startHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startTitle: { ...typography.heading, color: colors.white, flex: 1 },
  startCount: { ...typography.caption, fontFamily: fonts.semibold, color: colors.skySoft },
  tourStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, minHeight: 36 },
  tourCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  tourCircleDone: { backgroundColor: colors.white, borderColor: colors.white },
  tourCircleCurrent: { borderColor: colors.white, borderWidth: 2 },
  tourCirclePending: { borderColor: `${colors.skySoft}80` },
  tourStepNumber: { ...typography.caption, fontFamily: fonts.semibold, color: colors.skySoft },
  tourStepTitle: { ...typography.body, flex: 1, color: colors.skySoft },
  tourStepDone: { color: colors.skySoft, textDecorationLine: 'line-through' },
  tourStepCurrent: { fontFamily: fonts.bold, color: colors.white },
  startButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  startButtonText: { ...typography.body, fontFamily: fonts.bold, color: colors.ink },
  startButtonPressed: { backgroundColor: colors.surfaceMuted },
  guideCards: { gap: spacing.sm },
  guideCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.track,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  guideCardTitle: { ...typography.body, flex: 1, fontFamily: fonts.semibold, color: colors.ink },
  guideCardDuration: { ...typography.caption, color: colors.textMuted },
  rowPressed: { backgroundColor: colors.surfaceMuted },
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
  faqChevronOpen: { transform: [{ rotate: '180deg' }] },
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
