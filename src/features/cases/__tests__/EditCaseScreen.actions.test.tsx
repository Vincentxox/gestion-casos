import { render } from '@testing-library/react-native'

import { EditCaseScreen } from '../screens/EditCaseScreen'

let mockActions: {
  data: { editar_datos?: { allowed: boolean } } | undefined
  isPending: boolean
  isFetching: boolean
  error: Error | null
} = { data: { editar_datos: { allowed: true } }, isPending: false, isFetching: false, error: null }

jest.mock('../useCases', () => ({
  useCaseActions: () => mockActions,
  useCaseDetail: () => ({
    data: {
      title: 'Caso',
      description: 'Descripción',
      categoryId: 'cat',
      location: 'Oficina',
      priority: 'media',
    },
    isLoading: false,
    error: null,
  }),
  useUpdateCase: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
jest.mock('../components/CaseForm', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return { CaseForm: () => <Text>Formulario de edición</Text> }
})

const props = {
  navigation: { goBack: jest.fn() },
  route: { params: { caseId: 'case-1' } },
} as unknown as Parameters<typeof EditCaseScreen>[0]

beforeEach(() => {
  mockActions = {
    data: { editar_datos: { allowed: true } },
    isPending: false,
    isFetching: false,
    error: null,
  }
})

test('conserva el formulario durante una recarga con permiso confirmado', async () => {
  const screen = await render(<EditCaseScreen {...props} />)
  expect(screen.getByText('Formulario de edición')).toBeTruthy()

  mockActions = { ...mockActions, isFetching: true }
  await screen.rerender(<EditCaseScreen {...props} />)
  expect(screen.getByText('Formulario de edición')).toBeTruthy()
  expect(screen.queryByText('No tienes permiso para editar esta solicitud')).toBeNull()
})

test('la primera carga no muestra el formulario y la respuesta vacía no concede permiso', async () => {
  mockActions = { data: undefined, isPending: true, isFetching: true, error: null }
  const screen = await render(<EditCaseScreen {...props} />)
  expect(screen.queryByText('Formulario de edición')).toBeNull()

  mockActions = { data: {}, isPending: false, isFetching: false, error: null }
  await screen.rerender(<EditCaseScreen {...props} />)
  expect(screen.getByText('No tienes permiso para editar esta solicitud')).toBeTruthy()
})
