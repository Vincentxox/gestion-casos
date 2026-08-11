export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

export type MainStackParamList = {
  Home: undefined
  Cases: undefined
  CreateCase: undefined
  CaseDetail: { caseId: string }
}
