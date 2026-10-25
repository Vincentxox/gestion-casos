import { render } from '@testing-library/react-native'
import { EmptyState } from '../EmptyState'

jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
    return <Text testID={`icon-${name}`}>{name}</Text>
  },
}))

test.each([
  ['firstUse', 'add-circle-outline'],
  ['allDone', 'checkmark-done-outline'],
] as const)('%s muestra el icono correcto', async (variant, icon) => {
  const screen = await render(<EmptyState title="Estado" message="Detalle" variant={variant} />)
  expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy()
})
