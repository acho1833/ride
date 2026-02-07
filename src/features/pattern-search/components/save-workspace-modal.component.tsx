'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { PatternMatch } from '../types';
import type { FileNode } from '@/models/user-file-tree.model';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { useCurrentProject } from '@/stores/projects/projects.selector';
import { useFileStructure } from '@/stores/files/files.selector';
import { useFileAddMutation } from '@/features/files/hooks/useFileAddMutation';
import { useWorkspaceCreateWithDataMutation } from '@/features/workspace/hooks/useWorkspaceCreateWithDataMutation';
import { convertMatchesToWorkspaceData } from '../utils';
import { DEFAULT_SEARCH_RESULTS_FILENAME } from '../const';

/** Validation schema for filename input */
const formSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, dashes and underscores')
});

interface FormValues {
  filename: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: PatternMatch[];
}

/**
 * Modal for saving search results as a new workspace file.
 * Creates a .ws file, populates it with matched entities/relationships,
 * and opens it in a new tab.
 */
const SaveWorkspaceModalComponent = ({ open, onOpenChange, matches }: Props) => {
  const { openNewFile } = useOpenFilesActions();
  const currentProject = useCurrentProject();
  const fileStructure = useFileStructure();
  const { mutateAsync: addFile } = useFileAddMutation();
  const { mutateAsync: createWorkspaceWithData } = useWorkspaceCreateWithDataMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { filename: DEFAULT_SEARCH_RESULTS_FILENAME }
  });

  const onSubmit = async (values: FormValues) => {
    if (!currentProject || !fileStructure) {
      toast.error('No project selected');
      return;
    }

    const filename = `${values.filename}.ws`;

    try {
      // Step 1: Create the .ws file in the file tree (backend generates workspaceId)
      const newNode = await addFile({
        projectId: currentProject.id,
        parentId: fileStructure.id, // Root folder
        name: filename,
        type: 'file'
      });

      // Step 2: Type guard - ensure we got a file node back (not a folder)
      if (newNode.type !== 'file') {
        toast.error('Unexpected response: expected file node');
        return;
      }

      // After type check, TypeScript knows this is a FileNode
      const newFile: FileNode = newNode;

      // Step 3: Get the workspaceId from the file metadata
      const workspaceId = (newFile.metadata as Record<string, string>)?.workspaceId;
      if (!workspaceId) {
        toast.error('Failed to create workspace');
        return;
      }

      // Step 4: Populate the workspace with entities and relationships from matches
      const workspaceData = convertMatchesToWorkspaceData(matches);
      await createWorkspaceWithData({
        workspaceId,
        ...workspaceData
      });

      // Step 5: Open the new file in a tab
      openNewFile({
        id: newFile.id,
        name: filename,
        metadata: newFile.metadata as Record<string, string>
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Errors are handled by the mutation hooks (toast)
      console.error('Failed to create workspace:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Workspace</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="filename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filename</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-x-2">
                      <Input {...field} placeholder={DEFAULT_SEARCH_RESULTS_FILENAME} />
                      <span className="text-muted-foreground text-sm">.ws</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveWorkspaceModalComponent;
