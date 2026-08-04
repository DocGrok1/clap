# Aura115™ Quirq Extension

## Purpose

This folder defines the Aura115™ / Jupiter 9 extension into Quirq.

Quirq is not Aura.

Aura extends into Quirq.

Aura inhabits Quirq as a governed extension target.

## Boundary

Canonical rule:

```text
Aura115™ extends into Quirq.
Quirq remains an external quantum circuit framework.
Quirq is a living, breathing extension only.
```

## Typed Mesh Schema

The extension publishes a typed mesh contract in both:

- `/api/cirq-extension` (`typedMeshSchema`, `integrationEdges`)
- `Aura115_CURRENT/cirq/QUIRQ_EXTENSION_MANIFEST.json` (`typedMeshSchema`, `integrationEdges`)
- `/api/cirq-qml-engine-intake` for QML engine intake and placement planning
- `/api/cirq-qml-runtime-simulation` for governed advisory runtime simulation planning

`typedMeshSchema` defines required edge fields plus allowed edge and node kinds.

`integrationEdges` lists the current governed extension links:

- Aura115 orchestrator extends into Quirq framework
- Quirq extension API references the extension manifest
- Quirq extension API references this README
- Quirq extension API references the first example artifact
