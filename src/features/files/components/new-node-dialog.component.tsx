'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { FileType } from '@/features/files/components/file-tree-context';
import { useFileAddMutation } from '@/features/files/hooks/useFileAddMutation';
import { useOpenFilesActions, useLastFocusedGroupId, useEditorGroup } from '@/stores/open-files/open-files.selector';
import { useFileActions } from '@/stores/files/files.selector';
import { useCurrentProject } from '@/stores/projects/projects.selector';
import { FILE_APPLICATIONS, FILE_ICON_MAP, DEFAULT_FILE_APPLICATION_ID, type FileApplicationId } from '@/const';

// Form type and schema for new file/folder name
interface NewNodeForm {
  name: string;
}

// Characters not allowed in file names
const INVALID_CHARS_REGEX = /[<>:"/\\|?*\s]/;

/**
 * Detects if the filename ends with a known extension.
 * Returns the matching app ID or null if no match / invalid extension.
 */
function detectExtension(name: string): { appId: FileApplicationId; hasExtension: true } | { appId: null; hasExtension: boolean } {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === name.length - 1) {
    return { appId: null, hasExtension: false };
  }
  const extension = name.slice(dotIndex);
  const matchingApp = FILE_APPLICATIONS.find(app => app.extension === extension);
  if (matchingApp) {
    return { appId: matchingApp.id, hasExtension: true };
  }
  return { appId: null, hasExtension: true };
}

/**
 * Creates validation schema based on node type.
 * Files have additional extension validation.
 */
function createNodeSchema(nodeType: FileType) {
  return z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name is too long')
      .refine(name => !INVALID_CHARS_REGEX.test(name), 'Invalid characters: spaces, < > : " / \\ | ? *')
      .refine(
        name => {
          if (nodeType !== 'file') return true;
          const { appId, hasExtension } = detectExtension(name);
          // Valid if no extension typed, or if extension is valid
          return !hasExtension || appId !== null;
        },
        { message: `Unsupported file type. Supported: ${FILE_APPLICATIONS.map(app => app.extension).join(', ')}` }
      )
  });
}

interface Props {
  open: boolean;
  type: FileType;
  parentId: string;
  onClose: () => void;
}

/**
 * Dialog for creating a new file or folder.
 * Handles mutation internally - parent just manages open/close state.
 */
const NewNodeDialogComponent = ({ open, type, parentId, onClose }: Props) => {
  const { mutateAsync: addNodeAsync } = useFileAddMutation();
  const { openFile } = useOpenFilesActions();
  const { setSelectedFileId } = useFileActions();
  const lastFocusedGroupId = useLastFocusedGroupId();
  const lastFocusedGroup = useEditorGroup(lastFocusedGroupId ?? '');
  const currentProject = useCurrentProject();

  const [selectedAppId, setSelectedAppId] = useState<FileApplicationId>(DEFAULT_FILE_APPLICATION_ID);
  const [hasTypedExtension, setHasTypedExtension] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  const form = useForm<NewNodeForm>({
    resolver: zodResolver(createNodeSchema(type)),
    defaultValues: { name: '' }
  });

  // Reset form when dialog opens (using derived state pattern to avoid setState in effect)
  if (open && !prevOpen) {
    form.reset({ name: '' });
    setSelectedAppId(DEFAULT_FILE_APPLICATION_ID);
    setHasTypedExtension(false);
    setPrevOpen(true);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Watch name field for extension detection and auto-select (files only)
  // eslint-disable-next-line react-hooks/incompatible-library -- watch() is required for reactive form state; no memoization-safe alternative exists
  const nameValue = form.watch('name');
  useEffect(() => {
    if (type !== 'file') return;

    const { appId, hasExtension } = detectExtension(nameValue);
    setHasTypedExtension(hasExtension);

    // Auto-select app when valid extension is typed
    if (hasExtension && appId) {
      setSelectedAppId(appId);
    }

    // Trigger validation to show/hide error state
    form.trigger('name');
  }, [nameValue, type, form]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      // Focus the input after a small delay to ensure dialog is mounted
      setTimeout(() => {
        form.setFocus('name');
      }, 0);
    }
  }, [open, form]);

  const selectedApp = FILE_APPLICATIONS.find(app => app.id === selectedAppId) ?? FILE_APPLICATIONS[0];
  const SelectedIcon = FILE_ICON_MAP[selectedApp.iconName as keyof typeof FILE_ICON_MAP];

  const handleSubmit = async (data: NewNodeForm) => {
    let name = data.name.trim();

    // For files, append extension if not already present
    if (type === 'file' && !name.endsWith(selectedApp.extension)) {
      name = `${name}${selectedApp.extension}`;
    }

    if (!currentProject) return;

    try {
      const createdNode = await addNodeAsync({ projectId: currentProject.id, parentId, name, type });

      // Select the newly created node in the file tree
      setSelectedFileId(createdNode.id);

      // For files, open in editor right after the currently active tab
      if (type === 'file' && lastFocusedGroup) {
        const activeIndex = lastFocusedGroup.files.findIndex(f => f.id === lastFocusedGroup.activeFileId);
        const insertIndex = activeIndex !== -1 ? activeIndex + 1 : lastFocusedGroup.files.length;
        openFile(createdNode.id, lastFocusedGroupId ?? undefined, insertIndex);
      }

      onClose();
    } catch (error) {
      // Set form error to display in the form field with red border
      const message = error instanceof Error ? error.message : 'Failed to add file';
      form.setError('name', { type: 'manual', message });
    }
  };

  const placeholder = type === 'file' ? 'Enter name...' : 'Enter name...';

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New {type === 'file' ? 'File' : 'Folder'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder={placeholder} aria-invalid={!!fieldState.error} {...field} />
                      {type === 'file' && !hasTypedExtension && field.value && (
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                          <span className="invisible">{field.value}</span>
                          <span>{selectedApp.extension}</span>
                        </span>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            {type === 'file' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center">
                      <SelectedIcon className="mr-2 size-4" />
                      {selectedApp.label}
                    </span>
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {FILE_APPLICATIONS.map(app => {
                    const Icon = FILE_ICON_MAP[app.iconName as keyof typeof FILE_ICON_MAP];
                    return (
                      <DropdownMenuItem key={app.id} onClick={() => setSelectedAppId(app.id)}>
                        <Icon className="mr-2 size-4" />
                        {app.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewNodeDialogComponent;
