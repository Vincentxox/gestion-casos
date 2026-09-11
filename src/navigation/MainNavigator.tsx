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
import { AdministrationHomeScreen } from '@/features/admin/screens/AdministrationHomeScreen'
import { UsersScreen } from '@/features/admin/screens/UsersScreen'
import { AreasScreen } from '@/features/areas/screens/AreasScreen'
import { hasPermission } from '@/features/auth/permissions'
import { CategoriesScreen } from '@/features/categories/screens/CategoriesScreen'
import { ProfileScreen } from '@/features/settings/ProfileScreen'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

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
        options={{ title: 'Categorías' }}
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
  const canManageAreas = hasPermission(role, 'areas.manage')

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
      <Tab.Screen component={HomeScreen} name="Home" options={{ title: 'Inicio' }} />
      <Tab.Screen component={CasesNavigator} name="CasesTab" options={{ title: 'Casos' }} />
      {canManageAreas ? (
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
