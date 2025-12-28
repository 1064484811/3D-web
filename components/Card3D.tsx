
import React, { useState, useEffect, useRef } from 'react';
import { CardData, AppMode, CardItem, ItemType } from '../types';
import { X, Image, Video, Type, Link, Sparkles, Move, Plus } from 'lucide-react';
import { suggestCardContent } from '../services/geminiService';

interface Card3DProps {
  card: CardData;
  mode: AppMode;
  isFocused: boolean;
  onClick: () => void;
  onClose?: () => void;
  onUpdate: (card: CardData) => void;
}

const Card3D: React.FC<Card3DProps> = ({ card, mode, isFocused, onClick, onClose, onUpdate }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<ItemType | null>(null);

  useEffect(() => {
    if (isFocused) {
      const timer = setTimeout(() => setIsFlipped(true), 150);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
    }
  }, [isFocused]);

  const firstImage = card.frontItems.find(item => item.type === 'image');

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
          let w = 60;
          let h = w * ratio;
          if (h > 80) {
            h = 80;
            w = h / ratio;
          }
          createNewItem('image', content, w, h);
        };
        img.src = content;
      } else if (pendingType === 'video') {
        createNewItem('video', content, 70, 40);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLinkAdd = () => {
    const url = window.prompt("请输入链接:", "https://");
    if (url) createNewItem('link', url, 40, 10);
  };

  const createNewItem = (type: ItemType, content: string, width = 40, height = 20) => {
    const newItem: CardItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 15,
      y: 15,
      width,
      height,
      content
    };
    onUpdate({ ...card, frontItems: [...card.frontItems, newItem] });
  };

  const handleAction = (e: React.MouseEvent, type: ItemType) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'text') createNewItem('text', '在此编辑文字...', 80, 15);
    else if (type === 'image' || type === 'video') triggerUpload(type);
    else if (type === 'link') handleLinkAdd();
  };

  const updateItem = (itemId: string, updates: Partial<CardItem>) => {
    onUpdate({
      ...card,
      frontItems: card.frontItems.map(item => item.id === itemId ? { ...item, ...updates } : item)
    });
  };

  const removeItem = (itemId: string) => {
    onUpdate({
      ...card,
      frontItems: card.frontItems.filter(item => item.id !== itemId)
    });
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

  const stopProp = (e: React.MouseEvent | React.FocusEvent | React.WheelEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className={`relative w-full h-full preserve-3d transition-all duration-500 ease-out ${isFocused ? '' : 'hover:scale-105 cursor-pointer'}`}
      onClick={(e) => { if (!isFocused) { e.stopPropagation(); onClick(); } }}
    >
      <div className={`relative w-full h-full preserve-3d transition-transform duration-[700ms] cubic-bezier(0.4, 0, 0.2, 1) ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* 背面面（展示面 / 封面） */}
        <div className={`absolute inset-0 backface-hidden bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] flex flex-col p-10 overflow-hidden shadow-2xl ${isFlipped ? 'pointer-events-none' : 'pointer-events-auto'}`}>
          {firstImage && (
            <div className="absolute inset-0 z-0 opacity-20">
               <img src={firstImage.content} className="w-full h-full object-cover blur-md scale-110" alt="bg" />
            </div>
          )}
          
          <div className="relative z-10 flex flex-col h-full">
            <input
              disabled={mode === AppMode.PRESENT || isFocused}
              value={card.title}
              onMouseDown={stopProp}
              onChange={(e) => handleBackChange('title', e.target.value)}
              className="bg-transparent text-3xl font-bold text-white border-none focus:outline-none placeholder-slate-700 mb-8"
              placeholder="卡牌标题"
            />
            <textarea
              disabled={mode === AppMode.PRESENT || isFocused}
              value={card.backDescription}
              onMouseDown={stopProp}
              onChange={(e) => handleBackChange('backDescription', e.target.value)}
              className="flex-1 bg-transparent text-slate-400 border-none focus:outline-none resize-none leading-relaxed placeholder-slate-800 text-lg"
              placeholder="内容简介..."
            />
            {mode === AppMode.EDIT && !isFocused && (
              <button 
                onMouseDown={stopProp}
                onClick={handleMagicSuggest} 
                disabled={isSuggesting} 
                className="mt-6 flex items-center justify-center gap-3 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-indigo-400 text-sm font-bold border border-white/5 cursor-pointer"
              >
                <Sparkles size={16} className={isSuggesting ? 'animate-spin' : ''} />
                AI 内容建议
              </button>
            )}
          </div>
        </div>

        {/* 正面（编辑详情面 / 内容面） */}
        <div 
          className={`absolute inset-0 backface-hidden rotate-y-180 bg-slate-950/98 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.8)] ${isFlipped ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ transform: 'rotateY(180deg) translateZ(1px)' }}
        >
          {/* 文件上传容器，必须在交互活跃面上 */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
            onClick={stopProp}
          />

          <div className="relative flex items-center justify-between px-10 py-6 bg-black/60 border-b border-white/10 z-[200]" onMouseDown={stopProp}>
            <span className="font-bold text-slate-500 text-[10px] uppercase tracking-[0.2em] pointer-events-none">{card.title}</span>
            <div className="flex items-center gap-2">
              {mode === AppMode.EDIT && (
                <div 
                  className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl mr-4 border border-white/5" 
                  onMouseDown={stopProp}
                >
                  <button onClick={(e) => handleAction(e, 'text')} className="p-3 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-400 transition-all cursor-pointer"><Type size={18}/></button>
                  <button onClick={(e) => handleAction(e, 'image')} className="p-3 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-400 transition-all cursor-pointer"><Image size={18}/></button>
                  <button onClick={(e) => handleAction(e, 'video')} className="p-3 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-400 transition-all cursor-pointer"><Video size={18}/></button>
                  <button onClick={(e) => handleAction(e, 'link')} className="p-3 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-400 transition-all cursor-pointer"><Link size={18}/></button>
                </div>
              )}
              <button 
                onMouseDown={stopProp}
                onClick={(e) => { e.stopPropagation(); onClose?.(); }} 
                className="p-3 bg-white/5 hover:bg-rose-500 text-white rounded-2xl transition-all shadow-lg active:scale-90 border border-white/10 cursor-pointer"
              >
                <X size={20} strokeWidth={2.5}/>
              </button>
            </div>
          </div>

          <div 
            className="relative flex-1 overflow-hidden p-6 z-[100]"
            onWheel={stopProp} // 阻止正文页面内部滚动冒泡到全局缩放
          >
            {card.frontItems.map((item) => (
              <CardItemElement key={item.id} item={item} mode={mode} isFocused={isFocused} onUpdate={(updates) => updateItem(item.id, updates)} onRemove={() => removeItem(item.id)} />
            ))}
            {card.frontItems.length === 0 && mode === AppMode.EDIT && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 pointer-events-none">
                <div className="mb-4 border-2 border-dashed border-slate-800 rounded-3xl p-12">
                   <Plus size={48} className="opacity-20" />
                </div>
                <p className="text-sm font-bold tracking-widest uppercase opacity-40">点击上方按钮添加内容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CardItemElement: React.FC<{ item: any, mode: AppMode, isFocused: boolean, onUpdate: (u: any) => void, onRemove: () => void }> = ({ item, mode, isFocused, onUpdate, onRemove }) => {
  const [isResizing, setIsResizing] = useState(false);

  const style: React.CSSProperties = {
    left: `${item.x}%`, 
    top: `${item.y}%`, 
    width: `${item.width}%`, 
    height: `${item.height}%`, 
    position: 'absolute', 
    zIndex: 10,
    pointerEvents: 'auto',
    transform: 'translateZ(2px)' // 确保在背景之上
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent | React.WheelEvent) => {
    e.stopPropagation();
  };

  const handleDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode !== AppMode.EDIT || isResizing) return;
    const parent = (e.currentTarget as HTMLElement).closest('.relative.flex-1');
    if (!parent) return;
    
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY, initialX = item.x, initialY = item.y;
    
    const onMouseMove = (me: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      const dx = ((me.clientX - startX) / rect.width) * 100;
      const dy = ((me.clientY - startY) / rect.height) * 100;
      onUpdate({ 
        x: Math.max(0, Math.min(100 - item.width, initialX + dx)), 
        y: Math.max(0, Math.min(100 - item.height, initialY + dy)) 
      });
    };
    
    const onMouseUp = () => { 
      window.removeEventListener('mousemove', onMouseMove); 
      window.removeEventListener('mouseup', onMouseUp); 
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResize = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (mode !== AppMode.EDIT) return;
    const parent = (e.currentTarget as HTMLElement).closest('.relative.flex-1');
    if (!parent) return;
    
    setIsResizing(true);
    const startX = e.clientX, startY = e.clientY, iw = item.width, ih = item.height;
    
    const onMouseMove = (me: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      onUpdate({ 
        width: Math.max(5, Math.min(100 - item.x, iw + ((me.clientX - startX) / rect.width) * 100)), 
        height: Math.max(5, Math.min(100 - item.y, ih + ((me.clientY - startY) / rect.height) * 100)) 
      });
    };
    
    const onMouseUp = () => { 
      setIsResizing(false); 
      window.removeEventListener('mousemove', onMouseMove); 
      window.removeEventListener('mouseup', onMouseUp); 
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div 
      style={style} 
      onMouseDown={stopProp}
      className={`group ${mode === AppMode.EDIT ? 'ring-2 ring-white/5 hover:ring-indigo-500/50 rounded-2xl transition-all shadow-xl bg-white/[0.02]' : ''}`}
    >
      {/* 拖拽控制 */}
      {mode === AppMode.EDIT && (
        <div 
          onMouseDown={handleDrag}
          className="absolute -top-4 -left-4 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-2xl z-[150] opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100"
        >
          <Move size={18} />
        </div>
      )}

      {/* 删除按钮 */}
      {mode === AppMode.EDIT && (
        <button 
          onMouseDown={stopProp}
          onClick={(e) => { e.stopPropagation(); onRemove(); }} 
          className="absolute -top-4 -right-4 w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl scale-75 hover:scale-100 z-[150] cursor-pointer"
        >
          <X size={18} strokeWidth={3}/>
        </button>
      )}

      {item.type === 'text' && (
        <textarea 
          disabled={mode === AppMode.PRESENT} 
          onMouseDown={stopProp}
          onWheel={stopProp}
          className={`w-full h-full bg-transparent text-slate-100 p-6 resize-none border-none focus:ring-0 leading-relaxed font-medium transition-all custom-scrollbar ${isFocused ? 'text-2xl' : 'text-sm'}`} 
          value={item.content} 
          onChange={(e) => onUpdate({ content: e.target.value })} 
          placeholder="在此输入文本..." 
        />
      )}

      {item.type === 'image' && (
        <img src={item.content} className="w-full h-full object-cover rounded-2xl border border-white/10" draggable={false} alt="media" />
      )}

      {item.type === 'video' && (
        <video src={item.content} className="w-full h-full object-cover rounded-2xl border border-white/10" controls={isFocused} autoPlay={isFocused && mode === AppMode.PRESENT} muted={mode !== AppMode.PRESENT} loop />
      )}

      {item.type === 'link' && (
        <a 
          href={item.content} 
          target="_blank" 
          rel="noopener noreferrer" 
          onMouseDown={stopProp}
          className={`flex items-center justify-center gap-3 w-full h-full bg-indigo-600/10 backdrop-blur-xl rounded-2xl text-indigo-400 font-bold border border-indigo-600/30 transition-all hover:bg-indigo-600/20 ${isFocused ? 'text-xl' : 'text-xs'}`} 
        >
          <Link size={isFocused ? 28 : 16}/> {isFocused ? '访问外部链接' : '链接'}
        </a>
      )}

      {/* 缩放手柄 */}
      {mode === AppMode.EDIT && (
        <div 
          onMouseDown={handleResize} 
          className="absolute -bottom-3 -right-3 w-8 h-8 cursor-se-resize opacity-0 group-hover:opacity-100 flex items-center justify-center bg-indigo-600 rounded-xl scale-75 hover:scale-100 transition-all shadow-2xl z-[150]"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-white rounded-br-sm" />
        </div>
      )}
    </div>
  );
};

export default Card3D;
