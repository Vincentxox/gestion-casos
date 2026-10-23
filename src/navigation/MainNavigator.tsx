import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import { Icon } from '@/components/ui/Icon'

import { CasesListScreen } from '@/features/cases/screens/CasesListScreen'
import { CaseDetailScreen } from '@/features/cases/screens/CaseDetailScreen'
import { AssignCaseScreen } from '@/features/cases/screens/AssignCaseScreen'
import { ChangeCaseStatusScreen } from '@/features/cases/screens/ChangeCaseStatusScreen'
import { CreateCaseScreen } from '@/features/cases/screens/CreateCaseScreen'
import { EditCaseScreen } from '@/features/cases/screens/EditCaseScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen'
import { IndicatorsScreen } from '@/features/home/IndicatorsScreen'
import { PriorityTargetsScreen } from '@/features/admin/screens/PriorityTargetsScreen'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import { getAdminAlerts } from '@/features/home/homePresentation'
import { AdministrationHomeScreen } from '@/features/admin/screens/AdministrationHomeScreen'
import { AccessRequestsScreen } from '@/features/admin/screens/AccessRequestsScreen'
import { UsersScreen } from '@/features/admin/screens/UsersScreen'
import { InvitationsScreen } from '@/features/admin/screens/InvitationsScreen'
import { OrganizationScreen } from '@/features/admin/screens/OrganizationScreen'
import { AreasScreen } from '@/features/areas/screens/AreasScreen'
import { hasPermission } from '@/features/auth/permissions'
import { CategoriesScreen } from '@/features/categories/screens/CategoriesScreen'
import { HelpScreen } from '@/features/help/HelpScreen'
import { GuidedTourOverlay } from '@/features/help/tour/GuidedTourOverlay'
import { useGuidedTour } from '@/features/help/tour/useGuidedTour'
import { ProfileScreen } from '@/features/settings/ProfileScreen'
import { ResourcesScreen } from '@/features/resources/screens/ResourcesScreen'
import { CaseResourcesScreen } from '@/features/resources/screens/CaseResourcesScreen'
import { CaseReportScreen } from '@/features/reports/screens/CaseReportScreen'
import { ReportReviewScreen } from '@/features/reports/screens/ReportReviewScreen'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

import { FloatingTabBar } from './FloatingTabBar'

import type {
  AdministrationStackParamList,
  MainStackParamList,
  MainTabParamList,
  RootStackParamList,
} from './types'

const Stack = createNativeStackNavigator<MainStackParamList>()
const RootStack = createNativeStackNavigator<RootStackParamList>()
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
        options={{ headerShown: false }}
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
      <Stack.Screen component={CaseReportScreen} name="CaseReport" options={{ title: 'Reporte' }} />
      <Stack.Screen
        component={ReportReviewScreen}
        name="ReportReview"
        options={{ title: 'Revisar reporte' }}
      />
      <Stack.Screen
        component={IndicatorsScreen}
        name="Indicators"
        options={{ title: 'Indicadores' }}
      />
    </Stack.Navigator>
  )
}

function NotificationsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Notifications"
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        component={NotificationsScreen}
        name="Notifications"
        options={({ navigation }) => ({
          title: 'Avisos',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver a Inicio"
              onPress={() => navigation.getParent()?.goBack()}
              style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
            >
              <Icon name="arrow-back" color={colors.primary} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        component={CaseDetailScreen}
        name="CaseDetail"
        options={{ headerShown: false }}
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
      <Stack.Screen component={CaseReportScreen} name="CaseReport" options={{ title: 'Reporte' }} />
      <Stack.Screen
        component={ReportReviewScreen}
        name="ReportReview"
        options={{ title: 'Revisar reporte' }}
      />
    </Stack.Navigator>
  )
}

export function MainRootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen component={MainNavigator} name="MainTabs" />
      <RootStack.Screen component={NotificationsNavigator} name="NotificationsFlow" />
    </RootStack.Navigator>
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
      <AdministrationStack.Screen
        component={PriorityTargetsScreen}
        name="PriorityTargets"
        options={{ title: 'Plazos por prioridad' }}
      />
    </AdministrationStack.Navigator>
  )
}

export function MainNavigator() {
  const userId = useAuthStore((state) => state.profile?.id)
  const hydrateTour = useGuidedTour((state) => state.hydrate)
  useEffect(() => {
    void hydrateTour(userId)
  }, [hydrateTour, userId])
  const role = useAuthStore((state) => state.profile?.role)
  const organizationId = useAuthStore((state) => state.profile?.organizationId)
  const home = useHomeSummary(Boolean(organizationId))
  const areaId = useAuthStore((state) => state.profile?.areaId)
  const canManageAreas = hasPermission(role, 'areas.manage')
  const canCreate = hasPermission(role, 'cases.create') && Boolean(areaId)
  const adminPending = home.data?.admin ? getAdminAlerts(home.data.admin).length : 0
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
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <>
          <FloatingTabBar
            {...props}
            onCreate={
              canCreate
                ? () =>
                    props.navigation.navigate('CasesTab', { screen: 'CreateCase', initial: false })
                : undefined
            }
          />
          <GuidedTourOverlay state={props.state} navigation={props.navigation} />
        </>
      )}
    >
      <Tab.Screen component={HomeScreen} name="Home" options={{ title: 'Inicio' }} />
      <Tab.Screen
        component={CasesNavigator}
        name="CasesTab"
        options={{ title: caseTabTitle, tabBarLabel: 'Solicitudes' }}
      />
      {canManageAreas ? (
        <Tab.Screen
          component={AdministrationNavigator}
          name="Administration"
          options={{
            title: 'Administrar',
            tabBarLabel: 'Admin',
            tabBarBadge: adminPending || undefined,
          }}
        />
      ) : null}
      <Tab.Screen component={HelpScreen} name="Help" options={{ title: 'Ayuda' }} />
      <Tab.Screen component={ProfileScreen} name="Profile" options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  )
}
