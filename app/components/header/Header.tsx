import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { AuthButton } from '~/components/auth/AuthButton.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className="flex items-center px-4 h-[var(--header-height)] fixed top-0 left-0 w-full bg-rax-elements-bg-depth-1"
      style={{ zIndex: 100 }}
    >
      <div className="flex items-center gap-2 z-logo text-rax-elements-textPrimary">
        <a href="/" className="text-2xl font-semibold text-accent flex items-center cursor-pointer">
          {/* <span className="i-rax:logo-text?mask w-[46px] inline-block" /> */}
          <img src="/ai.v2.png" alt="logo" className="w-[83px] inline-block pt-1" />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription only when the chat has started.
        <span className="flex-1 px-4 truncate text-center text-rax-elements-textPrimary">
          <ClientOnly>{() => <ChatDescription />}</ClientOnly>
        </span>
      )}
      <div className="ml-auto flex items-center gap-4 relative" style={{ zIndex: 1000 }}>
        <ClientOnly>{() => <HeaderActionButtons chatStarted={chat.started} />}</ClientOnly>
        <ClientOnly>{() => <AuthButton />}</ClientOnly>
      </div>
    </header>
  );
}
