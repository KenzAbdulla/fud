"use client";

import * as Toast from "@radix-ui/react-toast";
import { useState, useCallback, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "error";
}

interface ToastCtx {
  toast: (msg: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setMessages((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {messages.map((msg) => (
          <Toast.Root
            key={msg.id}
            open
            className={cn(
              "fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50",
              "bg-white rounded-card shadow-card p-4",
              "data-[state=open]:animate-slide-in-from-bottom",
              msg.variant === "error" && "border-l-4 border-leg-dineout"
            )}
          >
            <Toast.Title className="font-semibold text-sm text-[#1F2937]">
              {msg.title}
            </Toast.Title>
            {msg.description && (
              <Toast.Description className="text-xs text-[#6B7280] mt-1">
                {msg.description}
              </Toast.Description>
            )}
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
