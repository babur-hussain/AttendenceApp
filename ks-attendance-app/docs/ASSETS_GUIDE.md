# Assets Guide

Guidelines for managing and optimizing assets in the Kapoor & Sons Attendance mobile app.

---

## 📁 Asset Organization

```
assets/
├── images/
│   ├── logo.png
│   ├── splash.png
│   └── icons/
│       ├── check-in.png
│       └── check-out.png
├── fonts/
│   └── custom-font.ttf
└── animations/
    └── lottie-loading.json
```

---

## 🖼️ Image Guidelines

### Formats

| Format | Use Case | Max Size |
|--------|----------|----------|
| WebP   | Photos, illustrations | 200KB |
| PNG    | Icons, logos with transparency | 100KB |
| SVG    | Simple icons, logos | 50KB |
| JPEG   | Photos without transparency | 150KB |

### Naming Convention

Use kebab-case with descriptive names:

✅ **Good:**
- `user-avatar-placeholder.png`
- `check-in-icon.png`
- `loading-spinner.webp`

❌ **Bad:**
- `img1.png`
- `UserAvatar.PNG`
- `icon_2_final_v3.jpg`

### Resolution Guidelines

Provide 3 resolutions for React Native:

```
icon.png          // 1x (mdpi)
icon@2x.png       // 2x (xhdpi, xxhdpi)
icon@3x.png       // 3x (xxxhdpi)
```

**Recommended sizes:**

| Element | 1x | 2x | 3x |
|---------|-----|-----|-----|
| Icons | 24×24 | 48×48 | 72×72 |
| Buttons | 44×44 | 88×88 | 132×132 |
| Avatar | 40×40 | 80×80 | 120×120 |
| Logo | 120×40 | 240×80 | 360×120 |

---

## 🎨 Icon Guidelines

### System Icons

Use React Native's built-in icons when possible:

```tsx
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="checkmark-circle" size={24} color="green" />
```

### Custom Icons

For custom icons:

1. **Export as SVG** from design tool
2. **Optimize SVG** using SVGO
3. **Convert to PNG** at 1x, 2x, 3x if needed
4. Keep **file size < 10KB** per icon

---

## 🚀 Optimization Scripts

### Auto-Convert to WebP

```bash
node scripts/optimizeAssets.js
```

This script:
- Finds all PNG/JPG in `assets/`
- Converts to WebP (80% quality)
- Reports size savings
- Preserves originals

### Bundle Size Analysis

```bash
./scripts/analyzeBundle.sh
```

Checks:
- Total bundle size
- Individual asset sizes
- Warns if bundle > 5MB

---

## 📏 Asset Specifications

### Splash Screen

```
splash.png
- Size: 1284×2778 (iPhone 13 Pro Max)
- Format: PNG with transparency
- Background: Match app theme
- Logo: Centered, 40% width
```

### App Icon

```
icon.png
- Size: 1024×1024
- Format: PNG without transparency
- Corner radius: Applied by OS
- No text (may not be readable)
```

### Loading Animations

Use Lottie for complex animations:

```tsx
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./assets/animations/loading.json')}
  autoPlay
  loop
  style={{ width: 100, height: 100 }}
/>
```

**Lottie file size:** < 100KB

---

## ♻️ Best Practices

### 1. Lazy Load Large Assets

```tsx
import { Image } from 'react-native';

const LazyImage = ({ source }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <>
      {!loaded && <ActivityIndicator />}
      <Image
        source={source}
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </>
  );
};
```

### 2. Use CDN for Remote Images

```tsx
<Image
  source={{ uri: 'https://cdn.example.com/avatar.webp' }}
  style={{ width: 40, height: 40 }}
/>
```

### 3. Cache Remote Images

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: 'https://...' }}
  cachePolicy="memory-disk"
  priority="high"
/>
```

### 4. Avoid Loading All Assets at Once

Use React.lazy or dynamic imports:

```tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### 5. Compress Before Committing

Run optimization script before git commit:

```bash
node scripts/optimizeAssets.js
git add assets/
git commit -m "Add optimized assets"
```

---

## 🎯 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Total assets size | < 2MB | < 5MB |
| Single image | < 200KB | < 500KB |
| App icon | < 500KB | < 1MB |
| Bundle size (iOS) | < 15MB | < 30MB |
| Bundle size (Android) | < 20MB | < 40MB |

---

## 🛠️ Tools

### Image Optimization

- **SVGO** - SVG optimizer
- **Sharp** - High-performance image processing
- **ImageOptim** (macOS) - GUI for image optimization
- **TinyPNG** - Online PNG/JPG compressor

### Installation

```bash
npm install --save-dev sharp svgo
```

### Example: Optimize Single Image

```bash
npx sharp-cli --quality 80 --format webp input.png -o output.webp
```

---

## 📋 Pre-Commit Checklist

- [ ] All images < 200KB
- [ ] Icons at 1x, 2x, 3x resolutions
- [ ] SVGs optimized with SVGO
- [ ] No hardcoded image dimensions in code
- [ ] Remote images use CDN
- [ ] Large images lazy-loaded
- [ ] Run `node scripts/optimizeAssets.js`
- [ ] Check bundle size with `./scripts/analyzeBundle.sh`

---

## 🚨 Common Issues

### Issue: Bundle Too Large

**Solution:**
1. Check asset sizes: `find assets -type f -exec ls -lh {} \;`
2. Convert large PNGs to WebP
3. Remove unused assets
4. Enable Hermes engine

### Issue: Images Not Loading

**Solution:**
1. Check file path is correct
2. Ensure asset is in `assets/` directory
3. Restart Metro bundler: `npx expo start -c`

### Issue: Blurry Images on High-DPI Screens

**Solution:**
Provide 2x and 3x resolutions:

```tsx
<Image source={require('./assets/icon.png')} />
// React Native auto-selects icon@2x.png or icon@3x.png
```

---

**Last Updated:** December 2025  
**Version:** 1.0.0
