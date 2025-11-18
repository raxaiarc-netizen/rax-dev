import React, { useState, memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface DevelopmentPlanCardProps {
  children: React.ReactNode;
  title?: string;
}

interface ParsedPlan {
  appName: string;
  projectDefinition: {
    purpose: string;
    targetUsers: string;
    coreValue: string;
    technicalStack: string[];
  };
  coreFeatures: string[];
  advancedFeatures: string[];
  dataStructure: string[];
  userRequest: string;
  relatedFiles: string[];
  todoList: string[];
  importantNotes: string[];
}

function parseDevelopmentPlan(content: string): ParsedPlan | null {
  // Check if this looks like a development plan
  const titleMatch = content.match(/^(.+?)\s*Development Plan/im);
  
  if (!titleMatch) return null;

  // Extract app name from title (remove "Development Plan" and clean up)
  let appName = titleMatch[1].trim();
  // Remove markdown formatting like # or **
  appName = appName.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
  
  // Extract Project Definition & Scope section - improved to handle inline text
  const purposeMatch = content.match(/Purpose:\s*([^\n]+?)(?=\s+Target Users:|$)/is);
  const targetUsersMatch = content.match(/Target Users:\s*([^\n]+?)(?=\s+Core Value|$)/is);
  const coreValueMatch = content.match(/Core Value(?:\s+Proposition)?:\s*([^\n]+?)(?=\s+Technical Stack|$)/is);
  
  // Extract Technical Stack - handle both list and inline formats
  const technicalStackMatch = content.match(/Technical Stack:\s*([^]*?)(?=Detailed Feature|Core Features|Advanced Features|$)/i);
  let technicalStack: string[] = [];
  if (technicalStackMatch) {
    technicalStack = technicalStackMatch[1]
      .split(/\n|(?=[A-Z][a-z]+ (?:with|for|component))/)
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(Detailed Feature|Core Features)/i))
      .map(line => line.replace(/^-\s*/, ''));
  }

  // Extract Core Features - handle inline format
  const coreFeaturesMatch = content.match(/Core Features \(Must-Have\):\s*([^]*?)(?=Advanced Features|Data Structure|User Request|$)/i);
  let coreFeatures: string[] = [];
  if (coreFeaturesMatch) {
    const featuresText = coreFeaturesMatch[1];
    // Split by numbered patterns like "1.", "2.", etc. or by feature names followed by " - "
    coreFeatures = featuresText
      .split(/(?=\d+\.\s+[A-Z])|(?=[A-Z][a-z]+\s+[A-Z][a-z]+\s*(?:&|Management|-)\s)/)
      .map(line => line.trim())
      .filter(line => line && line.length > 10)
      .map(line => {
        // Remove leading numbers and clean up
        return line.replace(/^\d+\.\s*/, '').trim();
      })
      .filter(line => line.length > 0);
  }

  // Extract Advanced Features
  const advancedFeaturesMatch = content.match(/Advanced Features \(Nice-to-Have\):\s*([^]*?)(?=Data Structure|User Request|Related Files|$)/i);
  let advancedFeatures: string[] = [];
  if (advancedFeaturesMatch) {
    const featuresText = advancedFeaturesMatch[1];
    advancedFeatures = featuresText
      .split(/(?=[A-Z][a-z]+\s+[A-Z][a-z]+)|(?=\n-\s+[A-Z])/)
      .map(line => line.trim())
      .filter(line => line && line.length > 10)
      .map(line => line.replace(/^-\s*/, ''));
  }

  // Extract Data Structure
  const dataStructureMatch = content.match(/Data Structure:\s*([^]*?)(?=User Request|Related Files|TODO|Important|$)/i);
  let dataStructure: string[] = [];
  if (dataStructureMatch) {
    const dataText = dataStructureMatch[1];
    dataStructure = dataText
      .split(/(?=[A-Z][a-z]+\s+[Ee]ntity:)|(?=Filter State:)|(?=UI State:)|(?=User preferences:)/)
      .map(line => line.trim())
      .filter(line => line && line.length > 10)
      .map(line => line.replace(/^-\s*/, ''));
  }
  
  // Extract all sections
  const userRequestMatch = content.match(/User Request\s*\n\s*([^\n]+(?:\n(?!Related Files|TODO|Important)[^\n]+)*)/i);
  const relatedFilesMatch = content.match(/Related Files\s*([^]*?)(?=Pages:|Layouts:|Utilities:|Prototypes:|TODO|Important|$)/i);
  const todoListMatch = content.match(/TODO List\s*([^]*?)(?=Important Notes|$)/i);
  const importantNotesMatch = content.match(/Important Notes\s*([^]*?)$/i);

  const userRequest = userRequestMatch?.[1]?.trim() || 'Build a comprehensive application with modern features.';
  
  // Extract Related Files with better parsing
  let relatedFiles: string[] = [];
  if (relatedFilesMatch) {
    relatedFiles = relatedFilesMatch[1]
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line.startsWith('@/'))
      .slice(0, 20); // Limit to first 20 files
  }

  // Extract TODO List
  let todoList: string[] = [];
  if (todoListMatch) {
    todoList = todoListMatch[1]
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line && line.length > 3)
      .map(line => line.replace(/^-?\s*\[\s*\]\s*/, ''))
      .filter(line => !line.match(/^(Core Features|UI\/UX|Design|State|Performance|Accessibility)/));
  }

  // Extract Important Notes
  let importantNotes: string[] = [];
  if (importantNotesMatch) {
    importantNotes = importantNotesMatch[1]
      .split(/(?=Core Features:|UI\/UX|Design Requirements:|State Management:|Performance:|Accessibility:)/)
      .map(line => line.trim())
      .filter(line => line && line.length > 10);
  }

  return {
    appName,
    projectDefinition: {
      purpose: purposeMatch?.[1]?.trim() || '',
      targetUsers: targetUsersMatch?.[1]?.trim() || '',
      coreValue: coreValueMatch?.[1]?.trim() || '',
      technicalStack
    },
    coreFeatures,
    advancedFeatures,
    dataStructure,
    userRequest,
    relatedFiles,
    todoList,
    importantNotes
  };
}

