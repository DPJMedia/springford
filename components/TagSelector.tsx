"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type TagSelectorProps = {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
};

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [mode, setMode] = useState<"existing" | "new" | "hidden">("existing");
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [hiddenTags, setHiddenTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingTag, setProcessingTag] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAllTags() {
      // Fetch all tags from articles
      const { data: articlesData } = await supabase
        .from("articles")
        .select("tags")
        .not("tags", "is", null);

      // Fetch hidden tags
      const { data: hiddenData } = await supabase
        .from("hidden_tags")
        .select("tag_name");

      const hiddenTagNames = hiddenData?.map((ht) => ht.tag_name) || [];
      setHiddenTags(hiddenTagNames);

      if (articlesData) {
        // Extract all unique tags from all articles
        const allTags = new Set<string>();
        articlesData.forEach((article: any) => {
          if (article.tags && Array.isArray(article.tags)) {
            article.tags.forEach((tag: string) => allTags.add(tag));
          }
        });
        
        // Filter out hidden tags from existing tags
        const visibleTags = Array.from(allTags).filter(tag => !hiddenTagNames.includes(tag));
        setExistingTags(visibleTags.sort());
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

  const handleHideTag = async (tagToHide: string) => {
    setProcessingTag(tagToHide);

    try {
      const { error } = await supabase
        .from("hidden_tags")
        .insert({ tag_name: tagToHide });

      if (error) {
        console.error("Error hiding tag:", error);
        
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('relation "hidden_tags" does not exist')) {
          alert("The hidden_tags table hasn't been created yet. Please run the supabase-hidden-tags.sql migration first.");
        } else {
          alert(`Failed to hide tag: ${error.message || 'Unknown error'}`);
        }
        
        setProcessingTag(null);
        return;
      }

      // Update local state
      setExistingTags(existingTags.filter((t) => t !== tagToHide));
      setHiddenTags([...hiddenTags, tagToHide].sort());
    } catch (error: any) {
      console.error("Error hiding tag:", error);
      alert(`An error occurred while hiding the tag: ${error?.message || 'Unknown error'}`);
    } finally {
      setProcessingTag(null);
    }
  };

  const handleUnhideTag = async (tagToUnhide: string) => {
    setProcessingTag(tagToUnhide);

    try {
      const { error } = await supabase
        .from("hidden_tags")
        .delete()
        .eq("tag_name", tagToUnhide);

      if (error) {
        console.error("Error unhiding tag:", error);
        alert(`Failed to unhide tag: ${error.message || 'Unknown error'}`);
        setProcessingTag(null);
        return;
      }

      // Update local state
      setHiddenTags(hiddenTags.filter((t) => t !== tagToUnhide));
      setExistingTags([...existingTags, tagToUnhide].sort());
    } catch (error: any) {
      console.error("Error unhiding tag:", error);
      alert(`An error occurred while unhiding the tag: ${error?.message || 'Unknown error'}`);
    } finally {
      setProcessingTag(null);
    }
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
        <button
          type="button"
          onClick={() => setMode("hidden")}
          className={`px-4 py-2 rounded-md font-semibold transition ${
            mode === "hidden"
              ? "bg-[color:var(--color-riviera-blue)] text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Hidden Tags {hiddenTags.length > 0 && `(${hiddenTags.length})`}
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
                Click to add existing tags (hover to hide):
              </p>
              <div className="flex flex-wrap gap-2">
                {existingTags.map((tag) => (
                  <div
                    key={tag}
                    className="relative group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      disabled={processingTag === tag}
                      className={`px-3 py-1 pr-8 text-sm font-medium rounded-full transition ${
                        selectedTags.includes(tag)
                          ? "bg-[color:var(--color-riviera-blue)] text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      } ${processingTag === tag ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {tag}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHideTag(tag);
                      }}
                      disabled={processingTag === tag}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-orange-500 text-gray-600 hover:text-white rounded-full p-1 transition-all"
                      title="Hide this tag from the list"
                    >
                      {processingTag === tag ? (
                        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
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

      {/* Hidden Tags Mode */}
      {mode === "hidden" && (
        <div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading hidden tags...</p>
          ) : hiddenTags.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hidden tags. Tags you hide will appear here.
            </p>
          ) : (
            <div className="border border-orange-300 bg-orange-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Click to unhide tags:
              </p>
              <div className="flex flex-wrap gap-2">
                {hiddenTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleUnhideTag(tag)}
                    disabled={processingTag === tag}
                    className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium bg-orange-200 text-orange-800 hover:bg-orange-300 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingTag === tag ? (
                      <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



