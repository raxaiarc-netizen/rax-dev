import { useStore } from '@nanostores/react';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { DeployButton } from '~/components/deploy/DeployButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  right: {
    value: 'preview',
    text: 'Preview',
  },
};

export function HeaderActionButtons({ chatStarted: _chatStarted }: HeaderActionButtonsProps) {
  const selectedView = useStore(workbenchStore.currentView);
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  // Only show buttons when workbench is visible
  if (!showWorkbench) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Code/Preview Slider */}
      <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
      {/* Deploy Button */}
      <DeployButton />
    </div>
  );
}