export const DevelopmentPlanCard = memo<DevelopmentPlanCardProps>(({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Convert children to string for parsing
  const extractTextContent = (node: any): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextContent).join('');
    if (node?.props?.children) return extractTextContent(node.props.children);
    return '';
  };
  
  const content = extractTextContent(children);
  
  const parsedPlan = parseDevelopmentPlan(content);
  
  // Detect if content is still being generated (incomplete sections or very short content)
  const hasAllSections = content.includes('Important Notes') && 
                         content.includes('TODO List') && 
                         content.includes('Related Files') &&
                         content.includes('User Request');
  const isGenerating = content.length > 0 && (content.length < 500 || !hasAllSections);

  if (!parsedPlan) {
    // Fallback: render a simple card with the raw content
    return (
      <div className="my-4 border border-blue-500/30 rounded-xl p-4 bg-gray-900">
        <div className="text-blue-400 font-semibold mb-2">Development Plan</div>
        <div className="text-gray-300 text-sm">{children}</div>
      </div>
    );
  }

  const handleClick = () => {
    if (isAnimating) return; // Prevent clicks during animation
    setIsAnimating(true);
    setIsExpanded(!isExpanded);
    // Reset animation lock after animation completes
    setTimeout(() => setIsAnimating(false), 250);
  };

  return (
    <>
      {/* Main Card */}
      <div 
        className="relative flex flex-col w-full rounded-2xl overflow-hidden my-4 transition-all duration-300 group cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #1a1a1d 0%, #16161a 50%, #0f0f12 100%)',
          border: '1px solid rgba(50, 166, 255, 0.15)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        }}
        onClick={handleClick}
      >
        {/* Animated border beam - always show, color changes based on state */}
        <>
          {/* Rotating gradient border layer */}
          <div 
            className="absolute -inset-[2px] rounded-2xl pointer-events-none z-0"
            style={{
              opacity: isGenerating ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
              overflow: 'hidden',
            }}
          >
            <div 
              className="absolute -inset-[100%]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 60%, rgba(50, 166, 255, 0.5) 70%, rgba(61, 131, 255, 0.8) 75%, rgba(126, 97, 255, 1) 80%, rgba(61, 131, 255, 0.8) 85%, rgba(50, 166, 255, 0.5) 90%, transparent 100%)',
                animation: isGenerating ? 'borderSpin 4s linear infinite' : 'none',
                willChange: 'transform',
              }}
            />
          </div>
          {/* Inner background to create border effect */}
          <div 
            className="absolute inset-[1px] rounded-2xl z-[5]"
            style={{
              background: 'linear-gradient(135deg, #1a1a1d 0%, #16161a 50%, #0f0f12 100%)',
            }}
          />
          <style>{`
            @keyframes borderSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </>
        
        {/* Enhanced left accent bar with pulsing effect when generating */}
        <div 
          className="absolute left-2 top-3 bottom-3 w-1 rounded-full z-20 transition-all duration-300 group-hover:translate-x-1 group-hover:w-1.5 group-hover:shadow-lg group-hover:shadow-blue-500/50"
          style={{
            background: 'linear-gradient(to bottom, #2eadff 0%, #3d83ff 50%, #7e61ff 100%)',
            boxShadow: '0 0 8px rgba(46, 173, 255, 0.3)',
            animation: isGenerating ? 'accentPulse 4s ease-in-out infinite' : 'none',
          }}
        />
        <style>{`
          @keyframes accentPulse {
            0%, 100% { 
              box-shadow: 0 0 8px rgba(46, 173, 255, 0.3);
              filter: brightness(1);
            }
            25% { 
              box-shadow: 0 0 16px rgba(46, 173, 255, 0.8), 0 0 24px rgba(46, 173, 255, 0.4);
              filter: brightness(1.4);
            }
            50% { 
              box-shadow: 0 0 8px rgba(46, 173, 255, 0.3);
              filter: brightness(1);
            }
            75% { 
              box-shadow: 0 0 16px rgba(46, 173, 255, 0.8), 0 0 24px rgba(46, 173, 255, 0.4);
              filter: brightness(1.4);
            }
          }
        `}</style>
        
        {/* Content */}
        <div className="relative z-20 flex items-center justify-between px-5 py-4 transition-all duration-300 group-hover:translate-x-2">
          <div className="flex flex-col space-y-1">
            <span 
              className="font-semibold text-lg tracking-wide transition-all duration-300 group-hover:text-blue-300"
              style={{ color: '#3d83ff' }}
            >
              Development Plan
            </span>
            {/* Enhanced Gradient Separator Line */}
            <div 
              className="h-px w-full transition-all duration-300 group-hover:w-full"
              style={{
                background: 'linear-gradient(to right, rgba(50, 166, 255, 0.6), rgba(50, 166, 255, 0.3), rgba(50, 166, 255, 0.1), transparent)',
                boxShadow: '0 0 4px rgba(50, 166, 255, 0.2)',
              }}
            />
            <span 
              className="text-sm font-medium transition-all duration-300 group-hover:text-gray-300"
              style={{ color: '#9ca3af' }}
            >
              {parsedPlan.appName} Plan
            </span>
          </div>
          <div className="transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110">
            {isExpanded ? 
              <ChevronDown 
                size={18} 
                style={{ color: '#3d83ff' }} 
                className="transition-all duration-300 group-hover:drop-shadow-lg" 
              /> : 
              <ChevronRight 
                size={18} 
                style={{ color: '#3d83ff' }} 
                className="transition-all duration-300 group-hover:drop-shadow-lg" 
              />
            }
          </div>
        </div>

        {/* Subtle bottom highlight */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-px opacity-30 transition-opacity duration-300 group-hover:opacity-60"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(50, 166, 255, 0.4), transparent)',
          }}
        />
      </div>

      {/* Separate Dropdown Bubble */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ maxHeight: 0, opacity: 0, marginBottom: 0 }}
            animate={{ maxHeight: '35vh', opacity: 1, marginBottom: '1rem' }}
            exit={{ maxHeight: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full bg-gray-900 rounded-xl border border-gray-700 overflow-hidden"
          >
            <div className="p-6 h-[35vh] overflow-y-auto">
          {/* Title with Gradient Separator */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3" style={{ color: '#3d83ff' }}>
              {parsedPlan.appName} Development Plan
            </h3>
            {/* Gradient Separator Line */}
            <div 
              className="h-px w-full"
              style={{
                background: 'linear-gradient(to right, #2eadff, #3d83ff, #7e61ff, transparent)',
              }}
            />
          </div>

          <div className="space-y-5">
            {/* Project Definition & Scope */}
            <div className="pb-5 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                <h4 className="text-base font-bold text-blue-400">Project Definition & Scope</h4>
              </div>
              <div className="space-y-4 ml-4">
                {parsedPlan.projectDefinition.purpose && (
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">PURPOSE</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed pl-1">{parsedPlan.projectDefinition.purpose}</p>
                  </div>
                )}
                {parsedPlan.projectDefinition.targetUsers && (
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">TARGET USERS</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed pl-1">{parsedPlan.projectDefinition.targetUsers}</p>
                  </div>
                )}
                {parsedPlan.projectDefinition.coreValue && (
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-bold text-green-300 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">CORE VALUE</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed pl-1">{parsedPlan.projectDefinition.coreValue}</p>
                  </div>
                )}
                {parsedPlan.projectDefinition.technicalStack.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">TECH STACK</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsedPlan.projectDefinition.technicalStack.map((tech, index) => (
                        <span key={index} className="text-xs text-gray-300 bg-gray-800/80 px-2.5 py-1 rounded-md border border-gray-700/50">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Core Features */}
            {parsedPlan.coreFeatures.length > 0 && (
              <div className="pb-5 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                  <h4 className="text-base font-bold text-blue-400">Core Features</h4>
                  <span className="text-xs font-semibold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">MUST-HAVE</span>
                </div>
                <ul className="space-y-3 ml-4">
                  {parsedPlan.coreFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 group">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-2"></span>
                      <span className="text-sm text-gray-300 leading-relaxed flex-1">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advanced Features */}
            {parsedPlan.advancedFeatures.length > 0 && (
              <div className="pb-5 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                  <h4 className="text-base font-bold text-blue-400">Advanced Features</h4>
                  <span className="text-xs font-semibold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">NICE-TO-HAVE</span>
                </div>
                <ul className="space-y-2.5 ml-4">
                  {parsedPlan.advancedFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-2"></span>
                      <span className="text-sm text-gray-300 leading-relaxed flex-1">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Structure */}
            {parsedPlan.dataStructure.length > 0 && (
              <div className="pb-5 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
                  <h4 className="text-base font-bold text-green-400">Data Structure</h4>
                </div>
                <ul className="space-y-2.5 ml-4">
                  {parsedPlan.dataStructure.map((data, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400 mt-2"></span>
                      <span className="text-sm text-gray-300 leading-relaxed flex-1 font-mono">{data}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* User Request */}
            <div className="pb-5 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-1 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full"></div>
                <h4 className="text-base font-bold text-yellow-400">User Request</h4>
              </div>
              <div className="ml-4 bg-gradient-to-br from-gray-800/80 to-gray-800/40 p-4 rounded-lg border border-gray-700/50">
                <p className="text-sm text-gray-200 leading-relaxed">
                  {parsedPlan.userRequest}
                </p>
              </div>
            </div>

            {/* Related Files */}
            {parsedPlan.relatedFiles.length > 0 && (
              <div className="pb-5 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full"></div>
                  <h4 className="text-base font-bold text-orange-400">Related Files</h4>
                  <span className="text-xs font-semibold text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">{parsedPlan.relatedFiles.length} FILES</span>
                </div>
                <div className="ml-4 space-y-1.5 max-h-48 overflow-y-auto">
                  {parsedPlan.relatedFiles.map((file, index) => (
                    <div key={index} className="text-xs text-gray-300 font-mono bg-gray-800/60 px-3 py-1.5 rounded-md border border-gray-700/40 hover:border-orange-500/30 transition-colors">
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TODO List */}
            {parsedPlan.todoList.length > 0 && (
              <div className="pb-5 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full"></div>
                  <h4 className="text-base font-bold text-cyan-400">TODO List</h4>
                  <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">{parsedPlan.todoList.length} TASKS</span>
                </div>
                <div className="ml-4 space-y-0">
                  {parsedPlan.todoList.map((todo, index) => (
                    <div key={index} className="flex items-start gap-3 group relative">
                      {/* Connecting line */}
                      {index < parsedPlan.todoList.length - 1 && (
                        <div className="absolute left-1.5 top-6 w-0.5 h-full bg-gradient-to-b from-cyan-400/30 to-transparent"></div>
                      )}
                      {/* Step indicator */}
                      <div className="relative z-10 flex-shrink-0 w-3 h-3 rounded-full bg-cyan-400 mt-1.5 group-hover:scale-125 transition-transform shadow-lg shadow-cyan-400/50"></div>
                      {/* Content */}
                      <div className="flex-1 pb-4 group-hover:translate-x-1 transition-transform">
                        <span className="text-sm text-gray-300 leading-relaxed block break-words">{todo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Notes */}
            {parsedPlan.importantNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-gradient-to-b from-red-400 to-red-600 rounded-full"></div>
                  <h4 className="text-base font-bold text-red-400">Important Notes</h4>
                  <span className="text-xs font-semibold text-red-300 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">CRITICAL</span>
                </div>
                <ul className="space-y-3 ml-4">
                  {parsedPlan.importantNotes.map((note, index) => (
                    <li key={index} className="flex items-start gap-3 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-400 mt-2"></span>
                      <span className="text-sm text-gray-200 leading-relaxed flex-1">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// Add display name for debugging
DevelopmentPlanCard.displayName = 'DevelopmentPlanCard';
