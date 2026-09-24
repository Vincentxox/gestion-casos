import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { AdministrationStackParamList } from '@/navigation/types'
import { getPendingRoleCount } from '@/features/admin/maintenanceUserService'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = NativeStackScreenProps<AdministrationStackParamList, 'MaintenanceAdmin'>
type ViewMode = 'grid' | 'list'

const MODULES = [
  {
    id: 'solicitudes',
    title: 'Solicitudes',
    description: 'Registro y seguimiento de solicitudes.',
    icon: 'document-text-outline',
  },
  {
    id: 'actividades',
    title: 'Actividades',
    description: 'Trabajo, progreso y estados.',
    icon: 'construct-outline',
  },
  {
    id: 'usuarios',
    title: 'Usuarios',
    description: 'Cuentas y acceso al sistema.',
    icon: 'people-outline',
  },
  {
    id: 'asignaciones',
    title: 'Asignaciones',
    description: 'Técnicos por actividad.',
    icon: 'person-add-outline',
  },
  {
    id: 'empleados',
    title: 'Empleados',
    description: 'Personal y sus áreas.',
    icon: 'person-outline',
  },
  {
    id: 'cargos',
    title: 'Cargos',
    description: 'Funciones del personal.',
    icon: 'briefcase-outline',
  },
  {
    id: 'areas',
    title: 'Áreas',
    description: 'Ubicación de equipos y personal.',
    icon: 'business-outline',
  },
  {
    id: 'servicios',
    title: 'Servicios',
    description: 'Organización de las áreas.',
    icon: 'layers-outline',
  },
  {
    id: 'equipos',
    title: 'Equipos',
    description: 'Inventario de equipos.',
    icon: 'hardware-chip-outline',
  },
  {
    id: 'tipos_equipo',
    title: 'Tipos de equipo',
    description: 'Clasificación de equipos.',
    icon: 'grid-outline',
  },
  { id: 'modelos', title: 'Modelos', description: 'Modelos por marca.', icon: 'cube-outline' },
  {
    id: 'marcas',
    title: 'Marcas',
    description: 'Fabricantes de equipos.',
    icon: 'pricetag-outline',
  },
  {
    id: 'insumos',
    title: 'Insumos',
    description: 'Materiales de mantenimiento.',
    icon: 'flask-outline',
  },
  {
    id: 'repuestos',
    title: 'Repuestos',
    description: 'Piezas y existencias.',
    icon: 'build-outline',
  },
  {
    id: 'capturas',
    title: 'Capturas',
    description: 'Fotografías de actividades.',
    icon: 'images-outline',
  },
  {
    id: 'tipos_actividad',
    title: 'Tipos de actividad',
    description: 'Preventivo, correctivo y predictivo.',
    icon: 'list-outline',
  },
  {
    id: 'historial',
    title: 'Historial de actividades',
    description: 'Cambios de estado.',
    icon: 'time-outline',
  },
  {
    id: 'roles',
    title: 'Roles de usuario',
    description: 'Permisos de acceso.',
    icon: 'shield-outline',
  },
  {
    id: 'bitacora',
    title: 'Bitácora',
    description: 'Cambios registrados en el sistema.',
    icon: 'reader-outline',
  },
  {
    id: 'reportes',
    title: 'Reportes',
    description: 'Resumen por fechas.',
    icon: 'stats-chart-outline',
  },
] as const

const ALL_OPTION = {
  id: 'todas',
  title: 'Todas las gestiones',
  description: 'Explora todos los módulos.',
  icon: 'apps-outline',
} as const

export function MaintenanceAdminScreen({ navigation }: Props) {
  const fullName = useAuthStore((state) => state.profile?.fullName)
  const [showAll, setShowAll] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const options = showAll ? MODULES : [...MODULES.slice(0, 3), ALL_OPTION]
  const pendingRoles = useQuery({
    queryKey: ['maintenance-pending-roles'],
    queryFn: getPendingRoleCount,
    refetchInterval: 30000,
  })

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {showAll ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAll(false)}
            style={styles.backLink}
          >
            <Ionicons color={colors.primary} name="arrow-back" size={20} />
            <Text style={styles.backText}>Volver al panel</Text>
          </Pressable>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
          <Pressable
            accessibilityLabel={`Usuarios pendientes de rol: ${pendingRoles.data ?? 0}`}
            accessibilityRole="button"
            onPress={() => navigation.navigate('MaintenanceUsers', { pendingOnly: true })}
            style={styles.notification}
          >
            <Ionicons color={colors.primary} name="notifications-outline" size={25} />
            {(pendingRoles.data ?? 0) > 0 ? (
              <Text style={styles.notificationCount}>{pendingRoles.data}</Text>
            ) : null}
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {showAll ? 'Todas las gestiones' : 'Panel de mantenimiento'}
          </Text>
          <Text style={styles.subtitle}>
            {showAll
              ? 'Elige el módulo que deseas consultar.'
              : `${fullName ? `Hola, ${fullName}. ` : ''}Gestiona solicitudes y recursos de mantenimiento.`}
          </Text>
        </View>

        <View style={styles.toolbar}>
          <Text style={styles.sectionTitle}>{showAll ? 'Módulos' : 'Accesos principales'}</Text>
          <View accessibilityLabel="Formato de visualización" style={styles.viewSwitch}>
            <Pressable
              accessibilityLabel="Ver en cuadrícula"
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'grid' }}
              onPress={() => setViewMode('grid')}
              style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonSelected]}
            >
              <Ionicons
                color={viewMode === 'grid' ? colors.white : colors.primary}
                name="grid-outline"
                size={20}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Ver en lista"
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'list' }}
              onPress={() => setViewMode('list')}
              style={[styles.viewButton, viewMode === 'list' && styles.viewButtonSelected]}
            >
              <Ionicons
                color={viewMode === 'list' ? colors.white : colors.primary}
                name="list-outline"
                size={20}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.options}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              onPress={() =>
                option.id === 'todas'
                  ? setShowAll(true)
                  : option.id === 'actividades'
                    ? navigation.navigate('MaintenanceActivities')
                    : option.id === 'asignaciones'
                      ? navigation.navigate('MaintenanceActivities', { initialSection: 'lista' })
                    : option.id === 'usuarios' || option.id === 'roles'
                      ? navigation.navigate('MaintenanceUsers')
                    : navigation.navigate('MaintenanceModule', { title: option.title })
              }
              style={({ pressed }) => [
                styles.card,
                viewMode === 'grid' ? styles.gridCard : styles.listCard,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Ionicons color={colors.primary} name={option.icon} size={25} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
              {viewMode === 'list' ? (
                <Ionicons color={colors.primary} name="chevron-forward" size={20} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  header: { gap: spacing.sm },
  notification: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  notificationCount: {
    minWidth: 20,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: colors.error,
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  viewSwitch: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  viewButton: { padding: spacing.sm },
  viewButtonSelected: { backgroundColor: colors.primary },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  gridCard: { width: '48%', minHeight: 150, gap: spacing.sm },
  listCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardPressed: { opacity: 0.75 },
  iconContainer: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cardDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
})
