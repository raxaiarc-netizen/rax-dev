import React, { useState } from 'react';
import { INSPIRATION_CATEGORIES } from '~/lib/prompts/inspiration_categories';

interface ExamplePromptsProps {
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void | undefined;
  setInput?: (value: string) => void;
}

export function ExamplePrompts({ sendMessage, setInput }: ExamplePromptsProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Handle closing with animation
  const handleCloseDropdown = () => {
    setIsClosing(true);
    setTimeout(() => {
      setExpandedCategory(null);
      setIsClosing(false);
    }, 200); // Match animation duration
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      handleCloseDropdown();
    } else {
      setIsClosing(false);
      setExpandedCategory(categoryId);
    }
  };

  const handleAppClick = (appName: string) => {
    const promptText = `Build me a ${appName}`;
    setInput?.(promptText);
    handleCloseDropdown();
  };

  return (
    <div id="examples" className="w-full relative">
      {/* Suggestions dropdown - appears attached to chatbox */}
      {expandedCategory && (
        <div 
          className={`w-full mb-3 z-50 ${isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'}`}
          onMouseLeave={handleCloseDropdown}
        >
          <div className="rounded-xl border border-rax-elements-borderColor bg-rax-elements-background-depth-2 shadow-[0_8px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm overflow-hidden">
            <div className="p-3 space-y-1">
              {INSPIRATION_CATEGORIES.find(c => c.id === expandedCategory)?.apps.map((app, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => handleAppClick(app.name)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                             bg-transparent border-none
                             hover:bg-rax-elements-background-depth-1
                             transition-all duration-150
                             group cursor-pointer text-left"
                >
                  <span className={`text-rax-elements-textTertiary dark:text-rax-elements-textTertiary-dark group-hover:text-rax-elements-textSecondary dark:group-hover:text-rax-elements-textSecondary-dark flex-shrink-0 ${app.icon} text-4`} />
                  <span className="text-sm text-rax-elements-textSecondary dark:text-rax-elements-textSecondary-dark group-hover:text-rax-elements-textPrimary dark:group-hover:text-rax-elements-textPrimary-dark">
                    Build me a <span className="text-rax-elements-textPrimary dark:text-rax-elements-textPrimary-dark font-medium">{app.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Buttons - below chatbox */}
      {!expandedCategory && (
        <div className="flex flex-col gap-3 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-wrap justify-center gap-2 px-2">
            {INSPIRATION_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rax-elements-borderColor bg-rax-elements-background-depth-1 hover:bg-rax-elements-background-depth-2 transition-all duration-200 active:scale-[0.98]"
              >
                <span className={`text-rax-elements-textSecondary dark:text-rax-elements-textSecondary-dark ${category.icon} text-4`} />
                <span className="text-xs font-medium text-rax-elements-textSecondary dark:text-rax-elements-textSecondary-dark">
                  {category.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
