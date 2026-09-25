import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

import type { PreparedPhoto } from './types'

async function renderJpeg(
  uri: string,
  width: number,
  height: number,
  maxSide: number,
  quality: number,
) {
  const context = ImageManipulator.manipulate(uri)
  if (Math.max(width, height) > maxSide) {
    context.resize(
      width >= height ? { width: maxSide, height: null } : { width: null, height: maxSide },
    )
  }
  const image = await context.renderAsync()
  return image.saveAsync({ format: SaveFormat.JPEG, compress: quality })
}

export async function preparePhoto(
  uri: string,
  width: number,
  height: number,
): Promise<PreparedPhoto> {
  let full = await renderJpeg(uri, width, height, 1600, 0.8)
  if (new File(full.uri).size > 2 * 1024 * 1024) {
    full = await renderJpeg(uri, width, height, 1600, 0.6)
  }
  if (new File(full.uri).size > 2 * 1024 * 1024) {
    throw new Error('La foto supera 2 MB incluso después de comprimirla. Elige otra imagen.')
  }
  const thumb = await renderJpeg(uri, width, height, 400, 0.7)
  return { fullUri: full.uri, thumbUri: thumb.uri }
}
