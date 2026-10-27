import {
  createNativeStackNavigator,
  type NativeStackHeaderProps,
} from '@react-navigation/native-stack'

import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { PendingInvitationScreen } from '@/features/auth/screens/PendingInvitationScreen'
import { RequestOrganizationScreen } from '@/features/auth/screens/RequestOrganizationScreen'
import { colors } from '@/theme/tokens'
import type { PendingOrganizationStackParamList } from './types'

const Stack = createNativeStackNavigator<PendingOrganizationStackParamList>()

function renderHeader({ navigation }: NativeStackHeaderProps) {
  return <ScreenHeader title="Solicitar una empresa" onBack={navigation.goBack} />
}

export function PendingOrganizationNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        header: renderHeader,
      }}
    >
      <Stack.Screen
        component={PendingInvitationScreen}
        name="PendingHome"
        options={{ headerShown: false }}
      />
      <Stack.Screen component={RequestOrganizationScreen} name="RequestOrganization" />
    </Stack.Navigator>
  )
}
