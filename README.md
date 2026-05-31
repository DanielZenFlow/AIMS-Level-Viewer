# AIMS Level Viewer

AIMS Level Viewer is a small standalone browser tool for inspecting MAvis
Hospital `.lvl` files.

Current release: `v1.0.0`.

It opens directly in a browser and renders the level map, agents, boxes, walls,
goals, colors, and basic level details. It is intentionally simpler than AIMS
Replay Viewer: there is no replay playback or recorder, only level browsing and
inspection.

## Quick Start

Open:

```text
index.html
```

The bundled `levels-manifest.js` contains the levels included at release time,
so the viewer shows a level immediately after opening. You can also load your
own files with:

- `Read level LVL` for a single `.lvl` file;
- `Add directory` for every `.lvl` file in a folder;
- drag-and-drop for one or more `.lvl` files.

## Viewer Features

- browse levels grouped by folder;
- filter by level name, folder, or path;
- switch quickly with the up/down level buttons;
- remove a level from the current list after confirmation;
- pan and zoom the board;
- track an object such as `agent0` or `boxA`;
- highlight a coordinate such as `28,3`;
- inspect level dimensions, goals, walls, agents, boxes, and color assignments.

Removing a level from the list does not delete the `.lvl` file from disk.

## Updating the Bundled Level List

The generated manifest can be rebuilt from a MAvis project that has `levels/`,
`complevels/`, or `complevels26/` folders:

```cmd
python generate_manifest.py --root C:\path\to\mavis-project --out levels-manifest.js
```

Refresh the browser after regenerating the manifest.
