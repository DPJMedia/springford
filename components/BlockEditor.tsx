"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "./RichTextEditor";

export interface ContentBlock {
  id: string;
  type: "text" | "image";
  content?: string; // For text blocks
  url?: string; // For image blocks
  caption?: string; // For image blocks
  credit?: string; // For image blocks
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
          className="border-2 border-gray-300 rounded-lg p-4 bg-white relative"
        >
          {/* Block header with controls */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700">
              {block.type === "text" ? "📝 Content Block" : "🖼️ Image Block"} #{index + 1}
            </span>
            <div className="flex gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, "up")}
                  className="p-1 text-gray-600 hover:text-gray-900 transition"
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
                  className="p-1 text-gray-600 hover:text-gray-900 transition"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Image caption (optional)"
              />
              <input
                type="text"
                value={block.credit || ""}
                onChange={(e) => updateBlock(block.id, { credit: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Photo credit (optional)"
              />
            </div>
          )}
        </div>
      ))}

      {/* Add block buttons */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700 mb-3">Optional - Add More Content:</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={addTextBlock}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition font-semibold disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploading ? "Uploading..." : "Add Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

