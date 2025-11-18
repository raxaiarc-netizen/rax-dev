import ignore from 'ignore';
import type { ProviderInfo } from '~/types/model';
import type { Template } from '~/types/template';
import { STARTER_TEMPLATES, USE_LOCAL_TEMPLATES, LOCAL_TEMPLATES_PATH } from './constants';

const starterTemplateSelectionPrompt = (templates: Template[]) => `
You are an experienced developer who helps people choose the best starter template for their projects.
IMPORTANT: Vite is preferred
IMPORTANT: Only choose shadcn templates if the user explicitly asks for shadcn.

Available templates:
<template>
  <name>blank</name>
  <description>Empty starter for simple scripts and trivial tasks that don't require a full template setup</description>
  <tags>basic, script</tags>
</template>
${templates
  .map(
    (template) => `
<template>
  <name>${template.name}</name>
  <description>${template.description}</description>
  ${template.tags ? `<tags>${template.tags.join(', ')}</tags>` : ''}
</template>
`,
  )
  .join('\n')}

Response Format:
<selection>
  <templateName>{selected template name}</templateName>
  <title>{a proper title for the project}</title>
</selection>

Examples:

<example>
User: I need to build a todo app
Response:
<selection>
  <templateName>Vite React</templateName>
  <title>Todo List Application</title>
</selection>
</example>

<example>
User: Write a script to generate numbers from 1 to 100
Response:
<selection>
  <templateName>blank</templateName>
  <title>script to generate numbers from 1 to 100</title>
</selection>
</example>

Instructions:
1. For trivial tasks and simple scripts, always recommend the blank template
2. For more complex projects, recommend templates from the provided list
3. Follow the exact XML format
4. Consider both technical requirements and tags
5. If no perfect match exists, recommend the closest option

Important: Provide only the selection tags in your response, no additional text.
MOST IMPORTANT: YOU DONT HAVE TIME TO THINK JUST START RESPONDING BASED ON HUNCH 
`;

const templates: Template[] = STARTER_TEMPLATES.filter((t) => !t.name.includes('shadcn'));

// Fallback heuristic-based template selection when API fails
const selectTemplateByHeuristic = (message: string): { template: string; title: string } => {
  const lowerMessage = message.toLowerCase();
  
  // Check for specific keywords - using ACTUAL template names from STARTER_TEMPLATES
  if (lowerMessage.includes('react') || lowerMessage.includes('todo') || lowerMessage.includes('app')) {
    console.log('Heuristic: Selecting Vite React template based on keywords');
    return {
      template: 'Vite React',  // Matches name in STARTER_TEMPLATES
      title: 'React Application',
    };
  }
  
  if (lowerMessage.includes('vue')) {
    console.log('Heuristic: Selecting Vue template based on keywords');
    return {
      template: 'Vue',  // Matches name in STARTER_TEMPLATES
      title: 'Vue Application',
    };
  }
  
  if (lowerMessage.includes('angular')) {
    console.log('Heuristic: Selecting Angular template based on keywords');
    return {
      template: 'Angular',  // Matches name in STARTER_TEMPLATES
      title: 'Angular Application',
    };
  }
  
  if (lowerMessage.includes('next')) {
    console.log('Heuristic: Selecting NextJS template based on keywords');
    return {
      template: 'NextJS Shadcn',  // Matches name in STARTER_TEMPLATES
      title: 'Next.js Application',
    };
  }
  
  if (lowerMessage.includes('landing') || lowerMessage.includes('website')) {
    console.log('Heuristic: Selecting Vanilla Vite template for website');
    return {
      template: 'Vanilla Vite',  // Matches name in STARTER_TEMPLATES
      title: 'Website',
    };
  }
  
  // Default to Vite React for most app requests
  console.log('Heuristic: Defaulting to Vite React template');
  return {
    template: 'Vite React',  // Matches name in STARTER_TEMPLATES
    title: 'Application',
  };
};

const parseSelectedTemplate = (llmOutput: string): { template: string; title: string } | null => {
  try {
    if (!llmOutput || typeof llmOutput !== 'string') {
      console.error('Invalid LLM output for template selection:', llmOutput);
      return null;
    }

    console.log('Parsing template selection from:', llmOutput.substring(0, 500));

    // Extract content between <templateName> tags
    const templateNameMatch = llmOutput.match(/<templateName>(.*?)<\/templateName>/s);
    const titleMatch = llmOutput.match(/<title>(.*?)<\/title>/s);

    if (!templateNameMatch) {
      console.error('No templateName found in LLM output');
      return null;
    }

    const result = { 
      template: templateNameMatch[1].trim(), 
      title: titleMatch?.[1].trim() || 'Untitled Project' 
    };
    
    console.log('Parsed template selection:', result);
    return result;
  } catch (error) {
    console.error('Error parsing template selection:', error);
    return null;
  }
};

export const selectStarterTemplate = async (options: { message: string; model: string; provider: ProviderInfo }) => {
  const { message, model, provider } = options;
  
  console.log('Selecting starter template with:', { 
    message: message.substring(0, 100), 
    model, 
    providerName: provider.name 
  });
  
  try {
    const requestBody = {
      message,
      model,
      provider,
      system: starterTemplateSelectionPrompt(templates),
      streamOutput: false,
    };
    
    const response = await fetch('/api/llmcall', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Template selection API error:', response.status, response.statusText, errorText);
      
      // Fallback: Use simple heuristic-based selection
      return selectTemplateByHeuristic(message);
    }
  
  const respJson = (await response.json()) as any;
  console.log('Template selection response:', respJson);

  // Handle different response formats
  const text = respJson.text || respJson.response || respJson.content || '';
  
    if (!text) {
      console.error('No text in template selection response:', respJson);
      // Fallback to heuristic
      return selectTemplateByHeuristic(message);
    }

    const selectedTemplate = parseSelectedTemplate(text);

    if (selectedTemplate) {
      console.log('Template selected:', selectedTemplate);
      return selectedTemplate;
    } else {
      console.log('No template selected, using heuristic fallback');
      return selectTemplateByHeuristic(message);
    }
  } catch (error) {
    console.error('Error in template selection:', error);
    // Fallback to heuristic
    return selectTemplateByHeuristic(message);
  }
};

