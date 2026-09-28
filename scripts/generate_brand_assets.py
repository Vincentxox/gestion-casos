from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
MASTER = ASSETS / "nexo-casos-logo-master.png"

BACKGROUND = (245, 247, 250, 255)
ADAPTIVE_BACKGROUND = (234, 243, 252, 255)


def trim_transparent(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    return image.crop(bbox) if bbox else image


def centered_canvas(size: int, logo: Image.Image, logo_ratio: float, background) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    target = int(size * logo_ratio)
    fitted = logo.copy()
    fitted.thumbnail((target, target), Image.Resampling.LANCZOS)
    position = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.alpha_composite(fitted, position)
    return canvas


def main() -> None:
    source = trim_transparent(Image.open(MASTER).convert("RGBA"))

    centered_canvas(1024, source, 0.68, BACKGROUND).convert("RGB").save(
        ASSETS / "icon.png", quality=95
    )
    centered_canvas(1024, source, 0.62, (0, 0, 0, 0)).save(
        ASSETS / "android-icon-foreground.png"
    )
    Image.new("RGBA", (1024, 1024), ADAPTIVE_BACKGROUND).save(
        ASSETS / "android-icon-background.png"
    )

    monochrome = Image.new("RGBA", source.size, (0, 0, 0, 0))
    monochrome.putalpha(source.getchannel("A"))
    centered_canvas(1024, monochrome, 0.62, (0, 0, 0, 0)).save(
        ASSETS / "android-icon-monochrome.png"
    )

    centered_canvas(512, source, 0.7, (0, 0, 0, 0)).save(ASSETS / "splash-icon.png")
    centered_canvas(256, source, 0.76, (0, 0, 0, 0)).save(ASSETS / "logo-mark.png")
    centered_canvas(64, source, 0.78, BACKGROUND).convert("RGB").save(
        ASSETS / "favicon.png", quality=95
    )


if __name__ == "__main__":
    main()
