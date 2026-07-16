"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Mobile-first bottom sheet (DESIGN_RULES.md — dominant Indian food-app pattern) */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-white rounded-t-[24px] shadow-sheet",
            "max-h-[90vh] overflow-y-auto",
            "focus:outline-none",
            className
          )}
        >
          <div className="drag-handle mt-3" />
          {title && (
            <Dialog.Title className="px-4 pb-3 text-base font-semibold text-[#1F2937]">
              {title}
            </Dialog.Title>
          )}
          <div className="px-4 pb-8">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
