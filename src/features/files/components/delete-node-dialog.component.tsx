'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useFileDeleteMutation } from '@/features/files/hooks/useFileDeleteMutation';
import { useCurrentProject } from '@/stores/projects/projects.selector';

interface Props {
  open: boolean;
  nodeId: string;
  nodeName: string;
  nodeType: 'file' | 'folder';
  onClose: () => void;
}

/**
 * Dialog for confirming file or folder deletion.
 * Handles mutation internally - parent just manages open/close state.
 */
const DeleteNodeDialogComponent = ({ open, nodeId, nodeName, nodeType, onClose }: Props) => {
  const { mutate: deleteNode } = useFileDeleteMutation();
  const currentProject = useCurrentProject();

  const handleConfirm = () => {
    if (!currentProject) return;
    deleteNode({ projectId: currentProject.id, nodeId });
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {nodeType === 'file' ? 'File' : 'Folder'}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{nodeName}&quot;?
            {nodeType === 'folder' && ' This will also delete all contents inside.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteNodeDialogComponent;
