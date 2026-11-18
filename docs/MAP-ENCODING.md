# EBR Map Encoding — Working Draft

This document records the visual identity currently chosen for each EBR map. It is a working specification, not a frozen file-format contract.

## Map palette identities

| Map | Palette identity | Current intended meaning |
|---|---|---|
| Color | Natural RGB | Base surface color |
| Wetness | Blue-tinted grayscale | Wetness amount and wet-surface response |
| Ero | Maroon/red family | Effect mask; effect output color is controlled separately |
| Yonic | Green-scale | Organic optical response plus encoded deformation instructions |
| Oil | Neutral grayscale | Oil/specular intensity |
| Thick | Grayscale with a subtle purple tint | Subsurface thickness |
| Ambiguous | Purple, orange, yellow | Purple: complex displacement; orange: intermediate displacement; yellow: lightest displacement |

## Encoding rules

- Each map has a separate identity and decoder.
- Data maps must be sampled as linear data, not display-color textures.
- The Color map is the only map treated as sRGB color input by default.
- Lossless image formats are preferred for authored maps. JPEG artifacts can corrupt reserved palette values.
- The Ero effect color is a material parameter, not painted into the Ero mask.
- Exact RGB triplets, channel packing, bit depth, alpha-channel behavior, and Yonic special-value meanings still need to be agreed before the format is considered stable.

## Current prototype behavior

The prototype generates companion maps heuristically from the Color map. This is only a starting point for visual testing. Generated maps are not guaranteed to infer artistic intent correctly.

The Ambiguous decoder currently treats the purple/orange/yellow family as a provisional displacement signal. The Yonic decoder currently previews its green-scale optical response; special deformation codes are not finalized yet.
