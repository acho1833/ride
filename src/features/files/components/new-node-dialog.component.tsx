'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import type { FileType } from '@/features/files/components/file-tree-context';
import type { TreeNode } from '@/models/user-file-tree.model';
import { useFileAddMutation } from '@/features/files/hooks/useFileAddMutation';

// Schema for new file/folder name
const newNodeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long')
});

type NewNodeForm = z.infer<typeof newNodeSchema>;

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
  const { mutate: addNode } = useFileAddMutation();

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

  const handleSubmit = (data: NewNodeForm) => {
    const name = data.name.trim();
    const newNode: TreeNode =
      type === 'file'
        ? { id: crypto.randomUUID(), name, type: 'file', metadata: {} }
        : { id: crypto.randomUUID(), name, type: 'folder', children: [] };
    addNode({ parentId, node: newNode });
    onClose();
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
