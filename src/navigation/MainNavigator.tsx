import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { CasesListScreen } from '@/features/cases/screens/CasesListScreen'
import { CaseDetailScreen } from '@/features/cases/screens/CaseDetailScreen'
import { AssignCaseScreen } from '@/features/cases/screens/AssignCaseScreen'
import { ChangeCaseStatusScreen } from '@/features/cases/screens/ChangeCaseStatusScreen'
import { CreateCaseScreen } from '@/features/cases/screens/CreateCaseScreen'
import { EditCaseScreen } from '@/features/cases/screens/EditCaseScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { colors } from '@/theme/tokens'

import type { MainStackParamList } from './types'

const Stack = createNativeStackNavigator<MainStackParamList>()

export function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen component={HomeScreen} name="Home" options={{ headerShown: false }} />
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
