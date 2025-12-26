import { ReactNode } from 'react';
import AppHeaderComponent from '@/components/headers/app-header.component';

export default function Layout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <AppHeaderComponent />
      <main className="flex w-full flex-1">{children}</main>
    </div>
  );
}
