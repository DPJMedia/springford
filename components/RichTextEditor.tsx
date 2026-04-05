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

  // Show circular bullet (•) and indent in editor; store as "- " for markdown
  const toDisplay = (markdown: string) =>
    (markdown ?? "").replace(/(^|\n)(\s*)([-*])(\s)/g, "$1  •$4");
  const toMarkdown = (display: string) =>
    (display ?? "").replace(/(^|\n)(\s*)•(\s)/g, "$1-$3");

  // Cursor position: textarea shows display string; we edit markdown. Convert between them.
  const markdownToDisplayPosition = (markdown: string, mdPos: number): number => {
    let extra = 0;
    const re = /(^|\n)(\s*)([-*])(\s)/g;
    let m;
    while ((m = re.exec(markdown)) !== null) {
      if (m.index + m[0].length <= mdPos) extra += 2;
      else break;
    }
    return mdPos + extra;
  };
  const displayToMarkdownPosition = (display: string, dispPos: number): number => {
    let subtract = 0;
    const re = /(^|\n)(\s*)•(\s)/g;
    let m;
    while ((m = re.exec(display)) !== null) {
      if (m.index + m[0].length <= dispPos) subtract += 2;
      else break;
    }
    return dispPos - subtract;
  };

  // Handle @ symbol, Escape, and bullet list Enter / Shift+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "@") {
      setShowArticleSearch(true);
      setArticleSearchQuery("");
      return;
    }
    if (e.key === "Escape") {
      setShowArticleSearch(false);
      setShowLinkModal(false);
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const displayValue = toDisplay(value);
    const posDisplay = textarea.selectionStart;
    const pos = displayToMarkdownPosition(displayValue, posDisplay);
    const lineStart = value.substring(0, pos).lastIndexOf("\n") + 1;
    const currentLine = value.substring(lineStart).split("\n")[0] || "";
    const isBulletLine = /^\s*[-*]\s/.test(currentLine);

    if (e.key === "Enter") {
      const bulletContent = currentLine.replace(/^\s*[-*]\s*/, "").trim();
      const emptyBulletLine = isBulletLine && !bulletContent;

      if (e.shiftKey) {
        // Shift+Enter: new line without bullet (exit list)
        if (isBulletLine) {
          e.preventDefault();
          const insert = "\n";
          const newValue = value.substring(0, pos) + insert + value.substring(pos);
          onChange(newValue);
          const newMdPos = pos + insert.length;
          const newDispPos = markdownToDisplayPosition(newValue, newMdPos);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newDispPos, newDispPos);
          }, 0);
        }
        return;
      }
      // Enter: if in bullet list, new bullet line (or exit if line is empty, like Google Docs)
      if (isBulletLine) {
        e.preventDefault();
        const insert = emptyBulletLine ? "\n" : "\n- ";
        const newValue = value.substring(0, pos) + insert + value.substring(pos);
        onChange(newValue);
        const newMdPos = pos + insert.length;
        const newDispPos = markdownToDisplayPosition(newValue, newMdPos);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newDispPos, newDispPos);
        }, 0);
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const displayText = e.target.value;
    const markdown = toMarkdown(displayText);
    onChange(markdown);

    // Check for @ mentions (use markdown for logic)
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = displayText.substring(0, cursorPosition);
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

  const insertBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const displayValue = toDisplay(value);
    const startDisp = textarea.selectionStart;
    const endDisp = textarea.selectionEnd;
    const start = displayToMarkdownPosition(displayValue, startDisp);
    const end = displayToMarkdownPosition(displayValue, endDisp);
    const text = value;
    const textBeforeSelection = text.substring(0, start);
    const textAfterSelection = text.substring(end);
    const selectedText = text.substring(start, end);

    const lineStart = textBeforeSelection.lastIndexOf("\n") + 1;
    const afterNewline = textAfterSelection.indexOf("\n");
    const lineEnd = end + (afterNewline >= 0 ? afterNewline : textAfterSelection.length);

    if (selectedText) {
      // Multiple lines or selection: prefix each line with "- "
      const lines = selectedText.split("\n");
      const bulletLines = lines.map((line) => {
        const trimmed = line.replace(/^\s*[-*]\s*/, "");
        return trimmed ? `- ${trimmed}` : (line ? `- ${line}` : "- ");
      });
      const newSelection = bulletLines.join("\n");
      const newValue = text.substring(0, start) + newSelection + text.substring(end);
      onChange(newValue);
      const newEndMd = start + newSelection.length;
      const newEndDisp = markdownToDisplayPosition(newValue, newEndMd);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newEndDisp, newEndDisp);
      }, 0);
    } else {
      // No selection: add/remove bullet at start of current line
      const currentLine = text.substring(lineStart, lineEnd);
      const alreadyBullet = /^\s*[-*]\s/.test(currentLine);
      let newValue: string;
      let newCursorMd: number;

      if (alreadyBullet) {
        const withoutBullet = currentLine.replace(/^\s*[-*]\s*/, "");
        newValue = text.substring(0, lineStart) + withoutBullet + text.substring(lineEnd);
        newCursorMd = lineStart + withoutBullet.length;
      } else {
        const bulletLine = `- ${currentLine}`;
        newValue = text.substring(0, lineStart) + bulletLine + text.substring(lineEnd);
        newCursorMd = lineStart + 2; // cursor after "- " (ready to type)
      }
      onChange(newValue);
      const newCursorDisp = markdownToDisplayPosition(newValue, newCursorMd);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorDisp, newCursorDisp);
      }, 0);
    }
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
      <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--admin-table-header-bg)] rounded-t-md border border-[var(--admin-border)] border-b-0">
        <button
          type="button"
          onClick={() => applyFormatting("bold")}
          className="px-3 py-1 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded hover:bg-[var(--admin-table-row-hover)] text-[var(--admin-text)] font-bold"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("italic")}
          className="px-3 py-1 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded hover:bg-[var(--admin-table-row-hover)] text-[var(--admin-text)] italic"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="px-3 py-1 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded hover:bg-[var(--admin-table-row-hover)] text-[var(--admin-text)]"
          title="Insert Link"
        >
          🔗 Link
        </button>
        <button
          type="button"
          onClick={insertBulletList}
          className="px-3 py-1 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded hover:bg-[var(--admin-table-row-hover)] text-[var(--admin-text)] flex items-center gap-1"
          title="Bullet list (prefix line or selection with -)"
        >
          <span className="text-lg leading-none">•</span>
          <span className="text-sm">Bullets</span>
        </button>
        <div className="text-sm text-[var(--admin-text-muted)] ml-auto">
          Type <kbd className="px-1 py-0.5 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded text-xs text-[var(--admin-text)]">@</kbd> to reference articles
        </div>
      </div>

      {/* Textarea: show • (circle) and indent; store as "- " for markdown */}
      <textarea
        ref={textareaRef}
        value={toDisplay(value)}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={true}
        className="w-full min-h-[300px] px-4 py-3 border border-[var(--admin-border)] rounded-b-md focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)] text-base bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)]"
        style={{ fontFamily: 'inherit' }}
      />

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4 text-[var(--admin-text)]">Insert Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-[var(--admin-border)] rounded mb-4 bg-[var(--admin-table-header-bg)] text-[var(--admin-text)]"
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
                className="px-4 py-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-table-header-bg)] rounded"
              >
                Cancel
              </button>
              <button
                onClick={applyLink}
                className="px-4 py-2 bg-[var(--admin-accent)] text-black rounded hover:opacity-90 font-semibold"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Search Dropdown */}
      {showArticleSearch && (
        <div className="absolute z-10 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-lg shadow-lg max-h-64 overflow-y-auto w-96">
          {filteredArticles.length === 0 ? (
            <div className="p-3 text-sm text-[var(--admin-text-muted)]">No articles found</div>
          ) : (
            filteredArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => insertArticleReference(article)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--admin-table-header-bg)] border-b border-[var(--admin-border)] last:border-0"
              >
                <div className="text-sm font-medium text-[var(--admin-text)]">{article.title}</div>
                <div className="text-xs text-[var(--admin-text-muted)]">/{article.slug}</div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Markdown Guide */}
      <div className="mt-2 p-3 bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)] rounded text-xs text-[var(--admin-text-muted)]">
        <strong className="text-[var(--admin-text)]">Formatting Guide:</strong>
        <ul className="mt-1 space-y-1">
          <li>• <strong className="text-[var(--admin-text)]">Bold:</strong> Select text and click B button or use **text**</li>
          <li>• <strong className="text-[var(--admin-text)]">Italic:</strong> Select text and click I button or use *text*</li>
          <li>• <strong className="text-[var(--admin-text)]">Link:</strong> Select text, click Link button, enter URL</li>
          <li>• <strong className="text-[var(--admin-text)]">Bullets:</strong> Click Bullets to start a list. Enter = new bullet line; Shift+Enter = new line without bullet (like Google Docs).</li>
          <li>• <strong className="text-[var(--admin-text)]">Reference Article:</strong> Type @ and select from list</li>
        </ul>
      </div>
    </div>
  );
}
