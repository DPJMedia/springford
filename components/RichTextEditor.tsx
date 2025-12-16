"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  function insertAtCursor(before: string, after: string = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newValue = beforeText + before + selectedText + after + afterText;
    onChange(newValue);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  function addLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) {
      alert("Please select some text first to add a link");
      return;
    }

    const url = prompt("Enter the URL:");
    if (!url) return;

    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${selectedText}</a>`;
    insertAtCursor(linkHtml, "");
  }

  async function addImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);

      try {
        // Upload to Supabase
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("article-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("article-images")
          .getPublicUrl(fileName);

        const caption = prompt("Enter image caption (optional):");
        const credit = prompt("Enter photo credit (optional):");

        let imageHtml = `\n\n<div class="my-6">\n  <img src="${publicUrl}" alt="${caption || 'Article image'}" class="w-full rounded-lg shadow-lg" />\n`;
        
        if (caption || credit) {
          imageHtml += `  <p class="mt-2 text-sm text-gray-600 italic">`;
          if (caption) imageHtml += caption;
          if (credit) imageHtml += credit ? ` ${caption ? '- ' : ''}Photo: ${credit}` : '';
          imageHtml += `</p>\n`;
        }
        
        imageHtml += `</div>\n\n`;

        insertAtCursor(imageHtml, "");
      } catch (error: any) {
        alert("Error uploading image: " + error.message);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  }

  function addBold() {
    insertAtCursor("<strong>", "</strong>");
  }

  function addItalic() {
    insertAtCursor("<em>", "</em>");
  }

  function addHeading() {
    insertAtCursor("\n\n<h3 class=\"text-2xl font-bold text-gray-900 mt-6 mb-3\">", "</h3>\n\n");
  }

  function addParagraph() {
    insertAtCursor("\n\n<p class=\"mb-4\">", "</p>\n\n");
  }

  function addQuote() {
    insertAtCursor("\n\n<blockquote class=\"border-l-4 border-blue-600 pl-4 italic my-6 text-gray-700\">", "</blockquote>\n\n");
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addBold}
          className="px-3 py-1 text-sm font-bold bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={addItalic}
          className="px-3 py-1 text-sm italic bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={addHeading}
          className="px-3 py-1 text-sm font-semibold bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
          title="Heading"
        >
          H
        </button>
        <button
          type="button"
          onClick={addParagraph}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
          title="Paragraph"
        >
          ¶
        </button>
        <button
          type="button"
          onClick={addQuote}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
          title="Quote"
        >
          " "
        </button>
        <div className="border-l border-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={addLink}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition flex items-center gap-1"
          title="Add Link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Link
        </button>
        <button
          type="button"
          onClick={addImage}
          disabled={uploading}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition flex items-center gap-1 disabled:opacity-50"
          title="Add Image"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {uploading ? "Uploading..." : "Image"}
        </button>
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        className="w-full px-4 py-3 font-serif text-base leading-relaxed focus:outline-none resize-none"
        placeholder={placeholder || "Write your article content here...\n\nYou can use the toolbar above to add formatting, links, and images."}
      />

      {/* Help Text */}
      <div className="bg-gray-50 border-t border-gray-300 p-2 text-xs text-gray-600">
        <strong>Tips:</strong> Select text and click "Link" to add hyperlinks • Click "Image" to upload and insert images with captions • Use formatting buttons for bold, italic, headings, and quotes
      </div>
    </div>
  );
}

