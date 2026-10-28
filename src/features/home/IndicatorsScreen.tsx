import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { RequestState } from '@/components/feedback/RequestState'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { CASE_PRIORITIES, CASE_STATUSES } from '@/features/cases/types'
import type { MainStackParamList } from '@/navigation/types'
import { formatNumber } from '@/theme/formatters'
import { priorityMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, radius, spacing, tone, typography } from '@/theme/tokens'
import { useCaseIndicators } from './useIndicators'
import { formatIndicatorDuration } from './indicatorPresentation'

type Props = NativeStackScreenProps<MainStackParamList, 'Indicators'>

function TimeMetric({ label, hours }: { label: string; hours: number | null }) {
  return (
    <View style={styles.timeMetric}>
      <Text style={styles.timeValue}>{formatIndicatorDuration(hours)}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  )
}

function DetailRow({
  label,
  value,
  note,
}: {
  label: string
  value: string | number
  note?: string
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelGroup}>
        <Text style={styles.detailLabel}>{label}</Text>
        {note ? <Text style={styles.detailNote}>{note}</Text> : null}
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

export function IndicatorsScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<'all' | '30'>('30')
  const [detailOpen, setDetailOpen] = useState(false)
  const [today] = useState(() => new Date())
  const periodStart =
    period === '30' ? new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() : null
  const result = useCaseIndicators(true, periodStart)
  const data = result.data
  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filters}>
          <Chip
            label="Últimos 30 días"
            selected={period === '30'}
            onPress={() => setPeriod('30')}
          />
          <Chip label="Todo" selected={period === 'all'} onPress={() => setPeriod('all')} />
        </View>
        {result.isLoading ? <RequestState kind="loading" title="Cargando indicadores…" /> : null}
        {result.isError ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los indicadores"
            onRetry={() => void result.refetch()}
          />
        ) : null}
        {data ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroValue}>{formatNumber(data.total)}</Text>
              <Text style={styles.heroLabel}>
                {period === '30'
                  ? 'solicitudes creadas en los últimos 30 días'
                  : 'solicitudes creadas en todo el periodo'}
              </Text>
            </View>
            <View style={styles.timeMetrics}>
              <TimeMetric
                label="Aceptar, en promedio"
                hours={data.tiempos_promedio_horas.aceptacion}
              />
              <TimeMetric
                label="Resolver, en promedio"
                hours={data.tiempos_promedio_horas.resolucion}
              />
              <TimeMetric
                label="Aprobar, en promedio"
                hours={data.tiempos_promedio_horas.envio_a_aprobacion}
              />
            </View>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Ahora mismo
              </Text>
              <Text style={styles.note}>No depende del periodo elegido.</Text>
              {(
                [
                  ['Vencidas sin aceptar', data.vencidas_hoy.aceptacion],
                  ['Vencidas sin resolver', data.vencidas_hoy.resolucion],
                ] as const
              ).map(([label, value]) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, ${value}. Ver solicitudes vencidas`}
                  onPress={() =>
                    navigation.navigate('Cases', { status: 'abiertas', overdueOnly: true })
                  }
                  style={styles.overdueRow}
                >
                  <Icon name="warning-outline" color={tone.danger.text} size={22} />
                  <Text style={styles.overdueLabel}>{label}</Text>
                  <Text style={styles.overdueValue}>{formatNumber(value)}</Text>
                  <Icon name="chevron-forward" color={tone.danger.text} size={20} />
                </Pressable>
              ))}
            </View>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Fuera de plazo en el periodo
              </Text>
              <View style={styles.lateRow}>
                <Text style={styles.lateLabel}>Aceptadas tarde</Text>
                <Text style={styles.lateValue}>{formatNumber(data.fuera_de_plazo.aceptacion)}</Text>
              </View>
              <View style={styles.lateRow}>
                <Text style={styles.lateLabel}>Resueltas tarde</Text>
                <Text style={styles.lateValue}>{formatNumber(data.fuera_de_plazo.resolucion)}</Text>
              </View>
            </View>
            <View style={styles.details}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Más detalle"
                accessibilityState={{ expanded: detailOpen }}
                onPress={() => setDetailOpen((open) => !open)}
                style={styles.detailsToggle}
              >
                <Text style={styles.detailsTitle}>Más detalle</Text>
                <View style={detailOpen && styles.detailsChevronOpen}>
                  <Icon name="chevron-down" color={colors.textMuted} size={18} />
                </View>
              </Pressable>
              {detailOpen ? (
                <View style={styles.detailBlocks}>
                  <View>
                    <Text accessibilityRole="header" style={styles.detailHeading}>
                      Por prioridad
                    </Text>
                    {CASE_PRIORITIES.map((priority) => (
                      <DetailRow
                        key={priority}
                        label={priorityMeta[priority].label}
                        value={formatNumber(data.por_prioridad[priority] ?? 0)}
                      />
                    ))}
                  </View>
                  <View>
                    <Text accessibilityRole="header" style={styles.detailHeading}>
                      Por estado
                    </Text>
                    {CASE_STATUSES.map((status) => (
                      <DetailRow
                        key={status}
                        label={statusMeta[status].label}
                        value={formatNumber(data.por_estado[status] ?? 0)}
                      />
                    ))}
                  </View>
                  <View>
                    <Text accessibilityRole="header" style={styles.detailHeading}>
                      Área destino
                    </Text>
                    {data.por_area_destino.length === 0 ? (
                      <Text style={styles.note}>Sin datos en este periodo</Text>
                    ) : (
                      data.por_area_destino.map((area) => (
                        <DetailRow
                          key={area.area_id}
                          label={area.nombre}
                          value={formatNumber(area.total)}
                        />
                      ))
                    )}
                  </View>
                  <View>
                    <Text accessibilityRole="header" style={styles.detailHeading}>
                      Área solicitante
                    </Text>
                    {data.por_area_solicitante.length === 0 ? (
                      <Text style={styles.note}>Sin datos en este periodo</Text>
                    ) : (
                      data.por_area_solicitante.map((area) => (
                        <DetailRow
                          key={area.area_id}
                          label={area.nombre}
                          value={formatNumber(area.total)}
                        />
                      ))
                    )}
                  </View>
                  <View>
                    <Text accessibilityRole="header" style={styles.detailHeading}>
                      Recursos por área solicitante
                    </Text>
                    {data.costo_recursos_por_area.length === 0 ? (
                      <Text style={styles.note}>Sin datos en este periodo</Text>
                    ) : (
                      data.costo_recursos_por_area.map((area) => (
                        <DetailRow
                          key={area.area_id}
                          label={area.nombre}
                          value={area.costo.toFixed(2)}
                          note={`${area.horas_mano_de_obra} h de mano de obra`}
                        />
                      ))
                    )}
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xl },
  note: { ...typography.body, color: colors.textMuted },
  filters: { flexDirection: 'row', gap: spacing.sm },
  hero: { gap: spacing.xs },
  heroValue: { fontFamily: fonts.extrabold, fontSize: 56, lineHeight: 64, color: colors.ink },
  heroLabel: { ...typography.body, color: colors.textMuted },
  timeMetrics: { flexDirection: 'row', gap: spacing.sm },
  timeMetric: {
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  timeValue: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 28, color: colors.ink },
  timeLabel: { ...typography.caption, color: colors.textMuted },
  section: { gap: spacing.sm },
  heading: { ...typography.title, color: colors.ink },
  overdueRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: tone.danger.bg,
    borderColor: tone.danger.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  overdueLabel: { ...typography.body, flex: 1, fontFamily: fonts.bold, color: tone.danger.text },
  overdueValue: { ...typography.heading, color: tone.danger.text },
  lateRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lateLabel: { ...typography.body, color: colors.text },
  lateValue: { ...typography.heading, color: colors.ink },
  details: { borderTopWidth: 1, borderTopColor: colors.track },
  detailsToggle: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  detailsTitle: { ...typography.body, flex: 1, fontFamily: fonts.semibold, color: colors.text },
  detailsChevronOpen: { transform: [{ rotate: '180deg' }] },
  detailBlocks: { gap: spacing.lg, paddingBottom: spacing.md },
  detailHeading: { ...typography.heading, color: colors.ink, paddingBottom: spacing.xs },
  detailRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.track,
  },
  detailLabelGroup: { flex: 1, paddingVertical: spacing.sm },
  detailLabel: { ...typography.body, color: colors.text },
  detailNote: { ...typography.caption, color: colors.textMuted },
  detailValue: { ...typography.heading, color: colors.ink },
})
