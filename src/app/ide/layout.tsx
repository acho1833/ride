import { ReactNode } from 'react';
import AppHeaderComponent from '@/components/headers/app-header.component';

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="bg-secondary flex min-h-screen flex-col">
      <AppHeaderComponent />
      {children}
    </div>
  );
};

export default Layout;
