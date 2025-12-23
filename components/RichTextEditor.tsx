"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showArticleSearch, setShowArticleSearch] = useState(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const supabase = createClient();

  // Fetch articles for @ mentions
  useEffect(() => {
    async function fetchArticles() {
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(100);
      
      if (data) {
        setArticles(data);
      }
    }
    fetchArticles();
  }, [supabase]);

  // Filter articles based on search query
  useEffect(() => {
    if (articleSearchQuery) {
      const filtered = articles.filter((article) =>
        article.title.toLowerCase().includes(articleSearchQuery.toLowerCase())
      );
      setFilteredArticles(filtered.slice(0, 10));
    } else {
      setFilteredArticles(articles.slice(0, 10));
    }
  }, [articleSearchQuery, articles]);

  // Handle @ symbol for article mentions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "@") {
      setShowArticleSearch(true);
      setArticleSearchQuery("");
    } else if (e.key === "Escape") {
      setShowArticleSearch(false);
      setShowLinkModal(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setShowArticleSearch(true);
        setArticleSearchQuery(textAfterAt);
      } else {
        setShowArticleSearch(false);
      }
    } else {
      setShowArticleSearch(false);
    }
  };

  const applyFormatting = (format: "bold" | "italic") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) {
      alert("Please select some text first");
      return;
    }

    let formattedText = "";
    if (format === "bold") {
      formattedText = `**${selectedText}**`;
    } else if (format === "italic") {
      formattedText = `*${selectedText}*`;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) {
      alert("Please select some text first");
      return;
    }

    setSelectionStart(start);
    setSelectionEnd(end);
    setShowLinkModal(true);
  };

  const applyLink = () => {
    if (!linkUrl) {
      alert("Please enter a URL");
      return;
    }

    const selectedText = value.substring(selectionStart, selectionEnd);
    const linkText = `[${selectedText}](${linkUrl})`;
    const newValue = value.substring(0, selectionStart) + linkText + value.substring(selectionEnd);
    onChange(newValue);

    setShowLinkModal(false);
    setLinkUrl("");
    textareaRef.current?.focus();
  };

  const insertArticleReference = (article: Article) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    const beforeAt = value.substring(0, lastAtSymbol);
    const afterCursor = value.substring(cursorPosition);
    
    const articleLink = `[${article.title}](/article/${article.slug})`;
    const newValue = beforeAt + articleLink + afterCursor;
    
    onChange(newValue);
    setShowArticleSearch(false);
    setArticleSearchQuery("");
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = lastAtSymbol + articleLink.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-t-md border border-gray-300 border-b-0">
        <button
          type="button"
          onClick={() => applyFormatting("bold")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("italic")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Insert Link"
        >
          🔗 Link
        </button>
        <div className="text-sm text-gray-500 ml-auto">
          Type <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">@</kbd> to reference articles
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={true}
        className="w-full min-h-[300px] px-4 py-3 border border-gray-300 rounded-b-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
        style={{ fontFamily: 'inherit' }}
      />

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Insert Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={applyLink}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Search Dropdown */}
      {showArticleSearch && (
        <div className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto w-96">
          {filteredArticles.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No articles found</div>
          ) : (
            filteredArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => insertArticleReference(article)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
              >
                <div className="text-sm font-medium text-gray-900">{article.title}</div>
                <div className="text-xs text-gray-500">/{article.slug}</div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Markdown Guide */}
      <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-gray-600">
        <strong>Formatting Guide:</strong>
        <ul className="mt-1 space-y-1">
          <li>• <strong>Bold:</strong> Select text and click B button or use **text**</li>
          <li>• <strong>Italic:</strong> Select text and click I button or use *text*</li>
          <li>• <strong>Link:</strong> Select text, click Link button, enter URL</li>
          <li>• <strong>Reference Article:</strong> Type @ and select from list</li>
        </ul>
      </div>
    </div>
  );
}
