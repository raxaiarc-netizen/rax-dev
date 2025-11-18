# Local Templates Directory

This directory contains local templates that can be used instead of fetching from GitHub.

## Quick Start

1. **Enable local templates** in `/app/utils/constants.ts`:
   ```typescript
   export const USE_LOCAL_TEMPLATES = true;
   ```

2. **Create a template folder** with the exact name from `STARTER_TEMPLATES`:
   ```
   templates/Vite React/
   ```

3. **Add your template files** to that folder

4. **Restart your dev server** and create a new app in Bolt

## Template Folder Names

Folder names must **exactly match** the template names defined in `/app/utils/constants.ts`:

- `Vite React`
- `Vue`
- `Angular`
- `Expo App`
- `NextJS Shadcn`
- etc.

## How It Works

When `USE_LOCAL_TEMPLATES = true`:
1. Bolt checks this folder for templates first
2. If found, loads files from here (fast! ~50ms)
3. If not found, falls back to GitHub (slower, ~2-5s)

This means you can mix local and GitHub templates!

## Example Template Structure

```
templates/
└── Vite React/              ← Folder name matches template name
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   └── App.css
    └── public/
        └── vite.svg
```

## Creating Your First Template

See detailed instructions in `/TEMPLATES_GUIDE.md`

## Tips

- Keep templates minimal (only essential files)
- Test in Bolt before committing
- Add `.gitignore` inside each template if needed
- Document any special setup in template's README

## Need Help?

Read the full guide: `/TEMPLATES_GUIDE.md`
