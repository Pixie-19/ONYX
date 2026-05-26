'use client';
import { Toaster } from 'sonner';

export function SonnerHost() {
  return (
    <Toaster
      theme="light"
      position="bottom-right"
      gap={10}
      visibleToasts={6}
      toastOptions={{
        duration: 5200,
        className: 'sonner-onyx',
      }}
    />
  );
}
