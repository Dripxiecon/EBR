# EBR — Erotic Based Rendering

EBR is an experimental real-time rendering project exploring a material workflow built around seven specialized surface maps.

This repository currently contains the first interactive rendering prototype. It is a technical graphics experiment: a sphere, a movable light, a camera, independently switchable material maps, and automatic map generation from a supplied color texture.

## Current prototype

- Web-based 3D viewport using WebGL through Three.js.
- UV sphere test object.
- Movable point light with transform gizmo.
- Orbit camera controls.
- Independent visibility switches for all seven EBR maps.
- Color-map upload and procedural fallback texture.
- Experimental map generation and live material preview.
- Designed to remain usable on lower-powered Android hardware, including the Samsung Galaxy A05.

## The seven maps

1. **Color** — base surface color.
2. **Wetness** — blue-tinted grayscale wetness data.
3. **Ero** — maroon/red effect mask. Its shader settings determine the resulting effect color.
4. **Yonic** — green-scale organic surface data, combining optical response with encoded surface-detail behavior.
5. **Oil** — neutral grayscale oil/specular intensity.
6. **Thick** — grayscale with a subtle purple tint, controlling subsurface-thickness behavior.
7. **Ambiguous** — a purple/orange/yellow displacement palette. Purple represents complex displacement, orange represents intermediate displacement, and yellow represents the lightest displacement range.

The exact channel values and decoder semantics are still experimental. The prototype keeps the map identities separate so their encoding can be refined without confusing one map with another.

## Run

Open `index.html` in a modern browser with internet access. The prototype loads Three.js from a pinned CDN version.

For local development, serve the repository directory with any static HTTP server. Opening the file directly may be restricted by some browsers.

## Scope

This is the EBR rendering prototype only. It is not the eventual full modeling and animation application. The initial goal is to validate map generation, map decoding, lighting response, and visual stability before expanding the toolset.

## Safety and content context

The project concerns rendering technology, shader behavior, material maps, and 3D graphics research. It does not include explicit imagery or non-consensual content.

## License

See [LICENSE](LICENSE).
