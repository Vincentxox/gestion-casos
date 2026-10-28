import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

const MAX_BYTES = 1024 * 1024
const MAX_SIDE = 512

export async function prepareProfilePhoto(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  if (width <= 0 || height <= 0) throw new Error('No fue posible leer la imagen seleccionada.')
  const side = Math.min(width, height)
  const target = Math.min(side, MAX_SIDE)

  for (const quality of [0.8, 0.6, 0.4]) {
    const context = ImageManipulator.manipulate(uri)
    context.crop({
      originX: Math.floor((width - side) / 2),
      originY: Math.floor((height - side) / 2),
      width: side,
      height: side,
    })
    if (side > MAX_SIDE) context.resize({ width: target, height: target })
    const image = await context.renderAsync()
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality })
    if (new File(saved.uri).size <= MAX_BYTES) return saved.uri
  }

  throw new Error('La foto supera 1 MB incluso después de comprimirla. Elige otra imagen.')
}
