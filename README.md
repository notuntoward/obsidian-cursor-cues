# Visible Cursor

Never lose your cursor again! Smart visual cues for Obsidian with block cursor and intelligent highlighting.

## Features

**Block Cursor Mode**: Real-time character highlighting using CodeMirror Decoration API  
**Line Highlighting**: Left-aligned or cursor-centered gradients  
**Theme-Aware Colors**: Uses Obsidian accent color by default, updates automatically  
**Smart Detection**: Uses pixel distance to detect real cursor jumps  
**Jump Key Support**: Flash on Home, End, Ctrl+Home, Ctrl+End, Ctrl+A, Ctrl+E  
**End-of-Line Support**: Widget decoration renders visible block at line end

## What's New in v1.0.14

### New Features
- Added "Flash after cursor jump keys" option for Home, End, Ctrl+Home, Ctrl+End, Ctrl+A, Ctrl+E
- Renamed "blink on cursor jumps" to "Flash on long single move repeats" for clarity
- Arrow keys now trigger flashes (via document-level keydown/keyup listeners with capture phase)

### Renamed Throughout
- All "blink" terminology replaced with "flash"
- All "beacon" terminology replaced with "cue"
- Plugin renamed from "Obsidian Beacon" to "Cursor Cues"

## Installation

Download latest release → Extract to `.obsidian/plugins/visible-cursor/` → Reload

Or install from Community Plugins (search "Visible Cursor").

## Settings Guide

**Block cursor** (default: flash only)
- "Always on" for persistent highlighting (including at end of line)
- "Flash only" for temporary emphasis  
- "Off" to disable

**Flash line highlight** (default: centered)
- "Left" for left-to-right fade
- "Centered" for cursor-focused highlighting
- "Off" for character decoration only

**Use theme colors** (default: ON)
- Matches your Obsidian theme accent color
- Updates automatically when theme changes
- Turn off for manual light/dark control

**Flash on long single move repeats** (default: ON)
- Shows cue when cursor moves large pixel distance from held key (>200px)
- Uses arrow keys, Page Up/Down, Home, End, and Emacs navigation keys

**Flash after cursor jump keys** (default: ON)
- Shows cue after pressing: Home, End, Ctrl+Home, Ctrl+End, Ctrl+A, Ctrl+E
- Useful for tracking cursor position with fast navigation

**Flash on window scrolls** (default: ON)
- Show cue when view scrolls significantly

**Flash on window changes** (default: ON)
- Show cue when switching between files or panes

**Flash on mouse click** (default: OFF)
- Show cue when clicking to move cursor

## Changelog

### v1.0.14
- **New**: Flash after cursor jump keys (Home, End, Ctrl+Home, Ctrl+End, Ctrl+A, Ctrl+E)
- **Renamed**: "blink on cursor jumps" → "Flash on long single move repeats"
- **Fixed**: Arrow keys now properly trigger flashes
- **Renamed**: Plugin name: "Obsidian Beacon" → "Visible Cursor"
- **Replaced**: All "beacon" references with "cue"
- **Replaced**: All "blink" references with "flash"

### v1.0.13
- Fixed: End-of-line block cursor using WidgetDecoration
- Widget creates actual DOM element instead of trying to style non-existent character

### v1.0.12
- Fixed: Theme colors update when theme changes
- Fixed: Uses pixel distance to prevent unwanted flashing

See GitHub for full changelog.