// Function to load templates from local folder
const getLocalTemplateContent = async (templateName: string): Promise<{ name: string; path: string; content: string }[]> => {
  try {
    const response = await fetch(`/api/local-template?name=${encodeURIComponent(templateName)}`);

    if (!response.ok) {
      throw new Error(`Local template not found: ${response.status}`);
    }

    const files = (await response.json()) as any;
    return files;
  } catch (error) {
    console.error('Error loading local template:', error);
    throw error;
  }
};

const getGitHubRepoContent = async (repoName: string): Promise<{ name: string; path: string; content: string }[]> => {
  try {
    // Instead of directly fetching from GitHub, use our own API endpoint as a proxy
    const response = await fetch(`/api/github-template?repo=${encodeURIComponent(repoName)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Our API will return the files in the format we need
    const files = (await response.json()) as any;

    return files;
  } catch (error) {
    console.error('Error fetching release contents:', error);
    throw error;
  }
};

export async function getTemplates(templateName: string, title?: string) {
  const template = STARTER_TEMPLATES.find((t) => t.name == templateName);

  if (!template) {
    return null;
  }

  // Try local templates first if enabled
  let files;
  if (USE_LOCAL_TEMPLATES) {
    try {
      console.log(`🔍 Attempting to load local template: ${templateName}`);
      files = await getLocalTemplateContent(templateName);
      console.log(`✅ SUCCESS! Loaded local template: ${templateName} (${files.length} files)`);
    } catch (error) {
      console.warn(`⚠️ Local template failed:`, error);
      console.log(`📦 Falling back to GitHub for: ${templateName}`);
      const githubRepo = template.githubRepo;
      files = await getGitHubRepoContent(githubRepo);
    }
  } else {
    console.log(`📦 Loading from GitHub (local templates disabled)`);
    const githubRepo = template.githubRepo;
    files = await getGitHubRepoContent(githubRepo);
  }

  let filteredFiles = files;

  /*
   * ignoring common unwanted files
   * exclude    .git
   */
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.git') == false);

  /*
   * exclude    lock files
   * WE NOW INCLUDE LOCK FILES FOR IMPROVED INSTALL TIMES
   */
  {
    /*
     *const comminLockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
     *filteredFiles = filteredFiles.filter((x) => comminLockFiles.includes(x.name) == false);
     */
  }

  // exclude    .rax
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.rax') == false);

  // check for ignore file in .rax folder
  const templateIgnoreFile = files.find((x) => x.path.startsWith('.rax') && x.name == 'ignore');

  const filesToImport = {
    files: filteredFiles,
    ignoreFile: [] as typeof filteredFiles,
  };

  if (templateIgnoreFile) {
    // redacting files specified in ignore file
    const ignorepatterns = templateIgnoreFile.content.split('\n').map((x) => x.trim());
    const ig = ignore().add(ignorepatterns);

    // filteredFiles = filteredFiles.filter(x => !ig.ignores(x.path))
    const ignoredFiles = filteredFiles.filter((x) => ig.ignores(x.path));

    filesToImport.files = filteredFiles;
    filesToImport.ignoreFile = ignoredFiles;
  }

  const assistantMessage = `
<raxArtifact id="imported-files" title="" type="bundled">
${filesToImport.files
  .map(
    (file) =>
      `<raxAction type="file" filePath="${file.path}">
${file.content}
</raxAction>`,
  )
  .join('\n')}
</raxArtifact>
`;
  let userMessage = ``;
  const templatePromptFile = files.filter((x) => x.path.startsWith('.rax')).find((x) => x.name == 'prompt');

  if (templatePromptFile) {
    userMessage = `
TEMPLATE INSTRUCTIONS:
${templatePromptFile.content}

---
`;
  }

  if (filesToImport.ignoreFile.length > 0) {
    userMessage =
      userMessage +
      `
STRICT FILE ACCESS RULES - READ CAREFULLY:

The following files are READ-ONLY and must never be modified:
${filesToImport.ignoreFile.map((file) => `- ${file.path}`).join('\n')}

Permitted actions:
✓ Import these files as dependencies
✓ Read from these files
✓ Reference these files

Strictly forbidden actions:
❌ Modify any content within these files
❌ Delete these files
❌ Rename these files
❌ Move these files
❌ Create new versions of these files
❌ Suggest changes to these files

Any attempt to modify these protected files will result in immediate termination of the operation.

If you need to make changes to functionality, create new files instead of modifying the protected ones listed above.
---
`;
  }

  userMessage += `
---
IMPORTANT CONTEXT: A starter template has been imported with ${filesToImport.files.length} files.

The ${template.name} template includes:
- Complete project setup (package.json, vite.config, tsconfig)
- React + TypeScript environment
- UI component library and styling framework
- Routing and state management setup

Your task:
1. Start by saying: "I'll create [the application name/description]"
2. Create a development plan that builds upon the imported template
3. Implement the plan by ADDING NEW FILES and MODIFYING EXISTING template files as needed
4. After completion, provide a brief summary (max 5 lines)

DO NOT recreate files that already exist in the template - build upon them.
Dependencies are ready - just run: \`npm install && npm run dev\`
---
`;

  return {
    assistantMessage,
    userMessage,
  };
}
