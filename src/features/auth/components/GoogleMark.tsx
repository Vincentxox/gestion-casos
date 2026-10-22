import Svg, { Path } from 'react-native-svg'

/** Four-color G in Google's standard proportions, drawn as a native SVG. */
export function GoogleMark() {
  return (
    <Svg accessibilityLabel="Google" height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M21.35 11.1H12v3.8h5.35c-.23 1.2-.92 2.23-1.96 2.92v2.4h3.19c1.87-1.72 2.92-4.25 2.92-7.22 0-.65-.05-1.27-.15-1.9Z"
        fill="#4285F4"
      />
      <Path
        d="M12 22c2.7 0 4.96-.9 6.58-2.43l-3.19-2.4c-.89.6-2.02.95-3.39.95-2.61 0-4.82-1.76-5.61-4.13H3.1v2.6C4.72 19.81 8.09 22 12 22Z"
        fill="#34A853"
      />
      <Path
        d="M6.39 13.99C6.19 13.39 6.08 12.7 6.08 12s.11-1.39.31-1.99V7.4H3.1C2.4 8.79 2 10.35 2 12s.4 3.21 1.1 4.6l3.29-2.61Z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.87c1.43 0 2.71.49 3.72 1.46l2.78-2.78C16.82 2.98 14.59 2 12 2 8.09 2 4.72 4.19 3.1 7.4l3.29 2.61C7.18 7.64 9.39 5.87 12 5.87Z"
        fill="#EA4335"
      />
    </Svg>
  )
}
