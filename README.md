# AIMS Level Viewer

AIMS Level Viewer is a standalone browser viewer for MAvis Hospital `.lvl`
level files.

Current release: `v1.0.0`.

## Overview

The viewer renders Hospital levels as an interactive board and shows the level's
walls, goals, agents, boxes, object colors, dimensions, and source metadata. It
runs entirely in the browser and can be opened from the local filesystem.

## Quick Start

Open:

```text
index.html
```

The release includes a generated `levels-manifest.js`, so bundled levels are
listed immediately after the page opens.

## Loading Levels

The viewer supports three loading methods:

- `Read level LVL`: load one `.lvl` file.
- `Add directory`: load all `.lvl` files from a selected directory.
- Drag and drop: drop one or more `.lvl` files into the drop zone.

Loaded levels are grouped by source folder. The filter field matches level
names, source folders, and paths.

## Features

- Render `.lvl` maps with walls, goals, agents, boxes, and colors.
- Pan and zoom the board.
- Browse levels by source folder.
- Move to the previous or next level with the arrow buttons.
- Remove levels from the current browser list after confirmation.
- Track an object such as `agent0` or `boxA`.
- Highlight a coordinate such as `28,3`.
- Inspect level dimensions, goal counts, wall counts, objects, and color
  assignments.

Removing a level from the browser list does not delete the `.lvl` file from
disk.

## Updating Bundled Levels

Regenerate `levels-manifest.js` from a project that contains `levels/`,
`complevels/`, or `complevels26/`:

```cmd
python generate_manifest.py --root C:\path\to\mavis-project --out levels-manifest.js
```

Refresh the browser after regenerating the manifest.
