'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for Quick Open keyboard shortcut and state management.
 * Listens for Ctrl+P (Windows/Linux) or Cmd+P (Mac).
 */
export const useQuickOpen = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+P (Windows/Linux) or Cmd+P (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault(); // Prevent browser print dialog
      setIsOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isOpen, setIsOpen };
};
