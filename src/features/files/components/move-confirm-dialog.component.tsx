// src/features/files/components/move-confirm-dialog.component.tsx

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

interface Props {
  open: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const MoveConfirmDialogComponent = ({ open, fileName, onConfirm, onCancel }: Props) => {
  return (
    <AlertDialog open={open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace existing file?</AlertDialogTitle>
          <AlertDialogDescription>
            A file named &quot;{fileName}&quot; already exists in the destination folder. Do you want to replace it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Replace</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MoveConfirmDialogComponent;
