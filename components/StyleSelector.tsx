import React from 'react';
import { StylePreset } from '../types';

interface StyleSelectorProps {
  selectedStyleId: string;
  onSelect: (id: string) => void;
}

export const STYLES: StylePreset[] = [
  {
    id: 'none',
    name: 'Natural / Raw',
    description: 'No specific style filter.',
    promptModifier: 'Photorealistic, natural lighting, high fidelity',
    thumbnail: 'https://picsum.photos/id/28/100/100'
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Movie-like lighting and composition.',
    promptModifier: 'Cinematic lighting, 8k resolution, photorealistic, depth of field, anamorphic lens flare, movie still',
    thumbnail: 'https://picsum.photos/id/435/100/100'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon lights and futuristic tech.',
    promptModifier: 'Cyberpunk 2077 style, neon lights, futuristic, high tech low life, vibrant colors, volumetric fog, synthetic',
    thumbnail: 'https://picsum.photos/id/532/100/100'
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft and artistic.',
    promptModifier: 'Watercolor painting, soft edges, artistic, wet on wet, pastel colors, paper texture, masterpiece',
    thumbnail: 'https://picsum.photos/id/104/100/100'
  },
  {
    id: '3d-render',
    name: '3D Render',
    description: 'Clean Octane render style.',
    promptModifier: '3D render, Octane render, unreal engine 5, ray tracing, clean composition, plastic and glass materials, studio lighting',
    thumbnail: 'https://picsum.photos/id/8/100/100'
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese animation style.',
    promptModifier: 'Anime style, Studio Ghibli inspired, cel shaded, vibrant, detailed background, 2D animation',
    thumbnail: 'https://picsum.photos/id/453/100/100'
  }
];

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyleId, onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {STYLES.map((style) => (
        <button
          key={style.id}
          onClick={() => onSelect(style.id)}
          className={`relative group rounded-xl overflow-hidden border transition-all duration-300 text-left h-24 shadow-sm ${
            selectedStyleId === style.id
              ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
              : 'border-gray-700 hover:border-gray-500 hover:scale-[1.02]'
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0 bg-gray-800">
             <img 
               src={style.thumbnail} 
               alt={style.name} 
               className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300" 
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 p-2 w-full z-10">
            <div className="text-xs font-bold text-white drop-shadow-md">{style.name}</div>
            <div className="text-[10px] text-gray-300 truncate opacity-80">{style.description}</div>
          </div>
          
          {selectedStyleId === style.id && (
            <div className="absolute top-1 right-1 bg-purple-600 rounded-full p-1 shadow-lg animate-zoom-in">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};