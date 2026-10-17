import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Icon } from '@/components/ui/Icon'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import { getFaqFor, getTutorialFor, TUTORIAL_TITLES } from './helpContent'

export function HelpScreen() {
  const role = useAuthStore((state) => state.profile?.role)
  const [query, setQuery] = useState('')
  const [openStep, setOpenStep] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
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
})
