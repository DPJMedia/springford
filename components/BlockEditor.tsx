"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "./RichTextEditor";
import { parseYouTubeId, youTubeThumbnail } from "@/lib/article/videoEmbed";

export interface ContentBlock {
  id: string;
  type: "text" | "image" | "video";
  content?: string; // For text blocks
  url?: string; // image src, uploaded video src, or YouTube URL/id
  provider?: "file" | "youtube"; // For video blocks
  caption?: string; // For image/video blocks
  credit?: string; // For image/video blocks
  order: number;
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  function addTextBlock() {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type: "text",
      content: "",
      order: blocks.length,
    };
    onChange([...blocks, newBlock]);
  }

  async function addImageBlock() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("article-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("article-images").getPublicUrl(fileName);

        const newBlock: ContentBlock = {
          id: Math.random().toString(36).substr(2, 9),
          type: "image",
          url: publicUrl,
          caption: "",
          credit: "",
          order: blocks.length,
        };

        onChange([...blocks, newBlock]);
      } catch (error: any) {
        alert("Error uploading image: " + error.message);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  }

  async function addVideoUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Guard against very large uploads (default browser/storage limits).
      const MAX_MB = 100;
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(
          `That video is ${(file.size / 1024 / 1024).toFixed(0)}MB. Please keep uploads under ${MAX_MB}MB, ` +
            `or host it on YouTube and use "Add YouTube" instead.`,
        );
        return;
      }

      setUploading(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("article-images")
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("article-images").getPublicUrl(fileName);

        const newBlock: ContentBlock = {
          id: Math.random().toString(36).substr(2, 9),
          type: "video",
          provider: "file",
          url: publicUrl,
          caption: "",
          credit: "",
          order: blocks.length,
        };

        onChange([...blocks, newBlock]);
      } catch (error: any) {
        alert("Error uploading video: " + error.message);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  }

  function addYouTube() {
    const input = window.prompt("Paste a YouTube link (or video ID):");
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!parseYouTubeId(trimmed)) {
      alert("That doesn't look like a valid YouTube link or video ID. Please try again.");
      return;
    }

    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type: "video",
      provider: "youtube",
      url: trimmed,
      caption: "",
      credit: "",
      order: blocks.length,
    };

    onChange([...blocks, newBlock]);
  }

  function updateBlock(id: string, updates: Partial<ContentBlock>) {
    onChange(
      blocks.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      )
    );
  }

  function removeBlock(id: string) {
    if (confirm("Remove this block?")) {
      onChange(blocks.filter((block) => block.id !== id));
    }
  }

  function moveBlock(id: string, direction: "up" | "down") {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[index],
    ];

    // Update order
    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });

    onChange(newBlocks);
  }

  return (
    <div className="space-y-4">
      {/* Render all blocks */}
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="border-2 border-[var(--admin-border)] rounded-lg p-4 bg-[var(--admin-table-header-bg)] relative"
        >
          {/* Block header with controls */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--admin-border)]">
            <span className="text-sm font-semibold text-[var(--admin-text)]">
              {block.type === "text"
                ? "📝 Content Block"
                : block.type === "video"
                  ? block.provider === "youtube"
                    ? "▶️ YouTube Block"
                    : "🎬 Video Block"
                  : "🖼️ Image Block"}{" "}
              #{index + 1}
            </span>
            <div className="flex gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, "up")}
                  className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition"
                  title="Move up"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
              {index < blocks.length - 1 && (
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, "down")}
                  className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition"
                  title="Move down"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="p-1 text-red-600 hover:text-red-800 transition"
                title="Remove block"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Block content */}
          {block.type === "text" ? (
            <RichTextEditor
              value={block.content || ""}
              onChange={(value) => updateBlock(block.id, { content: value })}
              placeholder="Write your content here..."
            />
          ) : block.type === "video" ? (
            <div className="space-y-3">
              {block.provider === "youtube" ? (
                (() => {
                  const ytId = parseYouTubeId(block.url);
                  return ytId ? (
                    <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-black">
                      <img
                        src={youTubeThumbnail(ytId)}
                        alt={block.caption || "Video thumbnail"}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60">
                          <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-white">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">Invalid YouTube link.</p>
                  );
                })()
              ) : (
                <video
                  src={block.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-64 rounded-lg bg-black"
                />
              )}
              <input
                type="text"
                value={block.caption || ""}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                className="w-full border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] rounded-md px-3 py-2 text-sm"
                placeholder="Video caption (optional)"
              />
              <input
                type="text"
                value={block.credit || ""}
                onChange={(e) => updateBlock(block.id, { credit: e.target.value })}
                className="w-full border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] rounded-md px-3 py-2 text-sm"
                placeholder="Video credit (optional)"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <img
                src={block.url}
                alt={block.caption || "Article image"}
                className="w-full h-64 object-cover rounded-lg"
              />
              <input
                type="text"
                value={block.caption || ""}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                className="w-full border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] rounded-md px-3 py-2 text-sm"
                placeholder="Image caption (optional)"
              />
              <input
                type="text"
                value={block.credit || ""}
                onChange={(e) => updateBlock(block.id, { credit: e.target.value })}
                className="w-full border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] rounded-md px-3 py-2 text-sm"
                placeholder="Photo credit (optional)"
              />
            </div>
          )}
        </div>
      ))}

      {/* Add block buttons */}
      <div className="border-2 border-dashed border-[var(--admin-border)] rounded-lg p-6 bg-[var(--admin-table-header-bg)]">
        <p className="text-sm font-semibold text-[var(--admin-text)] mb-3">Optional - Add More Content:</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addTextBlock}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-[var(--admin-card-bg)] border-2 border-[var(--admin-accent)] text-[var(--admin-accent)] rounded-lg hover:bg-[var(--admin-accent)]/10 transition font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Content Block
          </button>
          <button
            type="button"
            onClick={addImageBlock}
            disabled={uploading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-[var(--admin-card-bg)] border-2 border-[var(--admin-accent)] text-[var(--admin-accent)] rounded-lg hover:bg-[var(--admin-accent)]/10 transition font-semibold disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploading ? "Uploading..." : "Add Image"}
          </button>
          <button
            type="button"
            onClick={addVideoUpload}
            disabled={uploading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-[var(--admin-card-bg)] border-2 border-[var(--admin-accent)] text-[var(--admin-accent)] rounded-lg hover:bg-[var(--admin-accent)]/10 transition font-semibold disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {uploading ? "Uploading..." : "Add Video"}
          </button>
          <button
            type="button"
            onClick={addYouTube}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-[var(--admin-card-bg)] border-2 border-[var(--admin-accent)] text-[var(--admin-accent)] rounded-lg hover:bg-[var(--admin-accent)]/10 transition font-semibold"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
            </svg>
            Add YouTube
          </button>
        </div>
      </div>
    </div>
  );
}

