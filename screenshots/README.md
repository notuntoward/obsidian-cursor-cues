# Screenshots Directory

This directory contains screenshots for the Visible Cursor plugin README.

## Required Screenshots

### 1. demo.gif (Primary Demo)
**Purpose**: Show the plugin in action  
**Content**:
- Open a note in Obsidian
- Use keyboard navigation (arrow keys, Page Down, Home, End)
- Switch between notes
- Scroll through content
- Show the flash effects activating at each action
**Specs**: 
- Animated GIF, 5-10 seconds
- 800-1200px wide
- Optimized to <2MB
- Frame rate: 10-15 fps

### 2. before-after.png
**Purpose**: Demonstrate the problem and solution  
**Content**:
- Split-screen or side-by-side comparison
- Left: Default Obsidian cursor (hard to spot)
- Right: Same view with Visible Cursor active (flash effect visible)
- Add text labels: "Before: Cursor easily lost" and "After: Always visible"
**Specs**: 1200px wide, PNG, <500KB

### 3. cursor-styles.png
**Purpose**: Show both cursor style options  
**Content**:
- Two side-by-side examples
- Left: Block cursor style (character highlighted)
- Right: Thick vertical cursor style (3px line)
- Show cursor in middle of text and at end of line
- Label each style clearly
**Specs**: 800px wide, PNG, <300KB

### 4. line-highlights.png
**Purpose**: Demonstrate flash effect options  
**Content**:
- Three examples stacked vertically
- Top: Left-to-right gradient flash
- Middle: Centered gradient flash
- Bottom: Right-to-left gradient flash
- Capture mid-flash for maximum visibility
- Label each mode
**Specs**: 800px wide, PNG, <400KB

### 5. settings-cursor.png
**Purpose**: Show cursor appearance settings  
**Content**:
- Screenshot of "Cursor Appearance" section in settings
- Show both options visible
- Capture default values
**Specs**: 600-800px wide, PNG, <300KB

### 6. settings-flash.png
**Purpose**: Show flash effect settings  
**Content**:
- Screenshot of "Flash Effect" section in settings
- Show line highlight dropdown expanded
- Show flash duration and size sliders
**Specs**: 600-800px wide, PNG, <300KB

### 7. settings-triggers.png
**Purpose**: Show when flash activates  
**Content**:
- Screenshot of "Flash Triggers" section in settings
- Show toggle switches for scroll and file switch
**Specs**: 600-800px wide, PNG, <200KB

### 8. settings-colors.png
**Purpose**: Show color customization  
**Content**:
- Screenshot of "Colors" section in settings
- Optional: Show with "Use theme colors" OFF to display color pickers
**Specs**: 600-800px wide, PNG, <300KB

## Capture Tips

### For Settings Screenshots
1. Open Obsidian Settings → Community Plugins → Visible Cursor
2. Use Windows Snipping Tool (Win+Shift+S) or Mac Screenshot (Cmd+Shift+4)
3. Crop to just the relevant settings section
4. Save as PNG

### For Demo GIF
**Tools**:
- Windows: ScreenToGif (free) or LICEcap
- Mac: GIPHY Capture or Kap
- Cross-platform: OBS Studio + ezgif.com converter

**Recording Process**:
1. Set Obsidian window to ~1000px wide
2. Use a readable font size (14-16pt)
3. Start recording
4. Perform actions slowly and deliberately
5. Pause between actions for clarity
6. Stop recording after 10 seconds max
7. Export as GIF, optimize with ezgif.com

### For Before/After Screenshot
1. Take screenshot with plugin disabled (cursor hard to see)
2. Enable plugin and position cursor in same location
3. Wait for a flash effect, capture mid-flash
4. Use image editor to combine side-by-side
5. Add labels and annotations

## Image Optimization

Before committing:
- **PNG**: Use TinyPNG.com or ImageOptim
- **GIF**: Use ezgif.com optimizer
- Target: <500KB per PNG, <2MB for GIF
- Verify images display correctly on GitHub

## Testing Display

After adding screenshots, verify they render correctly:
1. Commit and push to GitHub
2. Check README on GitHub repository
3. Verify relative paths work: `screenshots/filename.png`
4. If submitting to Obsidian Community Plugins, they'll fetch from your `main` branch

## Notes

- Screenshots should use a clean, readable theme (default or popular community theme)
- Avoid showing personal information in notes
- Use placeholder text if needed ("Lorem ipsum" or generic content)
- Both light and dark mode screenshots can be helpful
- Update this README if screenshot requirements change
