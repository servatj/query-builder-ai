# Maisql Landing Page

This is the landing page for Maisql, built with [Astro](https://astro.build).

## 🚀 Project Structure

```
/
├── public/
│   └── logo.png
├── src/
│   ├── components/
│   │   ├── Blog.astro
│   │   ├── CTA.astro
│   │   ├── Features.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   └── Hero.astro
│   ├── content/
│   │   ├── blog/
│   │   │   └── welcome-to-maisql.md
│   │   └── config.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── blog/
│   │   │   └── [slug].astro
│   │   └── index.astro
│   └── styles/
│       └── global.css
└── package.json
```

## 🧞 Commands

All commands are run from the root of the landing directory:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:4321`      |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |

## 📝 Adding Blog Posts

1. Create a new `.md` file in `src/content/blog/`
2. Add frontmatter with the following fields:
   ```yaml
   ---
   title: "Your Post Title"
   date: "YYYY-MM-DD"
   author: "Author Name"
   excerpt: "Brief description of the post"
   tags: ["tag1", "tag2"]
   ---
   ```
3. Write your content in Markdown
4. The post will automatically appear on the homepage and have its own page at `/blog/[slug]`

## 🐳 Docker

The landing page is built using Docker multi-stage builds:
- Build stage: Compiles the Astro site
- Production stage: Serves static files with nginx

Build and run:
```bash
docker build -f Dockerfile.landing -t maisql-landing .
docker run -p 8080:80 maisql-landing
```

## 🎨 Customization

- **Styles**: Edit `src/styles/global.css` for global styles
- **Components**: Modify components in `src/components/`
- **Content**: Update text and links directly in component files
- **Configuration**: Adjust `astro.config.mjs` for site settings

## 🌐 Running from Root

From the project root, you can use these npm scripts:

```bash
npm run dev:landing    # Start development server
npm run build:landing  # Build for production
npm run start:landing  # Preview production build
```
