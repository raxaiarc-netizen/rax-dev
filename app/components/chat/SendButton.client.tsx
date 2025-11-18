interface SendButtonProps {
  show: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onImagesSelected?: (images: File[]) => void;
}

export const SendButton = ({ show, isStreaming, disabled, onClick }: SendButtonProps) => {
  const canSend = show && !disabled;
  
  return (
    <div className="flex border border-rax-elements-borderColor rounded-md overflow-hidden text-sm">
      <button
        className={`flex justify-center items-center p-1.5 bg-white dark:bg-white hover:brightness-90 text-black transition-all duration-200 ${
          canSend ? 'opacity-100' : 'opacity-30 cursor-not-allowed'
        }`}
        disabled={!canSend}
        onClick={(event) => {
          event.preventDefault();

          if (canSend) {
            onClick?.(event);
          }
        }}
      >
        {!isStreaming ? <div className="i-ph:arrow-up w-4 h-4"></div> : <div className="i-ph:stop-circle-bold w-4 h-4"></div>}
      </button>
    </div>
  );
};
