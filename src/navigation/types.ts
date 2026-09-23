import type { NavigatorScreenParams } from '@react-navigation/native'
import type { CaseAction, CaseStatus } from '@/features/cases/types'
import type { ScopeFilter, StatusFilter } from '@/features/cases/caseListPresentation'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

export type MainStackParamList = {
  Cases:
    | {
        scope?: ScopeFilter
        status?: StatusFilter
        exactStatus?: CaseStatus
        priority?: 'alta'
        sinceDays?: number
        activeOnly?: boolean
      }
    | undefined
  CreateCase: undefined
  CaseDetail: { caseId: string }
  EditCase: { caseId: string }
  ChangeCaseStatus: { caseId: string; action?: CaseAction }
  AssignCase: { caseId: string }
  CaseResources: { caseId: string }
}

export type AdministrationStackParamList = {
  AdministrationHome: undefined
  Users: undefined
  Areas: undefined
  Categories: undefined
  Invitations: undefined
  Organization: undefined
  Resources: undefined
  AccessRequests: undefined
}

export type MainTabParamList = {
  Home: undefined
  CasesTab: NavigatorScreenParams<MainStackParamList> | undefined
  Profile: undefined
  Administration: NavigatorScreenParams<AdministrationStackParamList> | undefined
}
