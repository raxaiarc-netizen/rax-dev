# Local Templates Guide

This guide explains how to use local templates instead of fetching from GitHub.

## Why Use Local Templates?

✅ **Faster development** - No network requests  
✅ **Custom templates** - Create your own without GitHub  
✅ **Offline development** - Work without internet  
✅ **Easy testing** - Quickly iterate on template changes  

## Setup Instructions

### 1. Enable Local Templates

Edit `/app/utils/constants.ts` and change:

```typescript
export const USE_LOCAL_TEMPLATES = true;  // Change from false to true
```

### 2. Create Template Folder Structure

```
templates/
├── Vite React/          # Must match template name from STARTER_TEMPLATES
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   └── public/
│       └── vite.svg
│
├── Vue/
│   ├── package.json
│   ├── ...
│
└── Angular/
    ├── package.json
    └── ...
```

### 3. Template Name Mapping

The folder name must **exactly match** the template name from `STARTER_TEMPLATES` in `/app/utils/constants.ts`:

| Template Name in Code | Folder Name Required |
|----------------------|---------------------|
| `Vite React` | `templates/Vite React/` |
| `Vue` | `templates/Vue/` |
| `Angular` | `templates/Angular/` |
| `Expo App` | `templates/Expo App/` |

## How It Works

1. When `USE_LOCAL_TEMPLATES = true`, Bolt checks the `templates/` folder first
2. If local template exists, it loads files from there
3. If local template doesn't exist, it **falls back to GitHub**
4. This means you can have some templates local and others from GitHub!

## Creating a Custom Template

### Example: Creating a Simple React Template

1. Create folder: `templates/Vite React/`

2. Add `package.json`:
```json
{
  "name": "vite-react-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

3. Add `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

4. Add `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

5. Add `src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

6. Add `src/App.tsx`:
```typescript
import React from 'react'

function App() {
  return (
    <div>
      <h1>Hello from Local Template!</h1>
    </div>
  )
}

export default App
```

## Testing Your Template

1. Set `USE_LOCAL_TEMPLATES = true` in `/app/utils/constants.ts`
2. Start the dev server: `pnpm run dev`
3. Create a new app in Bolt
4. Check the console - you should see: "✅ Loaded local template: Vite React (X files)"

## Debugging

### Template Not Loading?

Check console for errors:
- `Attempting to load local template: [name]` - Trying local first
- `✅ Loaded local template: [name]` - Success!
- `Local template not found, falling back to GitHub` - Using GitHub instead

### Common Issues

1. **Folder name doesn't match** - Check `/app/utils/constants.ts` for exact name
2. **Node.js required** - Local templates only work in development (not Cloudflare Workers)
3. **File permissions** - Ensure the templates folder is readable

## Performance Notes

- **Local templates** load in ~50-200ms
- **GitHub templates** can take 2-5 seconds
- Use local templates for development, GitHub for production

## Best Practices

1. **Keep templates minimal** - Only include essential files
2. **Use .gitignore in templates** - Add a `.gitignore` inside each template folder
3. **Document dependencies** - Add comments in `package.json`
4. **Test before committing** - Ensure templates work in Bolt
5. **Version control** - Commit templates to Git for team sharing

## Example Repository Structure

```
rax.ai-main/
├── templates/           # Your local templates
│   ├── Vite React/
│   ├── Vue/
│   └── Custom Template/
├── app/
│   └── utils/
│       └── constants.ts  # Set USE_LOCAL_TEMPLATES = true here
└── TEMPLATES_GUIDE.md   # This file
```

## Switching Back to GitHub Templates

Simply set in `/app/utils/constants.ts`:

```typescript
export const USE_LOCAL_TEMPLATES = false;
```

All templates will now be fetched from GitHub repositories defined in `STARTER_TEMPLATES`.
