"use client";

import { useState, useRef, useEffect } from "react";

type ImageEditorProps = {
  imageUrl: string;
  onSave: (croppedImageUrl: string) => void;
  onCancel: () => void;
  aspectRatio?: number; // width/height ratio
  slotName?: string;
};

export function ImageEditor({ imageUrl, onSave, onCancel, aspectRatio, slotName }: ImageEditorProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Default aspect ratios for different ad slots
  const slotAspectRatios: { [key: string]: number } = {
    "homepage-banner": 728 / 90, // 8.09:1
    "homepage-sidebar": 300 / 250, // 1.2:1
    "article-sidebar": 300 / 250, // 1.2:1
    "article-inline": 336 / 280, // 1.2:1
  };

  const finalAspectRatio = aspectRatio || slotAspectRatios[slotName || ""] || 1;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      setImageLoaded(true);
      setImageDimensions({ width: img.width, height: img.height });
      if (imageRef.current) {
        imageRef.current.src = imageUrl;
        // Center image initially
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const imgAspectRatio = img.width / img.height;
          const containerAspectRatio = containerRect.width / containerRect.height;
          
          let displayWidth, displayHeight;
          if (imgAspectRatio > containerAspectRatio) {
            // Image is wider - fit to container width
            displayWidth = containerRect.width;
            displayHeight = containerRect.width / imgAspectRatio;
          } else {
            // Image is taller - fit to container height
            displayHeight = containerRect.height;
            displayWidth = containerRect.height * imgAspectRatio;
          }
          
          setPosition({
            x: (containerRect.width - displayWidth) / 2,
            y: (containerRect.height - displayHeight) / 2,
          });
        }
      }
    };
    img.onerror = () => {
      console.error("Failed to load image:", imageUrl);
    };
  }, [imageUrl]);

  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to container bounds
      const maxX = rect.width;
      const maxY = rect.height;
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  }

  function handleCrop() {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size based on aspect ratio
    const canvasWidth = 800;
    const canvasHeight = canvasWidth / finalAspectRatio;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Get container and image dimensions
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Calculate scale factors from display to natural size
    const scaleX = imageDimensions.width / imgRect.width;
    const scaleY = imageDimensions.height / imgRect.height;
    
    // Calculate the visible area in the container (what we see in the frame)
    const visibleWidth = containerRect.width;
    const visibleHeight = containerRect.height;
    
    // Calculate source rectangle in the original image
    // Account for position, scale, and container offset
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;
    
    // Calculate what portion of the image is visible in the container
    const sourceX = ((imgRect.left - containerRect.left - position.x) / scale) * scaleX;
    const sourceY = ((imgRect.top - containerRect.top - position.y) / scale) * scaleY;
    const sourceWidth = (visibleWidth / scale) * scaleX;
    const sourceHeight = (visibleHeight / scale) * scaleY;

    // Ensure we don't go outside image bounds
    const clampedSourceX = Math.max(0, Math.min(sourceX, imageDimensions.width));
    const clampedSourceY = Math.max(0, Math.min(sourceY, imageDimensions.height));
    const clampedSourceWidth = Math.min(sourceWidth, imageDimensions.width - clampedSourceX);
    const clampedSourceHeight = Math.min(sourceHeight, imageDimensions.height - clampedSourceY);

    // Draw cropped and scaled image to canvas
    ctx.drawImage(
      img,
      clampedSourceX,
      clampedSourceY,
      clampedSourceWidth,
      clampedSourceHeight,
      0,
      0,
      canvasWidth,
      canvasHeight
    );

    // Convert to blob and create URL
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        onSave(url);
      }
    }, "image/jpeg", 0.9);
  }

  if (!imageLoaded) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 relative">
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-600">Loading image...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-[color:var(--color-dark)] mb-4">
          Adjust Image for {slotName ? slotName.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Ad Slot"}
        </h2>

        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold">Zoom:</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-12">{(scale * 100).toFixed(0)}%</span>
          </div>
          <p className="text-xs text-gray-500">
            Drag the image to reposition • Use mouse wheel or slider to zoom • The blue frame shows how it will appear in the ad slot
          </p>
        </div>

        <div
          ref={containerRef}
          className="relative border-2 border-blue-500 rounded-lg overflow-hidden bg-gray-100 mx-auto"
          style={{
            aspectRatio: finalAspectRatio.toString(),
            maxHeight: "400px",
            width: "100%",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {imageLoaded && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Edit"
              className="absolute cursor-move select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: "top left",
                maxWidth: "none",
                height: "auto",
              }}
              draggable={false}
            />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleCrop}
            className="flex-1 px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-md font-semibold hover:bg-opacity-90"
          >
            Save & Use This Image
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-semibold hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
