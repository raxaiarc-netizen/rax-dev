/**
 * Enhanced Preview component with deployment system integration
 * This component can work with both WebContainer (legacy) and Deployment (new) systems
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { deploymentStore } from '~/lib/stores/deployment';
import { PortDropdown } from './PortDropdown';
import { ScreenshotSelector } from './ScreenshotSelector';
import { expoUrlAtom } from '~/lib/stores/qrCodeStore';
import { ExpoQrModal } from '~/components/workbench/ExpoQrModal';
import { IPhoneMockup } from './IPhoneMockup';
import type { ElementInfo } from './Inspector';

type ResizeSide = 'left' | 'right' | null;

interface PreviewProps {
  setSelectedElement?: (element: ElementInfo | null) => void;
  useDeployment?: boolean; // Toggle between WebContainer and Deployment
}

interface WindowSize {
  name: string;
  width: number;
  height: number;
  icon: string;
  hasFrame?: boolean;
  frameType?: 'mobile' | 'tablet' | 'laptop' | 'desktop';
}

const WINDOW_SIZES: WindowSize[] = [
  { name: 'iPhone SE', width: 375, height: 667, icon: 'i-ph:device-mobile', hasFrame: true, frameType: 'mobile' },
  { name: 'iPhone 12/13', width: 390, height: 844, icon: 'i-ph:device-mobile', hasFrame: true, frameType: 'mobile' },
  { name: 'iPad Mini', width: 768, height: 1024, icon: 'i-ph:device-tablet', hasFrame: true, frameType: 'tablet' },
  { name: 'Laptop', width: 1366, height: 768, icon: 'i-ph:laptop', hasFrame: true, frameType: 'laptop' },
  { name: 'Desktop', width: 1920, height: 1080, icon: 'i-ph:monitor', hasFrame: true, frameType: 'desktop' },
];

export const PreviewWithDeployment = memo(({ setSelectedElement, useDeployment = true }: PreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // WebContainer state (legacy)
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const hasSelectedPreview = useRef(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  
  // Deployment state (new)
  const deploymentUrl = deploymentStore.getCurrentDeploymentUrl();
  const deploymentStatus = useStore(deploymentStore.deploymentStatus);
  
  // Common state
  const [displayPath, setDisplayPath] = useState('/');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isInspectorMode, setIsInspectorMode] = useState(false);
  const [isDeviceModeOn, setIsDeviceModeOn] = useState(false);
  const [widthPercent, setWidthPercent] = useState<number>(37.5);
  const [currentWidth, setCurrentWidth] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedWindowSize, setSelectedWindowSize] = useState<WindowSize>(WINDOW_SIZES[0]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [showDeviceFrameInPreview, setShowDeviceFrameInPreview] = useState(false);
  const [isWindowSizeDropdownOpen, setIsWindowSizeDropdownOpen] = useState(false);
  
  const expoUrl = useStore(expoUrlAtom);
  const [isExpoQrModalOpen, setIsExpoQrModalOpen] = useState(false);

  const resizingState = useRef({
    isResizing: false,
    side: null as ResizeSide,
    startX: 0,
    startWidthPercent: 37.5,
    windowWidth: window.innerWidth,
    pointerId: null as number | null,
  });

  const SCALING_FACTOR = 1;

  // Determine which URL to use based on mode
  const previewUrl = useDeployment ? deploymentUrl : activePreview?.baseUrl;
  const isReady = useDeployment 
    ? deploymentStatus?.status === 'ready' 
    : !!activePreview;

  useEffect(() => {
    if (!previewUrl) {
      setIframeUrl(undefined);
      setDisplayPath('/');
      return;
    }

    setIframeUrl(previewUrl);
    setDisplayPath('/');
  }, [previewUrl]);

  // Auto-reload when deployment completes
  useEffect(() => {
    if (useDeployment && deploymentStatus?.status === 'ready' && deploymentUrl) {
      // Reload iframe when deployment is ready
      if (iframeRef.current) {
        iframeRef.current.src = deploymentUrl;
      }
    }
  }, [useDeployment, deploymentStatus?.status, deploymentUrl]);

  const findMinPortIndex = useCallback(
    (minIndex: number, preview: { port: number }, index: number, array: { port: number }[]) => {
      return preview.port < array[minIndex].port ? index : minIndex;
    },
    [],
  );

  useEffect(() => {
    if (!useDeployment && previews.length > 1 && !hasSelectedPreview.current) {
      const minPortIndex = previews.reduce(findMinPortIndex, 0);
      setActivePreviewIndex(minPortIndex);
    }
  }, [useDeployment, previews, findMinPortIndex]);

  const reloadPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen && containerRef.current) {
      await containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleDeviceMode = () => {
    setIsDeviceModeOn((prev) => !prev);
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const toggleInspectorMode = () => {
    const newInspectorMode = !isInspectorMode;
    setIsInspectorMode(newInspectorMode);

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'INSPECTOR_ACTIVATE',
          active: newInspectorMode,
        },
        '*',
      );
    }
  };

  const startResizing = (e: React.PointerEvent, side: ResizeSide) => {
    if (!isDeviceModeOn) return;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    resizingState.current = {
      isResizing: true,
      side,
      startX: e.clientX,
      startWidthPercent: widthPercent,
      windowWidth: window.innerWidth,
      pointerId: e.pointerId,
    };
  };

  const ResizeHandle = ({ side }: { side: ResizeSide }) => {
    if (!side) return null;

    return (
      <div
        className={`resize-handle-${side}`}
        onPointerDown={(e) => startResizing(e, side)}
        style={{
          position: 'absolute',
          top: 0,
          ...(side === 'left' ? { left: 0, marginLeft: '-7px' } : { right: 0, marginRight: '-7px' }),
          width: '15px',
          height: '100%',
          cursor: 'ew-resize',
          background: 'var(--rax-elements-background-depth-4, rgba(0,0,0,.3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          userSelect: 'none',
          touchAction: 'none',
          zIndex: 10,
        }}
        title="Drag to resize width"
      >
        <div style={{ color: 'var(--rax-elements-textSecondary)', fontSize: '10px' }}>
          ••• •••
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col relative">
      {isPortDropdownOpen && (
        <div className="z-iframe-overlay w-full h-full absolute" onClick={() => setIsPortDropdownOpen(false)} />
      )}
      
      <div className="bg-rax-elements-background-depth-2 p-2 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <IconButton icon="i-ph:arrow-clockwise" onClick={reloadPreview} />
          <IconButton
            icon="i-ph:selection"
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={isSelectionMode ? 'bg-rax-elements-background-depth-3' : ''}
          />
        </div>

        <div className="flex-grow flex items-center gap-1 bg-rax-elements-preview-addressBar-background border border-rax-elements-borderColor text-rax-elements-preview-addressBar-text rounded-full px-1 py-1 text-sm hover:bg-rax-elements-preview-addressBar-backgroundHover">
          {!useDeployment && (
            <PortDropdown
              activePreviewIndex={activePreviewIndex}
              setActivePreviewIndex={setActivePreviewIndex}
              isDropdownOpen={isPortDropdownOpen}
              setHasSelectedPreview={(value) => (hasSelectedPreview.current = value)}
              setIsDropdownOpen={setIsPortDropdownOpen}
              previews={previews}
            />
          )}
          <input
            title="URL Path"
            ref={inputRef}
            className="w-full bg-transparent outline-none"
            type="text"
            value={displayPath}
            onChange={(event) => setDisplayPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && previewUrl) {
                let targetPath = displayPath.trim();
                if (!targetPath.startsWith('/')) {
                  targetPath = '/' + targetPath;
                }
                const fullUrl = previewUrl + targetPath;
                setIframeUrl(fullUrl);
                setDisplayPath(targetPath);
                inputRef.current?.blur();
              }
            }}
            disabled={!isReady}
          />
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            icon="i-ph:devices"
            onClick={toggleDeviceMode}
            title={isDeviceModeOn ? 'Switch to Responsive Mode' : 'Switch to Device Mode'}
          />

          {expoUrl && <IconButton icon="i-ph:qr-code" onClick={() => setIsExpoQrModalOpen(true)} title="Show QR" />}

          <ExpoQrModal open={isExpoQrModalOpen} onClose={() => setIsExpoQrModalOpen(false)} />

          {isDeviceModeOn && (
            <>
              <IconButton
                icon="i-ph:device-rotate"
                onClick={() => setIsLandscape(!isLandscape)}
                title={isLandscape ? 'Switch to Portrait' : 'Switch to Landscape'}
              />
              <IconButton
                icon={showDeviceFrameInPreview ? 'i-ph:device-mobile' : 'i-ph:device-mobile-slash'}
                onClick={() => setShowDeviceFrameInPreview(!showDeviceFrameInPreview)}
                title={showDeviceFrameInPreview ? 'Hide Device Frame' : 'Show Device Frame'}
              />
            </>
          )}
          
          <IconButton
            icon="i-ph:cursor-click"
            onClick={toggleInspectorMode}
            className={isInspectorMode ? 'bg-rax-elements-background-depth-3 !text-rax-elements-item-contentAccent' : ''}
            title={isInspectorMode ? 'Disable Element Inspector' : 'Enable Element Inspector'}
          />
          
          <IconButton
            icon={isFullscreen ? 'i-ph:arrows-in' : 'i-ph:arrows-out'}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          />

          <IconButton
            icon="i-ph:arrow-square-out"
            onClick={openInNewTab}
            title="Open in New Tab"
          />
        </div>
      </div>

      <div className="flex-1 border-t border-rax-elements-borderColor flex justify-center items-center overflow-auto">
        <div
          style={{
            width: isDeviceModeOn ? (showDeviceFrameInPreview ? '100%' : `${widthPercent}%`) : '100%',
            height: '100%',
            overflow: 'auto',
            background: 'var(--rax-elements-background-depth-1)',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isReady ? (
            <>
              {isDeviceModeOn && showDeviceFrameInPreview ? (
                <IPhoneMockup isLandscape={isLandscape}>
                  <iframe
                    ref={iframeRef}
                    title="preview"
                    style={{
                      border: 'none',
                      width: '100%',
                      height: '100%',
                      background: 'white',
                      display: 'block',
                    }}
                    src={iframeUrl}
                    sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                    allow="cross-origin-isolated; storage-access"
                  />
                </IPhoneMockup>
              ) : (
                <iframe
                  ref={iframeRef}
                  title="preview"
                  className="border-none w-full h-full bg-rax-elements-background-depth-1"
                  src={iframeUrl}
                  sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                  allow="cross-origin-isolated; storage-access"
                />
              )}
              <ScreenshotSelector
                isSelectionMode={isSelectionMode}
                setIsSelectionMode={setIsSelectionMode}
                containerRef={iframeRef}
              />
            </>
          ) : (
            <div className="flex flex-col w-full h-full justify-center items-center bg-rax-elements-background-depth-1 text-rax-elements-textPrimary gap-4">
              {useDeployment && deploymentStatus?.status === 'building' && (
                <>
                  <div className="i-ph:spinner animate-spin text-4xl" />
                  <div className="text-center">
                    <div className="font-medium">Building deployment...</div>
                    <div className="text-sm text-rax-elements-textSecondary mt-1">
                      {deploymentStatus.message || 'Please wait'}
                    </div>
                  </div>
                </>
              )}
              {useDeployment && deploymentStatus?.status === 'failed' && (
                <>
                  <div className="i-ph:x-circle text-4xl text-red-500" />
                  <div className="text-center">
                    <div className="font-medium">Deployment failed</div>
                    <div className="text-sm text-rax-elements-textSecondary mt-1">
                      {deploymentStatus.error || 'Unknown error'}
                    </div>
                  </div>
                </>
              )}
              {!deploymentUrl && !activePreview && (
                <div>No preview available</div>
              )}
            </div>
          )}

          {isDeviceModeOn && !showDeviceFrameInPreview && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--rax-elements-background-depth-3)',
                  color: 'var(--rax-elements-textPrimary)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  pointerEvents: 'none',
                  opacity: resizingState.current.isResizing ? 1 : 0,
                  transition: 'opacity 0.3s',
                }}
              >
                {currentWidth}px
              </div>
              <ResizeHandle side="left" />
              <ResizeHandle side="right" />
            </>
          )}
        </div>
      </div>
    </div>
  );
});
