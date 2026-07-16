"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/lib/types";
import { Link2, Upload, AlertCircle } from "lucide-react";

interface Props {
  onRecipeExtracted: (recipe: Recipe) => void;
}

/**
 * Reel input — paste link or upload video.
 * GUARDRAILS #7: user-provided content only, no scraping.
 */
export function ReelInput({ onRecipeExtracted }: Props) {
  const [url, setUrl] = useState("");
  const [requiresUpload, setRequiresUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractMutation = useMutation({
    mutationFn: async (input: { url?: string; file?: File }) => {
      let body: FormData | string;
      let headers: Record<string, string> = {};

      if (input.file) {
        const form = new FormData();
        form.append("file", input.file);
        if (input.url) form.append("url", input.url);
        body = form;
      } else {
        body = JSON.stringify({ reelUrl: input.url });
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch("/api/recipe/reel", {
        method: "POST",
        headers,
        body,
      });

      const data = await res.json() as {
        recipe?: Recipe;
        error?: string;
        requiresUpload?: boolean;
      };

      if (!res.ok) {
        if (data.requiresUpload) {
          setRequiresUpload(true);
        }
        throw new Error(data.error ?? "Extraction failed");
      }

      return data.recipe!;
    },
    onSuccess: (recipe) => {
      onRecipeExtracted(recipe);
      setRequiresUpload(false);
    },
  });

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    extractMutation.mutate({ url: url.trim() });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      extractMutation.mutate({ file, url: url.trim() || undefined });
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Link2
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setRequiresUpload(false);
            }}
            placeholder="Paste Instagram / YouTube reel link..."
            className="w-full h-12 pl-9 pr-3 rounded-card border border-[#E5E7EB] bg-white text-[#1F2937] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
          />
        </div>
        <Button
          type="submit"
          variant="order"
          disabled={!url.trim() || extractMutation.isPending}
          className="flex-shrink-0"
        >
          {extractMutation.isPending && !requiresUpload ? "Extracting..." : "Go"}
        </Button>
      </form>

      {/* Upload fallback — shown when platform blocks fetch */}
      {requiresUpload && (
        <div className="bg-[#F97316]/10 rounded-card p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-[#F97316] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#1F2937]">
              This platform blocks automatic fetching. Please download the video and upload it below.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-sm font-semibold text-[#F97316]"
          >
            <Upload size={14} />
            Upload video file
          </button>
        </div>
      )}

      {/* Always visible upload option */}
      {!requiresUpload && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={extractMutation.isPending}
          className="flex items-center gap-2 text-xs text-[#6B7280] disabled:opacity-50"
        >
          <Upload size={13} />
          Or upload a screen recording
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {extractMutation.error && !requiresUpload && (
        <p className="text-xs text-[#F43F5E]">
          {extractMutation.error.message}
        </p>
      )}
    </div>
  );
}
