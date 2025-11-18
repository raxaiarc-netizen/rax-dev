import { useEffect, useRef, useState } from "react";
import { useAtomValue, useAtom } from "jotai";
import {
  selectedAppIdAtom,
  appUrlAtom,
  previewErrorMessageAtom,
} from "@/atoms/appAtoms";
import { selectedComponentPreviewAtom, isPickingComponentAtom } from "@/atoms/previewAtoms";
import { useParseRouter } from "@/hooks/useParseRouter";
import { useRunApp } from "@/hooks/useRunApp";
import { useShortcut } from "@/hooks/useShortcut";
import { PreviewIframe, PreviewNavigationHeader } from "./PreviewIframe";
import { usePreviewNavigation } from "@/hooks/usePreviewNavigation";

export const PreviewWithNavigation = ({ loading }: { loading: boolean }) => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { appUrl, originalUrl } = useAtomValue(appUrlAtom);
  const [reloadKey, setReloadKey] = useState(0);
  const [, setErrorMessage] = useAtom(previewErrorMessageAtom);
  const { routes: availableRoutes } = useParseRouter(selectedAppId);
  const { restartApp } = useRunApp();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedComponentPreview] = useAtom(
    selectedComponentPreviewAtom,
  );
  const [isPicking, setIsPicking] = useAtom(isPickingComponentAtom);

  // Use custom hook for navigation logic
  const {
    canGoBack,
    canGoForward,
    navigationHistory,
    currentHistoryPosition,
    handleNavigateBack,
    handleNavigateForward,
    navigateToRoute,
  } = usePreviewNavigation({ iframeRef, appUrl });

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  // Deactivate component selector when selection is cleared
  useEffect(() => {
    if (!selectedComponentPreview) {
      if (iframeRef.current?.contentWindow && appUrl) {
        try {
          const targetOrigin = new URL(appUrl).origin;
          iframeRef.current.contentWindow.postMessage(
            { type: "deactivate-rax-component-selector" },
            targetOrigin,
          );
        } catch (e) {
          console.error('Failed to post message:', e);
        }
      }
      setIsPicking(false);
    }
  }, [selectedComponentPreview, appUrl]);

  // Function to activate component selector in the iframe
  const handleActivateComponentSelector = () => {
    if (iframeRef.current?.contentWindow && appUrl) {
      const newIsPicking = !isPicking;
      setIsPicking(newIsPicking);

      try {
        const targetOrigin = new URL(appUrl).origin;
        iframeRef.current.contentWindow.postMessage(
          {
            type: newIsPicking
              ? "activate-rax-component-selector"
              : "deactivate-rax-component-selector",
          },
          targetOrigin,
        );
      } catch (e) {
        console.error('Failed to post message:', e);
      }
    }
  };

  // Activate component selector using a shortcut
  useShortcut(
    "c",
    { shift: true, ctrl: !isMac, meta: isMac },
    handleActivateComponentSelector,
    true,
    iframeRef,
  );

  // Function to handle reload
  const handleReload = () => {
    setReloadKey((prevKey) => prevKey + 1);
    setErrorMessage(undefined);
    console.debug("Reloading iframe preview for app", selectedAppId);
  };

  const onRestart = () => {
    restartApp();
  };

  return (
    <div className="flex flex-col h-full">
      <PreviewNavigationHeader
        loading={loading}
        selectedAppId={selectedAppId}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        isPicking={isPicking}
        navigationHistory={navigationHistory}
        currentHistoryPosition={currentHistoryPosition}
        availableRoutes={availableRoutes}
        originalUrl={originalUrl}
        onNavigateBack={handleNavigateBack}
        onNavigateForward={handleNavigateForward}
        onReload={handleReload}
        onRestart={onRestart}
        onActivateComponentSelector={handleActivateComponentSelector}
        onNavigateToRoute={navigateToRoute}
      />
      <div className="flex-1 mt-2 preview-iframe-container">
        <PreviewIframe loading={loading} />
      </div>
    </div>
  );
};
