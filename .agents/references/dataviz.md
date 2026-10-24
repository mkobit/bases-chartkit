# Data visualization reference

Use this guide to select chart palettes, gradients, and axes.

## Color palette selection

### Sequential palettes
Use sequential palettes for ordered numeric data that increases in magnitude.
Use a single hue or multi-hue gradient with monotonic lightness progression.
Do not use rainbow or multi-hue cyclic gradients for sequential values.

### Diverging palettes
Use diverging palettes for data with a meaningful midpoint (e.g., zero, target, average).
Use two contrasting hues that meet at a neutral, light midpoint.
Ensure both sides have equal perceptual weight.

### Categorical palettes
Use categorical palettes for discrete, unordered categories.
Use distinct hues with similar perceptual lightness and saturation.
Limit categorical palettes to 7 to 10 distinct colors.

## Accessibility and contrast

### Contrast ratios
Maintain a minimum contrast ratio of 4.5:1 for text labels and numbers against the background.
Maintain a minimum contrast ratio of 3:1 for graphical marks (bars, lines, points) against adjacent elements.

### Color-vision deficiency (CVD)
Do not encode meaning with color alone.
Use secondary indicators such as symbols, line patterns, or direct text labels.
Avoid red-green only contrast.
Select palettes that remain distinguishable under protanopia, deuteranopia, and tritanopia.

## Axes and scales

### Baselines
Always start bar and column chart value axes at zero to avoid visual distortion.
Line charts and scatter plots do not require a zero baseline if showing small relative variations.

### Labels and intervals
Use clean, human-readable tick intervals (e.g., multiples of 1, 2, 5, 10).
Rotate or stagger axis labels when categories collide.
