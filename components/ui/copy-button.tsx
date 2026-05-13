'use client';
import { Button } from './button';
import { Clipboard } from 'lucide-react';
import { toast } from 'sonner';

export function CopyButton({ text, className }: { text: string; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
      }}
    >
      <Clipboard className="h-3 w-3" />
    </Button>
  );
}