'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useFileRenameMutation } from '@/features/files/hooks/useFileRenameMutation';

// Schema for rename - requires at least 1 character
const renameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long')
});

type RenameForm = z.infer<typeof renameSchema>;

interface Props {
  open: boolean;
  nodeId: string;
  currentName: string;
  onClose: () => void;
}

/**
 * Dialog for renaming a file or folder.
 * Handles mutation internally - parent just manages open/close state.
 * Form validation prevents empty submissions - shows error message instead.
 */
const RenameNodeDialogComponent = ({ open, nodeId, currentName, onClose }: Props) => {
  const { mutate: renameNode } = useFileRenameMutation();

  const form = useForm<RenameForm>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: currentName }
  });

  // Reset form with current name when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ name: currentName });
      // Focus and select the input after a small delay to ensure dialog is mounted
      setTimeout(() => {
        form.setFocus('name');
      }, 0);
    }
  }, [open, currentName, form]);

  const handleSubmit = (data: RenameForm) => {
    const newName = data.name.trim();
    // Only call mutation if name changed
    if (newName !== currentName) {
      renameNode({ nodeId, newName });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Enter new name" {...field} />
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

export default RenameNodeDialogComponent;
