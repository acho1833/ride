'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { File } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useQuickOpen } from '@/features/quick-open/hooks/useQuickOpen';
import { flattenFileTree, FlatFile, matchesSearch, extractLiteralSegments } from '@/features/quick-open/utils';
import { useFileStructure, useFileActions } from '@/stores/files/files.selector';
import { useOpenFilesActions, useEditorRows } from '@/stores/open-files/open-files.selector';

/** Highlight matching segments in text */
const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;

  const segments = extractLiteralSegments(query);
  if (segments.length === 0) return <>{text}</>;

  // Build regex to find all literal segments (case-insensitive)
  const pattern = segments.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = segments.some(s => s.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <span key={i} className="font-semibold text-yellow-500">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
};

const QuickOpenComponent = () => {
  const { isOpen, setIsOpen } = useQuickOpen();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get file tree and actions
  const fileStructure = useFileStructure();
  const { revealFile } = useFileActions();
  const { openFile } = useOpenFilesActions();
  const rows = useEditorRows();

  // Flatten file tree for searching
  const flatFiles = useMemo<FlatFile[]>(() => {
    if (!fileStructure) return [];
    return flattenFileTree(fileStructure);
  }, [fileStructure]);

  // Get recently opened file IDs (in order)
  const recentFileIds = useMemo<string[]>(() => {
    const ids: string[] = [];
    for (const row of rows) {
      for (const group of row.groups) {
        for (const file of group.files) {
          if (!ids.includes(file.id)) {
            ids.push(file.id);
          }
        }
      }
    }
    return ids;
  }, [rows]);

  // Sort files: recently opened first, then alphabetically
  const sortedFiles = useMemo<FlatFile[]>(() => {
    return [...flatFiles].sort((a, b) => {
      const aRecent = recentFileIds.indexOf(a.id);
      const bRecent = recentFileIds.indexOf(b.id);

      // Both recently opened - sort by recency
      if (aRecent !== -1 && bRecent !== -1) {
        return aRecent - bRecent;
      }
      // Only a is recent
      if (aRecent !== -1) return -1;
      // Only b is recent
      if (bRecent !== -1) return 1;
      // Neither recent - sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [flatFiles, recentFileIds]);

  // Filter files based on search query (supports * wildcard)
  const filteredFiles = useMemo<FlatFile[]>(() => {
    return sortedFiles.filter(file => matchesSearch(file, searchQuery));
  }, [sortedFiles, searchQuery]);

  // Close dialog and reset search
  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, [setIsOpen]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDialog();
      }
    };

    // Delay adding listener to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDialog]);

  // Handle file selection
  const handleSelect = (file: FlatFile) => {
    openFile(file.id, file.name);
    revealFile(file.id);
    closeDialog();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-3 z-50 flex justify-center">
      <div ref={containerRef} className="bg-popover border-border h-fit w-full max-w-lg rounded-lg border shadow-lg">
        <Command className="rounded-lg" shouldFilter={false}>
          <CommandInput placeholder="Search files... (use * as wildcard)" autoFocus value={searchQuery} onValueChange={setSearchQuery} />
          <CommandList>
            <CommandEmpty>No files found.</CommandEmpty>
            <CommandGroup>
              {filteredFiles.map(file => (
                <CommandItem key={file.id} value={file.id} onSelect={() => handleSelect(file)}>
                  <File className="text-muted-foreground mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">
                    <HighlightedText text={file.name} query={searchQuery} />
                  </span>
                  {file.name !== file.path && (
                    <span className="text-muted-foreground ml-2 truncate text-xs">
                      <HighlightedText text={file.path} query={searchQuery} />
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
};

export default QuickOpenComponent;
