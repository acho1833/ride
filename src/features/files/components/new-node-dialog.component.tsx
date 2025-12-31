'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import type { FileType } from '@/features/files/components/file-tree-context';
import { useFileAddMutation } from '@/features/files/hooks/useFileAddMutation';
import { useOpenFilesActions, useLastFocusedGroupId, useEditorGroup } from '@/stores/open-files/open-files.selector';
import { useFileActions } from '@/stores/files/files.selector';

// Form type and schema for new file/folder name
interface NewNodeForm {
  name: string;
}

const newNodeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long')
});

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

  const form = useForm<NewNodeForm>({
    resolver: zodResolver(newNodeSchema),
    defaultValues: { name: '' }
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ name: '' });
      // Focus the input after a small delay to ensure dialog is mounted
      setTimeout(() => {
        form.setFocus('name');
      }, 0);
    }
  }, [open, form]);

  const handleSubmit = async (data: NewNodeForm) => {
    const name = data.name.trim();

    try {
      const createdNode = await addNodeAsync({ parentId, name, type });

      // Select the newly created node in the file tree
      setSelectedFileId(createdNode.id);

      // For files, open in editor right after the currently active tab
      if (type === 'file' && lastFocusedGroup) {
        const activeIndex = lastFocusedGroup.files.findIndex(f => f.id === lastFocusedGroup.activeFileId);
        const insertIndex = activeIndex !== -1 ? activeIndex + 1 : lastFocusedGroup.files.length;
        openFile(createdNode.id, createdNode.name, lastFocusedGroupId ?? undefined, insertIndex);
      }

      onClose();
    } catch (error) {
      // Set form error to display in the form field with red border
      const message = error instanceof Error ? error.message : 'Failed to add file';
      form.setError('name', { type: 'manual', message });
    }
  };

  const placeholder = type === 'file' ? 'filename.ext' : 'folder name';

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New {type === 'file' ? 'File' : 'Folder'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder={placeholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewNodeDialogComponent;
