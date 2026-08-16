# GenLayer Spinner: Consensus in Motion

An animated loading indicator built from the three geometric pieces of the GenLayer mark. The opposing wings trade emphasis while moving toward the center, representing independent validators converging on consensus. The complete mark rotates on a constant linear loop so the first and last frames join without a jump.

## Deliverables

- Standalone animated SVG: [`public/genlayer-spinner.svg`](public/genlayer-spinner.svg)
- Reusable React component: [`src/components/GenLayerSpinner.tsx`](src/components/GenLayerSpinner.tsx)
- CSS animation and reduced-motion rules: [`src/app/globals.css`](src/app/globals.css)

The standalone SVG has no JavaScript, fonts, libraries, or external assets. It is transparent, scales to any size, remains recognizable at 16px, and uses an electric GenLayer blue selected for visibility on both light and dark surfaces.

## Usage

```html
<img src="/genlayer-spinner.svg" width="32" height="32" alt="Loading" />
```

```tsx
<GenLayerSpinner size={32} label="Loading markets" />
```

The React component also accepts a `color` property for surface-specific contrast. Both versions honor `prefers-reduced-motion` and display the complete static GenLayer mark when animation is disabled.
