import { Outlet } from '@remix-run/react';
import { WaveThreadsBackground } from '~/components/auth/WaveThreadsBackground';

export default function AuthLayout() {
  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden bg-black">
      {/* Animated Wave Threads Background - persists across auth pages */}
      <WaveThreadsBackground />

      {/* Content - login or signup form */}
      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <Outlet />
      </div>
    </div>
  );
}






