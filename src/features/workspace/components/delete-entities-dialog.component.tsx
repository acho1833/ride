'use client';

/**
 * Delete Entities Dialog Component
 *
 * Confirmation dialog for deleting entities from workspace.
 * Shows count of entities to be deleted.
 */

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityCount: number;
  onConfirm: () => void;
  isPending: boolean;
}

const DeleteEntitiesDialogComponent = ({ open, onOpenChange, entityCount, onConfirm, isPending }: Props) => {
  const title = entityCount === 1 ? 'Delete entity?' : 'Delete entities?';
  const description =
    entityCount === 1 ? 'This will remove 1 entity from this workspace.' : `This will remove ${entityCount} entities from this workspace.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEntitiesDialogComponent;
