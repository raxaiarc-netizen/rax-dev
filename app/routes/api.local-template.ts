import { json } from '@remix-run/cloudflare';

// Only works in Node.js environment (development)
async function readLocalTemplate(templateName: string) {
  try {
    // Dynamic import for Node.js modules (only available in development)
    const fs = await import('fs');
    const path = await import('path');
    
    // Path to local templates folder
    const templatesDir = path.join(process.cwd(), 'templates', templateName);
    
    console.log(`Reading local template from: ${templatesDir}`);
    
    if (!fs.existsSync(templatesDir)) {
      throw new Error(`Template directory not found: ${templatesDir}`);
    }

    const files: { name: string; path: string; content: string }[] = [];

    // Recursive function to read all files
    const readDirectory = (dirPath: string, basePath: string = '') => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

        // Skip common unwanted directories and files
        if (
          entry.name.startsWith('.git') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.DS_Store'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          readDirectory(fullPath, relativePath);
        } else if (entry.isFile()) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({
              name: entry.name,
              path: relativePath,
              content,
            });
          } catch (error) {
            console.warn(`Failed to read file: ${fullPath}`, error);
          }
        }
      }
    };

    readDirectory(templatesDir);

    console.log(`✅ Loaded ${files.length} files from local template: ${templateName}`);
    
    return files;
  } catch (error) {
    console.error('Error reading local template:', error);
    throw error;
  }
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const templateName = url.searchParams.get('name');

  if (!templateName) {
    return json({ error: 'Template name is required' }, { status: 400 });
  }

  // Check if we're in a Node.js environment (not Cloudflare Workers)
  if (typeof process === 'undefined' || !process.cwd) {
    return json(
      {
        error: 'Local templates are only supported in development mode (Node.js environment)',
        hint: 'Set USE_LOCAL_TEMPLATES to false in production or use GitHub templates',
      },
      { status: 500 }
    );
  }

  try {
    const files = await readLocalTemplate(templateName);
    return json(files);
  } catch (error) {
    console.error('Error loading local template:', error);
    
    return json(
      {
        error: 'Failed to load local template',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 404 }
    );
  }
}
