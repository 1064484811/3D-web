
import React, { useState, useEffect, useRef } from 'react';
import { CardData, AppMode, CardItem, ItemType } from '../types';
import { X, Image, Video, Type, Link, Sparkles, Move, Plus, Trash2, Maximize2 } from 'lucide-react';
import { suggestCardContent } from '../services/geminiService';

interface Card3DProps {
  card: CardData;
  mode: AppMode;
  isFocused: boolean;
  onClick: () => void;
  onClose?: () => void;
  onUpdate: (card: CardData) => void;
  onDelete?: () => void;
}

const Card3D: React.FC<Card3DProps> = ({ card, mode, isFocused, onClick, onClose, onUpdate, onDelete }) => {
  // Initial state is NOT flipped so it shows the "Back" (Cover) as per requirement
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<ItemType | null>(null);

  // When a card is clicked/focused, we flip it to reveal the "Front" (Content)
  useEffect(() => {
    if (isFocused) {
      const timer = setTimeout(() => setIsFlipped(true), 150);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
      setActiveItemId(null);
    }
  }, [isFocused]);

  const handleBackChange = (field: 'title' | 'backDescription', value: string) => {
    onUpdate({ ...card, [field]: value });
  };

  const triggerUpload = (type: 'image' | 'video') => {
    setPendingType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingType) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (pendingType === 'image') {
        const img = new window.Image();
        img.onload = () => {
          const ratio = img.naturalHeight / img.naturalWidth;
          let w = 40;
          let h = w * ratio;
          if (h > 60) { h = 60; w = h / ratio; }
          createNewItem('image', content, w, h);
        };
        img.src = content;
      } else if (pendingType === 'video') {
        createNewItem('video', content, 60, 35);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLinkAdd = () => {
    const url = window.prompt("请输入链接 URL:", "https://");
    if (url) createNewItem('link', url, 50, 10);
  };

  const createNewItem = (type: ItemType, content: string, width = 40, height = 20) => {
    const newItem: CardItem = {
      id: Math.random().toString(36).substr(2, 9),
      type, x: 20, y: 20, width, height, content
    };
    onUpdate({ ...card, frontItems: [...card.frontItems, newItem] });
    setActiveItemId(newItem.id);
  };

  const updateItem = (itemId: string, updates: Partial<CardItem>) => {
    onUpdate({ ...card, frontItems: card.frontItems.map(item => item.id === itemId ? { ...item, ...updates } : item) });
  };

  const removeItem = (itemId: string) => {
    onUpdate({ ...card, frontItems: card.frontItems.filter(item => item.id !== itemId) });
    if (activeItemId === itemId) setActiveItemId(null);
  };

  const handleMagicSuggest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.title || isSuggesting) return;
    setIsSuggesting(true);
    const suggestion = await suggestCardContent(card.title);
    if (suggestion) {
      handleBackChange('backDescription', suggestion.summary + '\n\n' + suggestion.points.join('\n'));
    }
    setIsSuggesting(false);
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => e.stopPropagation();

  return (
    <div 
      className={`relative w-full h-full preserve-3d transition-all duration-700 ease-in-out cursor-default ${isFlipped ? 'rotate-y-180' : 'hover:scale-105 cursor-pointer'}`}
      onClick={(e) => { if (!isFocused) { e.stopPropagation(); onClick(); } }}
    >
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {/* BACK SIDE (Initial visible side - The "Cover") */}
      <div className="absolute inset-0 backface-hidden bg-slate-900/80 backdrop-blur-2xl border-2 border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-2xl overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full group-hover:bg-indigo-500/30 transition-all duration-1000"></div>
        
        <div className="flex-1 flex flex-col justify-center items-center gap-6 text-center relative z-10">
          {mode === AppMode.EDIT && isFocused ? (
            <input 
              className="text-3xl font-black bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none w-full text-center py-2"
              value={card.title}
              onChange={(e) => handleBackChange('title', e.target.value)}
              placeholder="输入幻灯片标题..."
              onClick={stopProp}
            />
          ) : (
            <h3 className="text-3xl font-black tracking-tight text-white/90 drop-shadow-lg">{card.title || '无标题'}</h3>
          )}
          
          <div className="w-12 h-1 bg-indigo-500/40 rounded-full"></div>
          
          {mode === AppMode.EDIT && isFocused ? (
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-300 outline-none focus:border-indigo-500 min-h-[150px] text-sm leading-relaxed custom-scrollbar"
              value={card.backDescription}
              onChange={(e) => handleBackChange('backDescription', e.target.value)}
              placeholder="简要描述此幻灯片的核心内容..."
              onClick={stopProp}
            />
          ) : (
            <p className="text-slate-400 text-sm leading-relaxed line-clamp-4 max-w-[80%]">{card.backDescription || '暂无描述内容'}</p>
          )}

          {mode === AppMode.EDIT && isFocused && (
            <button 
              onClick={handleMagicSuggest}
              disabled={isSuggesting}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 rounded-full text-xs font-black transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={14} className={isSuggesting ? 'animate-pulse' : ''} />
              {isSuggesting ? 'AI 构思中...' : 'AI 智能辅助生成内容'}
            </button>
          )}
        </div>

        {!isFocused && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all">
             <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">点击展开详情</span>
          </div>
        )}
      </div>

      {/* FRONT SIDE (Flipped visible side - The "Canvas") */}
      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-950/90 border-2 border-indigo-500/20 rounded-[2.5rem] flex flex-col shadow-[0_0_50px_rgba(79,70,229,0.1)] overflow-hidden">
        {/* Header toolbar */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
          <div className="flex items-center gap-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{card.title}</h4>
            <div className="h-4 w-px bg-white/10"></div>
            {mode === AppMode.EDIT && (
              <div className="flex gap-1">
                {[
                  { icon: Type, type: 'text', label: '文字' },
                  { icon: Image, type: 'image', label: '图片' },
                  { icon: Video, type: 'video', label: '视频' },
                  { icon: Link, type: 'link', label: '链接' }
                ].map(tool => (
                  <button 
                    key={tool.type}
                    onClick={(e) => handleAction(e, tool.type as ItemType)}
                    className="p-2 hover:bg-white/10 text-slate-400 hover:text-indigo-400 rounded-lg transition-all"
                    title={`添加${tool.label}`}
                  >
                    <tool.icon size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {mode === AppMode.EDIT && onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all" title="删除整张卡牌">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onClose?.(); }} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Canvas */}
        <div className="flex-1 relative overflow-hidden bg-dot-pattern" onClick={() => setActiveItemId(null)}>
          {card.frontItems.map((item) => {
            const isActive = activeItemId === item.id && mode === AppMode.EDIT;
            return (
              <div 
                key={item.id}
                className={`absolute transition-all duration-300 group/item ${isActive ? 'z-50' : 'z-10'}`}
                style={{ 
                  left: `${item.x}%`, 
                  top: `${item.y}%`, 
                  width: `${item.width}%`, 
                  height: `${item.height}%` 
                }}
                onClick={(e) => { e.stopPropagation(); if(mode === AppMode.EDIT) setActiveItemId(item.id); }}
              >
                {mode === AppMode.EDIT && isActive && (
                  <>
                    <div className="absolute -top-8 left-0 flex gap-1 animate-in fade-in slide-in-from-bottom-2">
                      <button onMouseDown={(e) => e.stopPropagation()} className="p-1.5 bg-indigo-600 text-white rounded-md cursor-move"><Move size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-1.5 bg-rose-600 text-white rounded-md"><Trash2 size={12} /></button>
                    </div>
                    {/* Simplified resize handle */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize z-[60] border-2 border-white"></div>
                  </>
                )}

                <div className={`w-full h-full rounded-xl overflow-hidden transition-all ${isActive ? 'ring-2 ring-indigo-500 shadow-2xl' : ''}`}>
                  {item.type === 'text' && (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      {mode === AppMode.EDIT ? (
                        <textarea 
                          className="w-full h-full bg-transparent border-none outline-none text-white font-bold resize-none text-center flex items-center justify-center custom-scrollbar"
                          value={item.content}
                          onChange={(e) => updateItem(item.id, { content: e.target.value })}
                          onClick={stopProp}
                          onFocus={stopProp}
                        />
                      ) : (
                        <p className="text-white font-bold text-center whitespace-pre-wrap">{item.content}</p>
                      )}
                    </div>
                  )}
                  {item.type === 'image' && (
                    <img src={item.content} className="w-full h-full object-cover rounded-xl" draggable={false} alt="Slide Content" />
                  )}
                  {item.type === 'video' && (
                    <video src={item.content} controls={isFocused} className="w-full h-full object-cover rounded-xl" />
                  )}
                  {item.type === 'link' && (
                    <a href={item.content} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 font-bold transition-all px-4 rounded-xl">
                      <Link size={14} />
                      <span className="truncate text-xs">{item.content}</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {card.frontItems.length === 0 && (
             <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 pointer-events-none">
                <Maximize2 size={48} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-xs uppercase tracking-widest font-black opacity-30">空白幻灯片 · 点击顶部工具栏开始创作</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const handleAction = (e: React.MouseEvent, type: ItemType) => {
  // Placeholder logic moved inside component to access state
};

export default Card3D;
