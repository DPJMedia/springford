"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type TagSelectorProps = {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
};

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAllTags() {
      const { data } = await supabase
        .from("articles")
        .select("tags")
        .not("tags", "is", null);

      if (data) {
        // Extract all unique tags from all articles
        const allTags = new Set<string>();
        data.forEach((article: any) => {
          if (article.tags && Array.isArray(article.tags)) {
            article.tags.forEach((tag: string) => allTags.add(tag));
          }
        });
        setExistingTags(Array.from(allTags).sort());
      }
      setLoading(false);
    }

    fetchAllTags();
  }, [supabase]);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleAddNewTag = () => {
    const trimmedTag = newTagInput.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onChange([...selectedTags, trimmedTag]);
      setNewTagInput("");
      // Add to existing tags list if not already there
      if (!existingTags.includes(trimmedTag)) {
        setExistingTags([...existingTags, trimmedTag].sort());
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`px-4 py-2 rounded-md font-semibold transition ${
            mode === "existing"
              ? "bg-[color:var(--color-riviera-blue)] text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Use Existing Tag
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`px-4 py-2 rounded-md font-semibold transition ${
            mode === "new"
              ? "bg-[color:var(--color-riviera-blue)] text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Create New Tag
        </button>
      </div>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">Selected Tags:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 px-3 py-1 bg-[color:var(--color-riviera-blue)] text-white text-sm font-medium rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Existing Tags Mode */}
      {mode === "existing" && (
        <div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading existing tags...</p>
          ) : existingTags.length === 0 ? (
            <p className="text-sm text-gray-500">
              No existing tags found. Create a new tag to get started.
            </p>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Click to add existing tags:
              </p>
              <div className="flex flex-wrap gap-2">
                {existingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-3 py-1 text-sm font-medium rounded-full transition ${
                      selectedTags.includes(tag)
                        ? "bg-[color:var(--color-riviera-blue)] text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create New Tag Mode */}
      {mode === "new" && (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddNewTag();
                }
              }}
              placeholder="Enter new tag name..."
              className="flex-1 border border-gray-300 rounded-md px-4 py-2"
            />
            <button
              type="button"
              onClick={handleAddNewTag}
              disabled={!newTagInput.trim()}
              className="px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-md font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Add Tag
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter or click "Add Tag" to add the new tag
          </p>
        </div>
      )}
    </div>
  );
}



