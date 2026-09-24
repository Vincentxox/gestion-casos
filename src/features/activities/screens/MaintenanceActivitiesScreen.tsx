import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import {
  ACTIVITY_PAGE_SIZE,
  assignMaintenanceTechnician,
  createMaintenanceRequestWithActivity,
  getActivitiesPage,
  getActivityAreas,
  getActivityTypes,
  getAreaEmployees,
  getAreaEquipment,
  getMaintenanceTechnicians,
  type ActivityPriority,
  type ActivityStatusFilter,
  type PriorityDirection,
} from '@/features/activities/activityService'
import { colors, radius, spacing } from '@/theme/tokens'

type Section = 'lista' | 'agregar' | 'editar'

const ACTIVITY_SECTIONS = [
  { id: 'agregar', label: 'Agregar', icon: 'add-circle-outline' },
  { id: 'lista', label: 'Ver lista', icon: 'list-outline' },
  { id: 'editar', label: 'Editar', icon: 'create-outline' },
] as const

function todayLocal() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const STATUS_FILTERS: { value: ActivityStatusFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'activas', label: 'Activas' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'finalizadas', label: 'Finalizadas' },
]
const PRIORITIES: { value: ActivityPriority; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
]
const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  finalizada: 'Finalizada',
} as const

function Choice({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected, disabled && styles.choiceDisabled]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  )
}

