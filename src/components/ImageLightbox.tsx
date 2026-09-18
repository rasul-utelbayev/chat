import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
        <div
          className="absolute -top-12 right-0 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={imageUrl}
            download="chat-image.jpg"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
            title="Yuklab olish"
          >
            <Download size={18} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
            title="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <img
          src={imageUrl}
          alt="To'liq rasm"
          className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
