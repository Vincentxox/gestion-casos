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
  Users: undefined
  Areas: undefined
  Categories: undefined
}

export type MainTabParamList = {
  Home: undefined
  CasesTab: NavigatorScreenParams<MainStackParamList> | undefined
  Profile: undefined
  Administration: NavigatorScreenParams<AdministrationStackParamList> | undefined
}
