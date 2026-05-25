'use client';
import { Toaster } from 'sonner';

export function SonnerHost() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      gap={8}
      visibleToasts={6}
      toastOptions={{
        duration: 5200,
        className: 'sonner-onyx',
      }}
    />
  );
}
