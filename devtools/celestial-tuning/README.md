# Archived celestial tuner

`CelestialTuningPanel.tsx` preserves the temporary sliders, numeric inputs,
drag handle, Copy/Reset controls, and Shift+F freeze shortcut. It is not imported
by the application and is outside the application's `src` build scope.

For future reuse, mount it inside the Three scene behind `import.meta.env.DEV`,
passing `config`, `defaults`, and `onChange` from a temporary `useState` owner
that also supplies the discovery placements. It creates and cleans up its own
DOM overlay. Keep all imports and runtime wiring development-only.

The freeze control also needs this former guard at the beginning of
`StarScene`'s `useFrame` callback in `CelestialSky.tsx`:

```tsx
if (import.meta.env.DEV && camera.userData.celestialDevFrozen) {
  motion.current.awake = false
  return
}
```

That guard and the tuner's state, import, and render call have been removed
from the active application. The final composition lives in the hard-coded
`defaultConfig` in `src/components/Hero/CelestialDiscoveries.tsx`.
