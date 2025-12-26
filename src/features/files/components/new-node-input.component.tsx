// Props for the NewNodeInput component
import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { FileIcon, FolderIcon } from 'lucide-react';
import { FileType } from '@/features/files/components/file-tree.component';

interface Props {
  depth: number; // Indentation depth
  type: FileType; // Type of node being created
  onFinish: (name: string) => void; // Callback when creation is complete
  onCancel: () => void; // Callback to cancel creation
}

/**
 * Component that renders an input field for creating a new file or folder
 * Appears inline in the tree when user clicks "New File" or "New Folder"
 */
const NewNodeInputComponent = ({ depth, type, onFinish, onCancel }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when it appears
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Create node on Enter key
      const name = e.currentTarget.value.trim();
      if (name) {
        onFinish(name);
      }
    } else if (e.key === 'Escape') {
      // Cancel on Escape key
      onCancel();
    }
  };

  // Handle losing focus
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const name = e.currentTarget.value.trim();
    if (name) {
      onFinish(name); // Create the node
    } else {
      onCancel(); // Cancel if empty
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-sm px-2 py-1.5" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
      {/* Show appropriate icon based on type */}
      {type === 'file' ? (
        <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
      ) : (
        <FolderIcon className="text-muted-foreground h-4 w-4 shrink-0" />
      )}
      <Input
        ref={inputRef}
        placeholder={type === 'file' ? 'filename.ext' : 'folder name'}
        className="h-6 text-sm"
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default NewNodeInputComponent;
