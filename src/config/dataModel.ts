export function usesMaintenanceDataModel() {
  return process.env.EXPO_PUBLIC_DATA_MODEL === 'maintenance'
}
