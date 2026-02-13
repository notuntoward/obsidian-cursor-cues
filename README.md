# Visible Cursor

Never lose your cursor again! Smart visual cues for Obsidian with block cursor and intelligent highlighting.

![Plugin Demo](screenshots/demo.gif)
*Flash effects help you track cursor movement across your notes*

## The Problem

Obsidian's default cursor can be difficult to track when:
- Scrolling through long documents
- Switching between notes or panes
- Using keyboard navigation (Home, End, Page Up/Down)
- Working on large displays or with smaller text

## The Solution

**Visible Cursor** provides visual cues when your cursor moves, making it impossible to lose track of your position.

![Before and After](screenshots/before-after.png)
*Left: Default Obsidian cursor easily lost • Right: Visible Cursor with flash effect*

## Features

**Block Cursor Mode**: Real-time character highlighting using CodeMirror Decoration API  
**Line Highlighting**: Left-aligned or cursor-centered gradients  
**Theme-Aware Colors**: Uses Obsidian accent color by default, updates automatically  
**Smart Detection**: Uses pixel distance to detect real cursor jumps  
**Jump Key Support**: Flash on Home, End, Ctrl+Home, Ctrl+End, Ctrl+A, Ctrl+E  
**End-of-Line Support**: Widget decoration renders visible block at line end

## Visual Examples

### Custom Cursor Styles

![Cursor Styles](screenshots/cursor-styles.png)
*Choose between block cursor (left) or thick vertical cursor (right)*

### Line Highlight Options

![Line Highlights](screenshots/line-highlights.png)
*Flash effects: Left-to-right, Centered, Right-to-left*

## Installation

Download latest release → Extract to `.obsidian/plugins/visible-cursor/` → Reload

Or install from Community Plugins (search "Visible Cursor").

## Settings Guide

### Cursor Appearance

![Cursor Settings](screenshots/settings-cursor.png)

**Show custom cursor**
- "Always on" for persistent highlighting (including at end of line)
- "Only during flash" for temporary emphasis  
- "Off" to disable (use Obsidian default)

**Custom cursor style**
- "Block" - Full character highlight
- "Thick vertical" - 3px wide cursor line

### Flash Effect

![Flash Settings](screenshots/settings-flash.png)

**Line highlight** (default: centered)
- "Left" for left-to-right fade
- "Centered" for cursor-focused highlighting
- "Right" for right-to-left fade
- "Off" for character decoration only

**Flash duration** (default: 0.5s)
- Control how long the flash effect lasts (0.2s - 1.5s)

**Flash size** (default: 8 characters)
- Adjust the width of the line highlight (4-15 characters)

### Flash Triggers

![Trigger Settings](screenshots/settings-triggers.png)

**On scroll** (default: ON)
- Show flash when the view scrolls significantly

**On file switch** (default: ON)
- Show flash when switching between notes or panes

### Colors

![Color Settings](screenshots/settings-colors.png)

**Use theme colors** (default: ON)
- Matches your Obsidian theme accent color
- Updates automatically when theme changes
- Turn off for manual light/dark control

## What's New in v1.0.14

### New Features
- Added "Flash after cursor jump keys" option for Home, End, Ctrl+Home, Ctrl+End, Ctrl+A, Ctrl+E
- Renamed "blink on cursor jumps" to "Flash on long single move repeats" for clarity
- Arrow keys now trigger flashes (via document-level keydown/keyup listeners with capture phase)

### Renamed Throughout
- All "blink" terminology replaced with "flash"
- All "beacon" terminology replaced with "cue"
- Plugin renamed from "Obsidian Beacon" → "Visible Cursor"

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

---

## Screenshot Guide for Plugin Developers

To ensure screenshots render correctly in both GitHub and the Obsidian Community Plugin store:

### Directory Structure
```
obsidian-visible-cursor/
├── README.md
└── screenshots/
    ├── demo.gif
    ├── before-after.png
    ├── cursor-styles.png
    ├── line-highlights.png
    ├── settings-cursor.png
    ├── settings-flash.png
    ├── settings-triggers.png
    └── settings-colors.png
```

### Recommended Screenshots

1. **demo.gif** - Animated GIF showing the plugin in action
   - Capture cursor movement, scrolling, and flash effects
   - 5-10 seconds, optimized to <2MB
   - Recommended size: 800-1200px wide

2. **before-after.png** - Split comparison
   - Left side: Default Obsidian (cursor hard to see)
   - Right side: With Visible Cursor active
   - Annotate with arrows or labels

3. **cursor-styles.png** - Show both cursor options
   - Side-by-side: block cursor vs thick vertical
   - Include text to show cursor at different positions

4. **line-highlights.png** - Demonstrate flash modes
   - Show all three line highlight options
   - Capture mid-flash for visibility

5. **settings-*.png** - Settings panel screenshots
   - Capture each settings section
   - Show default values
   - 600-800px wide for readability

### Image Best Practices

- **Format**: PNG for screenshots, GIF for animations
- **Size**: Keep images under 500KB (GIFs under 2MB)
- **Resolution**: 2x for Retina displays, but optimize file size
- **Annotations**: Use arrows, boxes, or labels to highlight features
- **Theme**: Show both light and dark themes if relevant
- **Compression**: Use tools like TinyPNG or ImageOptim

### Markdown Syntax

For GitHub and Obsidian Community Plugin store compatibility, use:

```markdown
![Alt text](screenshots/filename.png)
*Caption text in italics*
```

Or for more control:
```markdown
<img src="screenshots/filename.png" alt="Alt text" width="600">
```

The Community Plugin store will automatically render images from your GitHub repository's `main` or `master` branch.
