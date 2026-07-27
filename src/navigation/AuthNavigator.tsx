import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { LoginScreen } from '@/features/auth/screens/LoginScreen'
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen'
import { colors } from '@/theme/tokens'

import type { AuthStackParamList } from './types'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen component={LoginScreen} name="Login" options={{ headerShown: false }} />
      <Stack.Screen
        component={RegisterScreen}
        name="Register"
        options={{ headerTitle: 'Registro' }}
      />
    </Stack.Navigator>
  )
}
