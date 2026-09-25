export type PhotoKind = 'antes' | 'despues'

export interface CasePhoto {
  id: string
  caseId: string
  kind: PhotoKind
  imagePath: string
  thumbPath: string
  uploadedBy: string
  confirmedAt: string | null
  createdAt: string
}

export interface PhotoReservation {
  id: string
  bucket: string
  imagePath: string
  thumbPath: string
}

export interface PreparedPhoto {
  fullUri: string
  thumbUri: string
}

export interface PendingPhoto extends PreparedPhoto {
  localId: string
  userId: string
  caseId: string
  kind: PhotoKind
  reservation: PhotoReservation | null
  fullUploaded: boolean
  thumbUploaded: boolean
  attempts: number
  status: 'queued' | 'uploading' | 'error'
  error: string | null
  retryOnReconnect?: boolean
}
