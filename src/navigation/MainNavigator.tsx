import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { CasesListScreen } from '@/features/cases/screens/CasesListScreen'
import { CaseDetailScreen } from '@/features/cases/screens/CaseDetailScreen'
import { AssignCaseScreen } from '@/features/cases/screens/AssignCaseScreen'
import { ChangeCaseStatusScreen } from '@/features/cases/screens/ChangeCaseStatusScreen'
import { CreateCaseScreen } from '@/features/cases/screens/CreateCaseScreen'
import { EditCaseScreen } from '@/features/cases/screens/EditCaseScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import { AdministrationHomeScreen } from '@/features/admin/screens/AdministrationHomeScreen'
import { AccessRequestsScreen } from '@/features/admin/screens/AccessRequestsScreen'
import { UsersScreen } from '@/features/admin/screens/UsersScreen'
import { InvitationsScreen } from '@/features/admin/screens/InvitationsScreen'
import { OrganizationScreen } from '@/features/admin/screens/OrganizationScreen'
import { AreasScreen } from '@/features/areas/screens/AreasScreen'
import { hasPermission } from '@/features/auth/permissions'
import { CategoriesScreen } from '@/features/categories/screens/CategoriesScreen'
import { ProfileScreen } from '@/features/settings/ProfileScreen'
import { ResourcesScreen } from '@/features/resources/screens/ResourcesScreen'
import { CaseResourcesScreen } from '@/features/resources/screens/CaseResourcesScreen'
import { useAuthStore } from '@/store/authStore'
import { colors, typography } from '@/theme/tokens'

import type { AdministrationStackParamList, MainStackParamList, MainTabParamList } from './types'

const Stack = createNativeStackNavigator<MainStackParamList>()
const AdministrationStack = createNativeStackNavigator<AdministrationStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

function CasesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen component={CasesListScreen} name="Cases" options={{ headerShown: false }} />
      <Stack.Screen
        component={CreateCaseScreen}
        name="CreateCase"
        options={{ title: 'Nueva solicitud' }}
      />
      <Stack.Screen
        component={CaseDetailScreen}
        name="CaseDetail"
        options={{ title: 'Detalle de solicitud' }}
      />
      <Stack.Screen
        component={EditCaseScreen}
        name="EditCase"
        options={{ title: 'Editar solicitud' }}
      />
      <Stack.Screen
        component={ChangeCaseStatusScreen}
        name="ChangeCaseStatus"
        options={{ title: 'Acciones' }}
      />
      <Stack.Screen
        component={AssignCaseScreen}
        name="AssignCase"
        options={{ title: 'Asignar personal' }}
      />
      <Stack.Screen
        component={CaseResourcesScreen}
        name="CaseResources"
        options={{ title: 'Recursos utilizados' }}
      />
    </Stack.Navigator>
  )
}

function AdministrationNavigator() {
  return (
    <AdministrationStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <AdministrationStack.Screen
        component={AdministrationHomeScreen}
        name="AdministrationHome"
        options={{ headerShown: false }}
      />
      <AdministrationStack.Screen
        component={UsersScreen}
        name="Users"
        options={{ title: 'Usuarios' }}
      />
      <AdministrationStack.Screen
        component={AreasScreen}
        name="Areas"
        options={{ title: 'Áreas' }}
      />
      <AdministrationStack.Screen
        component={CategoriesScreen}
        name="Categories"
        options={{ title: 'Tipos de servicio' }}
      />
      <AdministrationStack.Screen
        component={InvitationsScreen}
        name="Invitations"
        options={{ title: 'Invitaciones' }}
      />
      <AdministrationStack.Screen
        component={OrganizationScreen}
        name="Organization"
        options={{ title: 'Mi empresa' }}
      />
      <AdministrationStack.Screen
        component={ResourcesScreen}
        name="Resources"
        options={{ title: 'Recursos' }}
      />
      <AdministrationStack.Screen
        component={AccessRequestsScreen}
        name="AccessRequests"
        options={{ title: 'Solicitudes de acceso' }}
      />
    </AdministrationStack.Navigator>
  )
}

const TAB_ICONS = {
  Home: ['home-outline', 'home'],
  CasesTab: ['folder-open-outline', 'folder-open'],
  Profile: ['person-outline', 'person'],
  Administration: ['settings-outline', 'settings'],
} as const

export function MainNavigator() {
  const role = useAuthStore((state) => state.profile?.role)
  const organizationId = useAuthStore((state) => state.profile?.organizationId)
  const home = useHomeSummary(Boolean(organizationId))
  const canManageAreas = hasPermission(role, 'areas.manage')
  const caseTabTitle =
    role === 'solicitante'
      ? 'Mis solicitudes'
      : role === 'tecnico'
        ? 'Mis trabajos'
        : role === 'jefe_area'
          ? home.data?.area_kind === 'tecnica'
            ? 'Bandeja'
            : 'Solicitudes del área'
          : 'Solicitudes'

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: typography.caption,
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons color={color} name={TAB_ICONS[route.name][focused ? 1 : 0]} size={size} />
        ),
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" options={{ title: 'Inicio' }} />
      <Tab.Screen component={CasesNavigator} name="CasesTab" options={{ title: caseTabTitle }} />
      {canManageAreas ? (
        <Tab.Screen
          component={AdministrationNavigator}
          name="Administration"
          options={{
            title: 'Administrar',
            tabBarBadge: home.data?.admin?.solicitudes_acceso_pendientes || undefined,
          }}
        />
      ) : null}
      <Tab.Screen component={ProfileScreen} name="Profile" options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  )
}
