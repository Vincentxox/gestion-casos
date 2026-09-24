import type { NavigatorScreenParams } from '@react-navigation/native'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

export type MainStackParamList = {
  Cases: undefined
  CreateCase: undefined
  CaseDetail: { caseId: string }
  EditCase: { caseId: string }
  ChangeCaseStatus: { caseId: string }
  AssignCase: { caseId: string }
}

export type AdministrationStackParamList = {
  AdministrationHome: undefined
  MaintenanceAdmin: undefined
  MaintenanceModule: MaintenanceModuleParams
  MaintenanceActivities: { initialSection?: 'agregar' | 'lista' } | undefined
  MaintenanceUsers: { pendingOnly?: boolean } | undefined
  Users: undefined
  Areas: undefined
  Categories: undefined
}

export type MaintenanceModuleSection =
  'Agregar' | 'Ver lista' | 'Editar' | 'Generar' | 'Registrar avance'

export type MaintenanceModuleParams = {
  title: string
  sections?: MaintenanceModuleSection[]
}

export type CoordinatorStackParamList = {
  MaintenanceCoordinator: undefined
  MaintenanceModule: MaintenanceModuleParams
  MaintenanceActivities: { initialSection?: 'agregar' | 'lista' } | undefined
}

export type TechnicianStackParamList = {
  MaintenanceTechnician: undefined
  MaintenanceModule: MaintenanceModuleParams
}

export type MainTabParamList = {
  Home: undefined
  CasesTab: NavigatorScreenParams<MainStackParamList> | undefined
  Profile: undefined
  Administration: NavigatorScreenParams<AdministrationStackParamList> | undefined
  Coordinator: NavigatorScreenParams<CoordinatorStackParamList> | undefined
  Technician: NavigatorScreenParams<TechnicianStackParamList> | undefined
}
