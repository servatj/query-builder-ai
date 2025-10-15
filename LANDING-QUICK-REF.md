# Landing Page - Astro Quick Reference

## 🚀 Quick Commands

```bash
# Development
cd landing && npm run dev              # Dev server at localhost:4321
npm run dev:landing                    # From project root

# Build
cd landing && npm run build            # Build for production
npm run build:landing                  # From project root

# Preview
cd landing && npm run preview          # Preview production build
npm run start:landing                  # From project root
```

## 📁 Key Files

| File/Folder | Purpose |
|-------------|---------|
| `src/pages/index.astro` | Homepage |
| `src/pages/blog/[slug].astro` | Blog post template |
| `src/components/` | UI components |
| `src/content/blog/` | Blog posts (Markdown) |
| `src/layouts/BaseLayout.astro` | HTML layout |
| `src/styles/global.css` | Global styles |
| `public/` | Static assets |
| `astro.config.mjs` | Astro config |

## ✏️ Adding a Blog Post

1. Create `src/content/blog/my-post.md`
2. Add frontmatter:
```yaml
---
title: "My Post Title"
date: "2024-10-20"
author: "Author Name"
excerpt: "Brief description"
tags: ["tag1", "tag2"]
---
```
3. Write content
4. Done! (Auto-routes to `/blog/my-post`)

## 🔧 Common Tasks

### Edit Homepage Sections
- Hero: `src/components/Hero.astro`
- Features: `src/components/Features.astro`
- Blog list: `src/components/Blog.astro`
- CTA: `src/components/CTA.astro`

### Edit Styles
- Global: `src/styles/global.css`
- Component-specific: Add `<style>` block in .astro files

### Change Navigation
Edit `src/components/Header.astro`

### Change Footer
Edit `src/components/Footer.astro`

## 🐳 Docker

```bash
# Build
docker build -f Dockerfile.landing -t maisql-landing .

# Run
docker run -p 8080:80 maisql-landing

# Visit: http://localhost:8080
```

## 📊 URLs

- **Dev**: http://localhost:4321
- **Blog Posts**: http://localhost:4321/blog/[slug]
- **Docker**: http://localhost:8080

## 🔍 Troubleshooting

```bash
# Check for errors
npm run astro check

# Clear cache and rebuild
rm -rf node_modules .astro dist
npm install
npm run build

# View build output
ls -la dist/
```

## 📚 Learn More

- [Astro Docs](https://docs.astro.build)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Project README](landing/README.md)
- [Migration Guide](LANDING-ASTRO-MIGRATION.md)
