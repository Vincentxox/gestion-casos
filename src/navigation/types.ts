import type { NavigatorScreenParams } from '@react-navigation/native'
import type { CaseAction, CaseStatus } from '@/features/cases/types'
import type { ScopeFilter, StatusFilter } from '@/features/cases/caseListPresentation'
import type { QuickStatusFilter } from '@/features/cases/caseSearch'

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
        quick?: QuickStatusFilter
        overdueOnly?: boolean
        statuses?: CaseStatus[]
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
  CaseReport: { caseId: string }
  ReportReview: { caseId: string }
  Notifications: undefined
  Indicators: undefined
}

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined
  NotificationsFlow: undefined
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
  PriorityTargets: undefined
}

export type MainTabParamList = {
  Home: undefined
  CasesTab: NavigatorScreenParams<MainStackParamList> | undefined
  Help: undefined
  Profile: undefined
  Administration: NavigatorScreenParams<AdministrationStackParamList> | undefined
}
