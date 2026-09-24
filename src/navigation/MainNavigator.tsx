import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { usesMaintenanceDataModel } from '@/config/dataModel'
import { CasesListScreen } from '@/features/cases/screens/CasesListScreen'
import { CaseDetailScreen } from '@/features/cases/screens/CaseDetailScreen'
import { AssignCaseScreen } from '@/features/cases/screens/AssignCaseScreen'
import { ChangeCaseStatusScreen } from '@/features/cases/screens/ChangeCaseStatusScreen'
import { CreateCaseScreen } from '@/features/cases/screens/CreateCaseScreen'
import { EditCaseScreen } from '@/features/cases/screens/EditCaseScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { MaintenanceOverviewScreen } from '@/features/home/MaintenanceOverviewScreen'
import { AdministrationHomeScreen } from '@/features/admin/screens/AdministrationHomeScreen'
import { MaintenanceAdminScreen } from '@/features/admin/screens/MaintenanceAdminScreen'
import { MaintenanceUsersScreen } from '@/features/admin/screens/MaintenanceUsersScreen'
import { MaintenanceModuleScreen } from '@/features/admin/screens/MaintenanceModuleScreen'
import { UsersScreen } from '@/features/admin/screens/UsersScreen'
import { AreasScreen } from '@/features/areas/screens/AreasScreen'
import { MaintenanceActivitiesScreen } from '@/features/activities/screens/MaintenanceActivitiesScreen'
import { hasPermission } from '@/features/auth/permissions'
import { CategoriesScreen } from '@/features/categories/screens/CategoriesScreen'
import { MaintenanceCoordinatorScreen } from '@/features/coordinator/screens/MaintenanceCoordinatorScreen'
import { ProfileScreen } from '@/features/settings/ProfileScreen'
import { MaintenanceTechnicianScreen } from '@/features/technician/screens/MaintenanceTechnicianScreen'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

import type {
  AdministrationStackParamList,
  CoordinatorStackParamList,
  MainStackParamList,
  MainTabParamList,
  TechnicianStackParamList,
} from './types'

const Stack = createNativeStackNavigator<MainStackParamList>()
const AdministrationStack = createNativeStackNavigator<AdministrationStackParamList>()
const CoordinatorStack = createNativeStackNavigator<CoordinatorStackParamList>()
const TechnicianStack = createNativeStackNavigator<TechnicianStackParamList>()
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
      <Stack.Screen component={CasesListScreen} name="Cases" options={{ title: 'Casos' }} />
      <Stack.Screen
        component={CreateCaseScreen}
        name="CreateCase"
        options={{ title: 'Crear caso' }}
      />
      <Stack.Screen
        component={CaseDetailScreen}
        name="CaseDetail"
        options={{ title: 'Detalle del caso' }}
      />
      <Stack.Screen component={EditCaseScreen} name="EditCase" options={{ title: 'Editar caso' }} />
      <Stack.Screen
        component={ChangeCaseStatusScreen}
        name="ChangeCaseStatus"
        options={{ title: 'Cambiar estado' }}
      />
      <Stack.Screen
        component={AssignCaseScreen}
        name="AssignCase"
        options={{ title: 'Asignar personal' }}
      />
    </Stack.Navigator>
  )
}

function AdministrationNavigator() {
  return (
    <AdministrationStack.Navigator
      initialRouteName={usesMaintenanceDataModel() ? 'MaintenanceAdmin' : 'AdministrationHome'}
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
        component={MaintenanceAdminScreen}
        name="MaintenanceAdmin"
        options={{ title: 'Mantenimiento' }}
      />
      <AdministrationStack.Screen
        component={MaintenanceModuleScreen}
        name="MaintenanceModule"
        options={({ route }) => ({ title: route.params.title })}
      />
      <AdministrationStack.Screen
        component={MaintenanceActivitiesScreen}
        name="MaintenanceActivities"
        options={{ title: 'Actividades' }}
      />
      <AdministrationStack.Screen
        component={MaintenanceUsersScreen}
        name="MaintenanceUsers"
        options={{ title: 'Usuarios y roles' }}
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
        options={{ title: 'Categorías' }}
      />
    </AdministrationStack.Navigator>
  )
}

function CoordinatorNavigator() {
  return (
    <CoordinatorStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <CoordinatorStack.Screen
        component={MaintenanceCoordinatorScreen}
        name="MaintenanceCoordinator"
        options={{ headerShown: false }}
      />
      <CoordinatorStack.Screen
        component={MaintenanceModuleScreen}
        name="MaintenanceModule"
        options={({ route }) => ({ title: route.params.title })}
      />
      <CoordinatorStack.Screen
        component={MaintenanceActivitiesScreen}
        name="MaintenanceActivities"
        options={{ title: 'Actividades' }}
      />
    </CoordinatorStack.Navigator>
  )
}

function TechnicianNavigator() {
  return (
    <TechnicianStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <TechnicianStack.Screen
        component={MaintenanceTechnicianScreen}
        name="MaintenanceTechnician"
        options={{ headerShown: false }}
      />
      <TechnicianStack.Screen
        component={MaintenanceModuleScreen}
        name="MaintenanceModule"
        options={({ route }) => ({ title: route.params.title })}
      />
    </TechnicianStack.Navigator>
  )
}

const TAB_ICONS = {
  Home: ['home-outline', 'home'],
  CasesTab: ['folder-open-outline', 'folder-open'],
  Profile: ['person-outline', 'person'],
  Administration: ['settings-outline', 'settings'],
  Coordinator: ['clipboard-outline', 'clipboard'],
  Technician: ['construct-outline', 'construct'],
} as const

export function MainNavigator() {
  const role = useAuthStore((state) => state.profile?.role)
  const canManageAreas = hasPermission(role, 'areas.manage')
  const maintenanceMode = usesMaintenanceDataModel()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons color={color} name={TAB_ICONS[route.name][focused ? 1 : 0]} size={size} />
        ),
      })}
    >
      {maintenanceMode && role === 'administrador' ? (
        <Tab.Screen
          component={AdministrationNavigator}
          name="Administration"
          options={{ title: 'Administrar' }}
        />
      ) : null}
      {maintenanceMode && role === 'coordinador' ? (
        <Tab.Screen
          component={CoordinatorNavigator}
          name="Coordinator"
          options={{ title: 'Coordinar' }}
        />
      ) : null}
      {maintenanceMode && role === 'tecnico' ? (
        <Tab.Screen
          component={TechnicianNavigator}
          name="Technician"
          options={{ title: 'Mi trabajo' }}
        />
      ) : null}
      {!maintenanceMode || role !== 'tecnico' ? (
        <Tab.Screen
          component={maintenanceMode ? MaintenanceOverviewScreen : HomeScreen}
          name="Home"
          options={{
            title: maintenanceMode ? (role === 'visualizador' ? 'Panel' : 'Resumen') : 'Inicio',
          }}
        />
      ) : null}
      {!maintenanceMode ? (
        <Tab.Screen component={CasesNavigator} name="CasesTab" options={{ title: 'Casos' }} />
      ) : null}
      {!maintenanceMode && canManageAreas ? (
        <Tab.Screen
          component={AdministrationNavigator}
          name="Administration"
          options={{ title: 'Administrar' }}
        />
      ) : null}
      <Tab.Screen component={ProfileScreen} name="Profile" options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  )
}
