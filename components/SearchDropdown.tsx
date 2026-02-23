"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type SearchDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

export function SearchDropdown({ isOpen, onClose, anchorRef }: SearchDropdownProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && containerRef.current && !containerRef.current.contains(target) && anchorRef.current && !anchorRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = (e.target as HTMLFormElement).query.value?.trim();
    if (!q) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full mt-1 z-50 w-72 sm:w-80 min-w-[18rem]"
      role="search"
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2 shadow-lg ring-1 ring-black/5"
      >
        <input
          ref={inputRef}
          type="search"
          name="query"
          placeholder="What can we help you find?"
          className="flex-1 min-w-0 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          className="flex-shrink-0 p-1.5 text-black hover:bg-gray-100 rounded transition"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
