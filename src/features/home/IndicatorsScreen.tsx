import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { RequestState } from '@/components/feedback/RequestState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { colors, spacing, typography } from '@/theme/tokens'
import { useCaseIndicators } from './useIndicators'
import { CASE_STATUSES } from '@/features/cases/types'
import { priorityMeta, statusMeta } from '@/theme/statusMeta'

function Metric({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? '—'}</Text>
    </View>
  )
}

export function IndicatorsScreen() {
  const [period, setPeriod] = useState<'all' | '30'>('30')
  const [today] = useState(() => new Date())
  const periodStart =
    period === '30' ? new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() : null
  const result = useCaseIndicators(true, periodStart)
  const data = result.data
  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Indicadores
        </Text>
        <Text style={styles.note}>
          Datos de las solicitudes que puedes consultar. Los vencimientos actuales no dependen del
          filtro de creación.
        </Text>
        <View style={styles.filters}>
          <Button
            label="Últimos 30 días"
            variant={period === '30' ? 'primary' : 'secondary'}
            onPress={() => setPeriod('30')}
          />
          <Button
            label="Todo"
            variant={period === 'all' ? 'primary' : 'secondary'}
            onPress={() => setPeriod('all')}
          />
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
            <Card contentStyle={styles.card}>
              <Text style={styles.heading}>Resumen</Text>
              <Metric label="Solicitudes" value={data.total} />
              <Metric
                label="Aceptación promedio (h)"
                value={data.tiempos_promedio_horas.aceptacion}
              />
              <Metric
                label="Resolución promedio (h)"
                value={data.tiempos_promedio_horas.resolucion}
              />
              <Metric
                label="Envío a aprobación promedio (h)"
                value={data.tiempos_promedio_horas.envio_a_aprobacion}
              />
            </Card>
            <Card contentStyle={styles.card}>
              <Text style={styles.heading}>Vencimientos</Text>
              <Metric label="Aceptación vencida ahora" value={data.vencidas_hoy.aceptacion} />
              <Metric label="Resolución vencida ahora" value={data.vencidas_hoy.resolucion} />
              <Metric label="Aceptadas fuera de plazo" value={data.fuera_de_plazo.aceptacion} />
              <Metric label="Resueltas fuera de plazo" value={data.fuera_de_plazo.resolucion} />
            </Card>
            <Card contentStyle={styles.card}>
              <Text style={styles.heading}>Por prioridad</Text>
              {(['alta', 'media', 'baja'] as const).map((priority) => (
                <Metric
                  key={priority}
                  label={priorityMeta[priority].label}
                  value={data.por_prioridad[priority] ?? 0}
                />
              ))}
            </Card>
            <Card contentStyle={styles.card}>
              <Text style={styles.heading}>Por estado</Text>
              {CASE_STATUSES.map((status) => (
                <Metric
                  key={status}
                  label={statusMeta[status].label}
                  value={data.por_estado[status] ?? 0}
                />
              ))}
            </Card>
            <Card contentStyle={styles.card}>
              <Text style={styles.heading}>Área destino</Text>
              {data.por_area_destino.length === 0 ? (
                <Text style={styles.note}>Sin datos en este periodo</Text>
              ) : null}
              {data.por_area_destino.map((area) => (
                <Metric key={area.area_id} label={area.nombre} value={area.total} />
              ))}
            </Card>
            <Card contentStyle={styles.card}>
              <Text style={styles.heading}>Área solicitante</Text>
              {data.por_area_solicitante.length === 0 ? (
                <Text style={styles.note}>Sin datos en este periodo</Text>
              ) : null}
              {data.por_area_solicitante.map((area) => (
                <Metric key={area.area_id} label={area.nombre} value={area.total} />
              ))}
            </Card>
            <Card contentStyle={styles.card}>
              <Text style={styles.heading}>Recursos por área solicitante</Text>
              {data.costo_recursos_por_area.length === 0 ? (
                <Text style={styles.note}>Sin datos en este periodo</Text>
              ) : null}
              {data.costo_recursos_por_area.map((area) => (
                <View key={area.area_id}>
                  <Metric label={area.nombre} value={area.costo.toFixed(2)} />
                  <Text style={styles.note}>{area.horas_mano_de_obra} h de mano de obra</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg },
  title: { ...typography.display, color: colors.text },
  note: { ...typography.caption, color: colors.textMuted },
  filters: { flexDirection: 'row', gap: spacing.sm },
  card: { gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text },
  metric: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { ...typography.body, color: colors.textMuted, flex: 1 },
  value: { ...typography.body, color: colors.text },
})
