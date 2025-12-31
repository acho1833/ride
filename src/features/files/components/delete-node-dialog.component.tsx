'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFileDeleteMutation } from '@/features/files/hooks/useFileDeleteMutation';

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

  const handleConfirm = () => {
    deleteNode({ nodeId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {nodeType === 'file' ? 'File' : 'Folder'}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{nodeName}&quot;?
            {nodeType === 'folder' && ' This will also delete all contents inside.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteNodeDialogComponent;
