import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  previewModeAtom,
  previewPanelKeyAtom,
  selectedAppIdAtom,
} from "../../atoms/appAtoms";

import { CodeView } from "./CodeView";
import { PreviewIframe } from "./PreviewIframe";
import { Problems } from "./Problems";
import { ConfigurePanel } from "./ConfigurePanel";
import { useEffect, useRef } from "react";
import { useRunApp } from "@/hooks/useRunApp";
import { PublishPanel } from "./PublishPanel";
import { previewErrorMessageAtom } from "@/atoms/appAtoms";
import { PreviewErrorBoundary } from "./PreviewErrorBoundary";

// Main PreviewPanel component
export function PreviewPanel() {
  const [previewMode] = useAtom(previewModeAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { runApp, stopApp, loading, app } = useRunApp();
  const runningAppIdRef = useRef<number | null>(null);
  const key = useAtomValue(previewPanelKeyAtom);
  const setPreviewErrorMessage = useSetAtom(previewErrorMessageAtom);

  useEffect(() => {
    const previousAppId = runningAppIdRef.current;
    let isCancelled = false;

    // Check if the selected app ID has changed
    if (selectedAppId !== previousAppId) {
      // Clear any existing error messages when switching apps
      setPreviewErrorMessage(undefined);
      
      const switchApp = async () => {
        // Stop the previously running app, if any
        if (previousAppId !== null) {
          console.debug("Stopping previous app", previousAppId);
          await stopApp(previousAppId);
        }

        // Only proceed if this effect hasn't been cancelled
        if (!isCancelled && selectedAppId !== null) {
          console.debug("Starting new app", selectedAppId);
          await runApp(selectedAppId);
          // Only update ref if not cancelled
          if (!isCancelled) {
            runningAppIdRef.current = selectedAppId;
          }
        } else if (selectedAppId === null) {
          runningAppIdRef.current = null;
        }
      };
      
      switchApp();
    }

    // Cleanup: mark as cancelled and stop the app on unmount
    return () => {
      isCancelled = true;
      const runningApp = runningAppIdRef.current;
      if (runningApp !== null) {
        console.debug("Component unmounting, stopping app", runningApp);
        stopApp(runningApp);
        runningAppIdRef.current = null;
      }
    };
  }, [selectedAppId, runApp, stopApp, setPreviewErrorMessage]);
  return (
    <div className="flex flex-col h-full pb-2">
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto flex flex-col">
          <PreviewErrorBoundary>
            {previewMode === "preview" ? (
              <PreviewIframe key={key} loading={loading} />
            ) : previewMode === "code" ? (
              <CodeView loading={loading} app={app} />
            ) : previewMode === "configure" ? (
              <ConfigurePanel />
            ) : previewMode === "publish" ? (
              <PublishPanel />
            ) : (
              <Problems />
            )}
          </PreviewErrorBoundary>
        </div>
      </div>
    </div>
  );
}