export function MaintenanceActivitiesScreen({
  route,
}: {
  route: { params?: { initialSection?: 'agregar' | 'lista' } }
}) {
  const queryClient = useQueryClient()
  const [section, setSection] = useState<Section>(route.params?.initialSection ?? 'agregar')
  const [page, setPage] = useState(0)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [areaSearch, setAreaSearch] = useState('')
  const [status, setStatus] = useState<ActivityStatusFilter>('todas')
  const [priorityDirection, setPriorityDirection] = useState<PriorityDirection>('desc')
  const [openFilter, setOpenFilter] = useState<'estado' | 'area' | 'prioridad' | null>(null)
  const [requestNumber, setRequestNumber] = useState('')
  const [formAreaId, setFormAreaId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [equipmentId, setEquipmentId] = useState<string | null>(null)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [requestedOn, setRequestedOn] = useState(todayLocal)
  const [activityTypeId, setActivityTypeId] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [activityDescription, setActivityDescription] = useState('')
  const [priority, setPriority] = useState<ActivityPriority>('media')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [assignActivityId, setAssignActivityId] = useState<string | null>(null)
  const [technicianSearch, setTechnicianSearch] = useState('')

  const areasQuery = useQuery({ queryKey: ['maintenance-areas'], queryFn: getActivityAreas })
  const typesQuery = useQuery({
    queryKey: ['maintenance-activity-types'],
    queryFn: getActivityTypes,
    enabled: section === 'agregar',
  })
  const employeesQuery = useQuery({
    queryKey: ['maintenance-area-employees', formAreaId],
    queryFn: () => getAreaEmployees(formAreaId),
    enabled: section === 'agregar' && !!formAreaId,
  })
  const equipmentQuery = useQuery({
    queryKey: ['maintenance-area-equipment', formAreaId],
    queryFn: () => getAreaEquipment(formAreaId),
    enabled: section === 'agregar' && !!formAreaId,
  })
  const activitiesQuery = useQuery({
    queryKey: ['maintenance-activities', page, areaId, status, priorityDirection],
    queryFn: () => getActivitiesPage({ page, areaId, status, priorityDirection }),
    enabled: section === 'lista',
  })
  const techniciansQuery = useQuery({
    queryKey: ['maintenance-technicians'],
    queryFn: getMaintenanceTechnicians,
    enabled: section === 'lista' && assignActivityId !== null,
  })
  const assignMutation = useMutation({
    mutationFn: assignMaintenanceTechnician,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['technician-assigned-activities'] })
      setAssignActivityId(null)
      setTechnicianSearch('')
      setNotice('Actividad asignada al técnico.')
    },
  })
  const createMutation = useMutation({
    mutationFn: createMaintenanceRequestWithActivity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance-activities'] })
      setRequestNumber('')
      setFormAreaId('')
      setEmployeeId('')
      setEquipmentId(null)
      setEmployeeSearch('')
      setEquipmentSearch('')
      setRequestedOn(todayLocal())
      setActivityTypeId('')
      setRequestDescription('')
      setActivityDescription('')
      setPriority('media')
      setFormError('')
      setNotice('Solicitud y actividad creadas. La actividad ya puede asignarse.')
      setPage(0)
      setSection('lista')
    },
  })

  const total = activitiesQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE))
  const matchingAreas = (areasQuery.data ?? []).filter((area) =>
    area.nombre.toLocaleLowerCase().includes(areaSearch.toLocaleLowerCase()),
  )
  const matchingEmployees = (employeesQuery.data ?? []).filter((employee) =>
    `${employee.nombres} ${employee.apellidos}`
      .toLocaleLowerCase()
      .includes(employeeSearch.toLocaleLowerCase()),
  )
  const matchingEquipment = (equipmentQuery.data ?? []).filter((equipment) =>
    `${equipment.numero_serie} ${equipment.modelo.marca.nombre} ${equipment.modelo.nombre}`
      .toLocaleLowerCase()
      .includes(equipmentSearch.toLocaleLowerCase()),
  )
  const matchingTechnicians = (techniciansQuery.data ?? []).filter((technician) =>
    technician.nombre_completo.toLocaleLowerCase().includes(technicianSearch.toLocaleLowerCase()),
  )

  function submitActivity() {
    setFormError('')
    if (requestNumber.trim().length < 3 || requestNumber.trim().length > 50) {
      setFormError('El número de solicitud debe tener entre 3 y 50 caracteres.')
      return
    }
    if (!formAreaId || !employeeId) {
      setFormError('Selecciona el área y el empleado que solicita el trabajo.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedOn) || Number.isNaN(Date.parse(requestedOn))) {
      setFormError('Escribe la fecha de solicitud como AAAA-MM-DD.')
      return
    }
    if (!activityTypeId) {
      setFormError('Selecciona un tipo de actividad.')
      return
    }
    if (
      [requestDescription, activityDescription].some(
        (value) => value.trim().length < 10 || value.trim().length > 2000,
      )
    ) {
      setFormError('Cada descripción debe tener entre 10 y 2000 caracteres.')
      return
    }
    createMutation.mutate({
      requestNumber,
      areaId: formAreaId,
      equipmentId,
      employeeId,
      requestedOn,
      activityTypeId,
      requestDescription,
      activityDescription,
      priority,
    })
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Actividades
        </Text>
        <Text style={styles.subtitle}>
          Registra actividades y consulta el trabajo de mantenimiento.
        </Text>
      </View>

      {section === 'lista' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpenFilter(openFilter === 'estado' ? null : 'estado')}
            style={styles.filterHeader}
          >
            <Text style={styles.label}>Estado: {STATUS_FILTERS.find((item) => item.value === status)?.label}</Text>
            <Text style={styles.link}>▾</Text>
          </Pressable>
          {openFilter === 'estado' ? (
            <View style={styles.choices}>
              {STATUS_FILTERS.map((option) => (
                <Choice
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    setStatus(option.value)
                    setPage(0)
                    setOpenFilter(null)
                  }}
                  selected={status === option.value}
                />
              ))}
              <Text style={styles.hint}>Activas = pendientes y en proceso.</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setOpenFilter(openFilter === 'area' ? null : 'area')}
            style={styles.filterHeader}
          >
            <Text style={styles.label}>
              Área: {areasQuery.data?.find((item) => item.id === areaId)?.nombre ?? 'Todas'}
            </Text>
            <Text style={styles.link}>▾</Text>
          </Pressable>
          {openFilter === 'area' ? (
            <View style={styles.filterOptions}>
              <TextInput
                accessibilityLabel="Buscar área"
                onChangeText={setAreaSearch}
                placeholder="Buscar área"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
                value={areaSearch}
              />
              {areasQuery.isError ? (
                <Text style={styles.error}>No se pudieron cargar las áreas.</Text>
              ) : null}
              <View style={styles.choices}>
                <Choice
                  label="Todas las áreas"
                  onPress={() => {
                    setAreaId(null)
                    setPage(0)
                    setOpenFilter(null)
                  }}
                  selected={areaId === null}
                />
                {matchingAreas.map((area) => (
                  <Choice
                    key={area.id}
                    label={area.nombre}
                    onPress={() => {
                      setAreaId(area.id)
                      setPage(0)
                      setOpenFilter(null)
                    }}
                    selected={areaId === area.id}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setOpenFilter(openFilter === 'prioridad' ? null : 'prioridad')}
            style={styles.filterHeader}
          >
            <Text style={styles.label}>
              Prioridad: {priorityDirection === 'desc' ? 'Alta → Baja' : 'Baja → Alta'}
            </Text>
            <Text style={styles.link}>▾</Text>
          </Pressable>
          {openFilter === 'prioridad' ? (
            <View style={styles.choices}>
              <Choice
                label="Alta → Baja"
                onPress={() => {
                  setPriorityDirection('desc')
                  setPage(0)
                  setOpenFilter(null)
                }}
                selected={priorityDirection === 'desc'}
              />
              <Choice
                label="Baja → Alta"
                onPress={() => {
                  setPriorityDirection('asc')
                  setPage(0)
                  setOpenFilter(null)
                }}
                selected={priorityDirection === 'asc'}
              />
            </View>
          ) : null}

          <View style={styles.listHeading}>
            <Text style={styles.label}>Actividades ({total})</Text>
            <Pressable accessibilityRole="button" onPress={() => activitiesQuery.refetch()}>
              <Text style={styles.link}>Actualizar</Text>
            </Pressable>
          </View>
          {activitiesQuery.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          {activitiesQuery.isError ? (
            <Text style={styles.error}>
              No se pudo cargar la lista. Comprueba la conexión y la migración de prioridad.
            </Text>
          ) : null}
          {activitiesQuery.isSuccess && total === 0 ? (
            <Text style={styles.empty}>No hay actividades para estos filtros.</Text>
          ) : null}
          {activitiesQuery.isSuccess && total > 0 && page >= totalPages ? (
            <Pressable accessibilityRole="button" onPress={() => setPage(0)}>
              <Text style={styles.link}>Esta página quedó vacía. Volver al inicio.</Text>
            </Pressable>
          ) : null}
          {activitiesQuery.data?.items.map((activity) => (
            <View key={activity.id} style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>{activity.solicitud.numero_solicitud}</Text>
                <Text style={styles.priority}>{activity.prioridad.toUpperCase()}</Text>
              </View>
              <Text style={styles.description}>{activity.descripcion}</Text>
              <Text style={styles.meta}>
                {activity.solicitud.area.nombre} · {activity.solicitud.tipo.nombre} ·{' '}
                {STATUS_LABELS[activity.estado]}
              </Text>
              {activity.estado !== 'finalizada' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAssignActivityId(assignActivityId === activity.id ? null : activity.id)
                    setTechnicianSearch('')
                  }}
                >
                  <Text style={styles.link}>Asignar técnico</Text>
                </Pressable>
              ) : null}
              {assignActivityId === activity.id ? (
                <View style={styles.assignment}>
                  <TextInput
                    accessibilityLabel="Buscar técnico"
                    onChangeText={setTechnicianSearch}
                    placeholder="Buscar técnico"
                    placeholderTextColor={colors.textMuted}
                    style={styles.search}
                    value={technicianSearch}
                  />
                  {techniciansQuery.isError ? (
                    <Text style={styles.error}>No se pudieron cargar los técnicos.</Text>
                  ) : null}
                  {assignMutation.isError ? (
                    <Text style={styles.error}>No se pudo asignar. Comprueba si ya está asignado.</Text>
                  ) : null}
                  {matchingTechnicians.map((technician) => (
                    <Choice
                      disabled={assignMutation.isPending}
                      key={technician.id}
                      label={technician.nombre_completo}
                      onPress={() =>
                        assignMutation.mutate({ activityId: activity.id, technicianId: technician.id })
                      }
                      selected={false}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {activitiesQuery.isSuccess && total > 0 && page < totalPages ? (
            <View style={styles.pagination}>
              <Choice
                label="Anterior"
                onPress={() => setPage((value) => Math.max(0, value - 1))}
                selected={false}
                disabled={page === 0}
              />
              <Text style={styles.pageText}>
                Página {page + 1} de {totalPages}
              </Text>
              <Choice
                label="Siguiente"
                onPress={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
                selected={false}
                disabled={page + 1 >= totalPages}
              />
            </View>
          ) : null}
        </ScrollView>
      ) : section === 'agregar' ? (
        <KeyboardFormScrollView contentContainerStyle={styles.content}>
          <FormField
            label="Número de solicitud"
            maxLength={50}
            onChangeText={setRequestNumber}
            placeholder="Ejemplo: SOL-2026-001"
            value={requestNumber}
          />
          <Text style={styles.hint}>Usa el número de la solicitud física; no debe repetirse.</Text>

          <Text style={styles.label}>Área solicitante</Text>
          <TextInput
            accessibilityLabel="Buscar área solicitante"
            onChangeText={setAreaSearch}
            placeholder="Buscar área"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            value={areaSearch}
          />
          {areasQuery.isError ? <Text style={styles.error}>No se pudieron cargar las áreas.</Text> : null}
          <View style={styles.choices}>
            {matchingAreas.map((area) => (
              <Choice
                key={area.id}
                label={area.nombre}
                onPress={() => {
                  setFormAreaId(area.id)
                  setEmployeeId('')
                  setEquipmentId(null)
                  setEmployeeSearch('')
                  setEquipmentSearch('')
                }}
                selected={formAreaId === area.id}
              />
            ))}
          </View>

          {formAreaId ? (
            <>
              <Text style={styles.label}>Empleado solicitante</Text>
              <TextInput
                accessibilityLabel="Buscar empleado solicitante"
                onChangeText={setEmployeeSearch}
                placeholder="Buscar por nombre o apellido"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
                value={employeeSearch}
              />
              {employeesQuery.isError ? (
                <Text style={styles.error}>No se pudieron cargar los empleados.</Text>
              ) : null}
              <View style={styles.choices}>
                {matchingEmployees.map((employee) => (
                  <Choice
                    key={employee.id}
                    label={`${employee.nombres} ${employee.apellidos}`}
                    onPress={() => setEmployeeId(employee.id)}
                    selected={employeeId === employee.id}
                  />
                ))}
              </View>

              <Text style={styles.label}>Equipo (opcional si la falla es del área)</Text>
              <TextInput
                accessibilityLabel="Buscar equipo"
                onChangeText={setEquipmentSearch}
                placeholder="Buscar por serie, marca o modelo"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
                value={equipmentSearch}
              />
              {equipmentQuery.isError ? (
                <Text style={styles.error}>No se pudieron cargar los equipos.</Text>
              ) : null}
              <View style={styles.choices}>
                <Choice
                  label="Sin equipo"
                  onPress={() => setEquipmentId(null)}
                  selected={equipmentId === null}
                />
                {matchingEquipment.map((equipment) => (
                  <Choice
                    key={equipment.id}
                    label={`${equipment.numero_serie} · ${equipment.modelo.marca.nombre} ${equipment.modelo.nombre}`}
                    onPress={() => setEquipmentId(equipment.id)}
                    selected={equipmentId === equipment.id}
                  />
                ))}
              </View>
            </>
          ) : null}

          <FormField
            label="Fecha de solicitud (AAAA-MM-DD)"
            maxLength={10}
            onChangeText={setRequestedOn}
            placeholder="2026-09-20"
            value={requestedOn}
          />

          <Text style={styles.label}>Tipo de la solicitud</Text>
          {typesQuery.isError ? (
            <Text style={styles.error}>No se pudieron cargar los tipos de actividad.</Text>
          ) : null}
          <View style={styles.choices}>
            {typesQuery.data?.map((type) => (
              <Choice
                key={type.id}
                label={type.nombre}
                onPress={() => setActivityTypeId(type.id)}
                selected={activityTypeId === type.id}
              />
            ))}
          </View>

          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.choices}>
            {PRIORITIES.map((option) => (
              <Choice
                key={option.value}
                label={option.label}
                onPress={() => setPriority(option.value)}
                selected={priority === option.value}
              />
            ))}
          </View>

          <FormField
            label="Descripción de la solicitud"
            maxLength={2000}
            multiline
            onChangeText={setRequestDescription}
            placeholder="Describe la falla que reportó el empleado"
            style={styles.descriptionInput}
            textAlignVertical="top"
            value={requestDescription}
          />
          <FormField
            label="Descripción de la actividad"
            maxLength={2000}
            multiline
            onChangeText={setActivityDescription}
            placeholder="Describe el trabajo que se realizará"
            style={styles.descriptionInput}
            textAlignVertical="top"
            value={activityDescription}
          />
          <Text style={styles.hint}>
            Entre 10 y 2000 caracteres. La actividad iniciará pendiente.
          </Text>
          {formError ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {formError}
            </Text>
          ) : null}
          {createMutation.isError ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              No se pudieron guardar la solicitud y la actividad. Comprueba los datos y la conexión.
            </Text>
          ) : null}
          <PrimaryButton
            label="Guardar solicitud y actividad"
            loading={createMutation.isPending}
            onPress={submitActivity}
          />
        </KeyboardFormScrollView>
      ) : (
        <View style={styles.editPlaceholder}>
          <Text style={styles.empty}>
            La edición de actividades será la siguiente fase. Por ahora puedes registrarlas y ver su lista.
          </Text>
        </View>
      )}
      <View style={styles.bottomBar}>
        {ACTIVITY_SECTIONS.map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === item.id }}
            key={item.id}
            onPress={() => setSection(item.id)}
            style={styles.bottomAction}
          >
            <Ionicons
              color={section === item.id ? colors.primary : colors.textMuted}
              name={item.icon}
              size={23}
            />
            <Text style={[styles.bottomLabel, section === item.id && styles.bottomLabelSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  bottomAction: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  bottomLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  bottomLabelSelected: { color: colors.primary },
  editPlaceholder: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  content: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  label: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.sm },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  filterOptions: { gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceDisabled: { opacity: 0.5 },
  choiceText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  choiceTextSelected: { color: colors.primary },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  error: { color: colors.error, fontSize: 13, lineHeight: 19 },
  notice: { color: colors.success, fontSize: 14, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 14, lineHeight: 21, paddingVertical: spacing.md },
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  assignment: { gap: spacing.sm },
  priority: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  description: { color: colors.text, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  pageText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  descriptionInput: { minHeight: 110, paddingTop: spacing.md },
})
