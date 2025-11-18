import { useAtom, useAtomValue } from "jotai";
import { previewModeAtom, selectedAppIdAtom } from "../../atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";

import {
  Eye,
  Code2,
  MoreVertical,
  Cog,
  Trash2,
  TriangleAlert,
  Settings,
  Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";

import { useRunApp } from "@/hooks/useRunApp";
import { useVercelDeployments } from "@/hooks/useVercelDeployments";
import { useLoadApp } from "@/hooks/useLoadApp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showError, showSuccess } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";

export type PreviewMode =
  | "preview"
  | "code"
  | "problems"
  | "configure"
  | "publish";

const BUTTON_CLASS_NAME =
  "no-app-region-drag cursor-pointer relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium z-10 transition-all duration-300 hover:bg-[var(--background)] hover:shadow-sm whitespace-nowrap flex-shrink-0";

// Preview Header component with preview mode toggle
export const PreviewHeader = () => {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom);
  const [isPreviewOpen, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const previewRef = useRef<HTMLButtonElement>(null);
  const codeRef = useRef<HTMLButtonElement>(null);
  const problemsRef = useRef<HTMLButtonElement>(null);
  const configureRef = useRef<HTMLButtonElement>(null);
  const publishRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { problemReport } = useCheckProblems(selectedAppId);
  const { restartApp, refreshAppIframe } = useRunApp();
  const { deployments } = useVercelDeployments(selectedAppId || 0);
  const { app } = useLoadApp(selectedAppId);

  // Determine deployment status
  const getDeploymentStatus = () => {
    if (!app?.vercelProjectId) {
      return "not-deployed"; // Blue - not deployed
    }
    
    const latestDeployment = deployments?.[0];
    if (!latestDeployment) {
      return "not-deployed";
    }
    
    // Check deployment state
    if (latestDeployment.state === "ERROR" || latestDeployment.readyState === "ERROR") {
      return "error"; // Red - error
    }
    
    if (latestDeployment.state === "BUILDING" || latestDeployment.readyState === "QUEUED") {
      return "building"; // Yellow - building
    }
    
    if (latestDeployment.state === "READY" && latestDeployment.readyState === "READY") {
      return "deployed"; // Green - deployed successfully
    }
    
    return "not-deployed";
  };

  const deploymentStatus = getDeploymentStatus();

  const isCompact = windowWidth < 920;

  // Track window width
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selectPanel = (panel: PreviewMode) => {
    if (previewMode === panel) {
      setIsPreviewOpen(!isPreviewOpen);
    } else {
      setPreviewMode(panel);
      setIsPreviewOpen(true);
    }
  };

  const onCleanRestart = useCallback(() => {
    restartApp({ removeNodeModules: true });
  }, [restartApp]);

  const useClearSessionData = () => {
    return useMutation({
      mutationFn: () => {
        const ipcClient = IpcClient.getInstance();
        return ipcClient.clearSessionData();
      },
      onSuccess: async () => {
        await refreshAppIframe();
        showSuccess("Preview data cleared");
      },
      onError: (error) => {
        showError(`Error clearing preview data: ${error}`);
      },
    });
  };

  const { mutate: clearSessionData } = useClearSessionData();

  const onClearSessionData = useCallback(() => {
    clearSessionData();
  }, [clearSessionData]);

  // Get the problem count for the selected app
  const problemCount = problemReport ? problemReport.problems.length : 0;

  // Format the problem count for display
  const formatProblemCount = (count: number): string => {
    if (count === 0) return "";
    if (count > 100) return "100+";
    return count.toString();
  };

  const displayCount = formatProblemCount(problemCount);

  // Update indicator position when mode changes
  useEffect(() => {
    const updateIndicator = () => {
      let targetRef: React.RefObject<HTMLButtonElement | null>;

      switch (previewMode) {
        case "preview":
          targetRef = previewRef;
          break;
        case "code":
          targetRef = codeRef;
          break;
        case "problems":
          targetRef = problemsRef;
          break;
        case "configure":
          targetRef = configureRef;
          break;
        case "publish":
          targetRef = publishRef;
          break;
        default:
          return;
      }

      if (targetRef.current) {
        const button = targetRef.current;
        const container = button.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const left = buttonRect.left - containerRect.left;
          const width = buttonRect.width;

          setIndicatorStyle({ left, width });
          if (!isPreviewOpen) {
            setIndicatorStyle({ left, width: 0 });
          }
        }
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(updateIndicator, 10);
    return () => clearTimeout(timeoutId);
  }, [previewMode, displayCount, isPreviewOpen, isCompact]);

  const renderButton = (
    mode: PreviewMode,
    ref: React.RefObject<HTMLButtonElement | null>,
    icon: React.ReactNode,
    text: string,
    testId: string,
    badge?: React.ReactNode,
  ) => {
    const isActive = previewMode === mode && isPreviewOpen;
    const buttonContent = (
      <button
        data-testid={testId}
        ref={ref}
        className={`${BUTTON_CLASS_NAME} ${
          isActive
            ? "border-[0.5px] border-blue-500"
            : "border-[0.5px] border-transparent"
        }`}
        onClick={() => selectPanel(mode)}
      >
        {icon}
        {!isCompact && <span>{text}</span>}
        {badge}
      </button>
    );

    if (isCompact) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent>
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between px-3 py-1 mt-1 border-b border-border/50 backdrop-blur-sm overflow-x-auto">
        <div className="relative flex flex-nowrap rounded-lg p-1 gap-1 bg-[var(--background-darker)]/30 flex-shrink-0">
          <motion.div
            className="absolute top-1 bottom-1 bg-[var(--background-lightest)] shadow-md rounded-lg border border-border/20"
            animate={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              mass: 0.5,
            }}
          />
          {renderButton(
            "preview",
            previewRef,
            <Eye size={16} />,
            "Preview",
            "preview-mode-button",
          )}
          {renderButton(
            "problems",
            problemsRef,
            <TriangleAlert size={16} />,
            "Problems",
            "problems-mode-button",
            displayCount && (
              <span className="ml-0.5 px-1 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full min-w-[16px] text-center">
                {displayCount}
              </span>
            ),
          )}
          {renderButton(
            "code",
            codeRef,
            <Code2 size={16} />,
            "Code",
            "code-mode-button",
          )}
          {renderButton(
            "configure",
            configureRef,
            <Settings size={16} />,
            "Configure",
            "configure-mode-button",
          )}
          {renderButton(
            "publish",
            publishRef,
            <Rocket 
              size={16} 
              className={`transition-all duration-300 ${
                deploymentStatus === "not-deployed" 
                  ? "text-blue-400 stroke-[1.5px] [filter:drop-shadow(0_0_4px_rgb(59_130_246_/_0.8))]" 
                  : deploymentStatus === "building"
                  ? "text-yellow-400 stroke-[1.5px] [filter:drop-shadow(0_0_4px_rgb(234_179_8_/_0.8))]" 
                  : deploymentStatus === "deployed"
                  ? "text-green-400 stroke-[1.5px] [filter:drop-shadow(0_0_4px_rgb(34_197_94_/_0.8))]" 
                  : "text-red-400 stroke-[1.5px] [filter:drop-shadow(0_0_4px_rgb(239_68_68_/_0.8))]"
              }`}
            />,
            "Publish",
            "publish-mode-button",
          )}
        </div>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="preview-more-options-button"
                className="no-app-region-drag flex items-center justify-center p-2 rounded-lg text-sm hover:bg-[var(--background-darkest)] transition-all duration-200 hover:shadow-sm"
                title="More options"
              >
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={onCleanRestart}>
                <Cog size={16} />
                <div className="flex flex-col">
                  <span>Rebuild</span>
                  <span className="text-xs text-muted-foreground">
                    Re-installs node_modules and restarts
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClearSessionData}>
                <Trash2 size={16} />
                <div className="flex flex-col">
                  <span>Clear Cache</span>
                  <span className="text-xs text-muted-foreground">
                    Clears cookies and local storage and other app cache
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
};
