# QUIRQ™ SVG Circuit SMS Payload Spec (v1)

## Scope
Cirq-compatible QUIRQ™ structural memory simulation format for transporting SVG primitive cards over text channels.

## Protocol Identifier
- `QS1`

## Full Payload Layout
`QS1|<w36>.<h36>|<cell>;<cell>;...|<checksum36>`

- `w36`, `h36`: SVG width/height encoded base36 (bounded 1..4095)
- `cell`: one encoded primitive
- `checksum36`: base36 FNV-1a style 32-bit hash over `QS1|<w36>.<h36>|<cells>`

## Primitive Cell Grammar
### Circle
`C.<cx36>.<cy36>.<r36>.<fillCode>`

### Rect
`R.<x36>.<y36>.<w36>.<h36>.<fillCode>`

## Fill Codes
Named palette:
- `R` red
- `B` blue
- `G` green
- `Y` yellow
- `K` black
- `W` white
- `O` orange
- `P` purple
- `C` cyan
- `M` magenta

Extended hex:
- `H` + `RRGGBB` (example `HFF00AA`)

## Circuit Mapping (Prototype)
- Circle cell (`C`) → gate sequence: `RY(geometry)` then `RZ(fill_phase)`
- Rect cell (`R`) → gate sequence: `RX(geometry)` then `RZ(fill_phase)`

## Transport Targets
- SMS
- RCS
- iMessage
- QR text payloads
- Standard chat channels

## Example
Input SVG:
```xml
<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="50" fill="red"/>
  <rect x="30" y="30" width="60" height="60" fill="blue"/>
</svg>
```

Representative payload shape:
```text
QS1|3C.3C|C.1O.1O.1E.R;R.U.U.1O.1O.B|<checksum>
```

## Runtime Boundary
- Advisory simulation only
- No hardware execution
- No Python quantum runtime execution from this route
