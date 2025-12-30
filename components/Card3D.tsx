
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<ItemType | null>(null);

  // 聚焦时延迟翻转，增加动画质感
  useEffect(() => {
    if (isFocused) {
      const timer = setTimeout(() => setIsFlipped(true), 200);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
      setActiveItemId(null);
    }
  }, [isFocused]);

  const handleBackChange = (field: 'title' | 'backDescription', value: string) => {
    onUpdate({ ...card, [field]: value });
  };

  const createNewItem = (type: ItemType, content: string, width = 40, height = 20) => {
    const newItem: CardItem = {
      id: Math.random().toString(36).substr(2, 9),
      type, x: 25, y: 25, width, height, content
    };
    onUpdate({ ...card, frontItems: [...card.frontItems, newItem] });
    setActiveItemId(newItem.id);
  };

  const onToolClick = (e: React.MouseEvent, type: ItemType) => {
    e.stopPropagation();
    if (type === 'text') {
      createNewItem('text', '在这里输入新的文字内容');
    } else if (type === 'image' || type === 'video') {
      setPendingType(type);
      if (fileInputRef.current) {
        fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
        fileInputRef.current.click();
      }
    } else if (type === 'link') {
      const url = window.prompt("请输入完整的链接 URL:", "https://");
      if (url) createNewItem('link', url, 50, 12);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingType) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (pendingType === 'image') {
        createNewItem('image', content, 40, 30);
      } else if (pendingType === 'video') {
        createNewItem('video', content, 60, 40);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
      handleBackChange('backDescription', suggestion.summary + '\n\n' + suggestion.points.map((p: string) => `• ${p}`).join('\n'));
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

      {/* 卡片背面 (初始状态：封面) */}
      <div className="absolute inset-0 backface-hidden bg-slate-900/90 backdrop-blur-2xl border-2 border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-2xl overflow-hidden group">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full group-hover:bg-indigo-600/20 transition-all duration-1000"></div>
        
        <div className="flex-1 flex flex-col justify-center items-center gap-6 text-center relative z-10">
          {mode === AppMode.EDIT && isFocused ? (
            <input 
              className="text-3xl font-black bg-transparent border-b-2 border-white/10 focus:border-indigo-500 outline-none w-full text-center py-2 transition-all"
              value={card.title}
              onChange={(e) => handleBackChange('title', e.target.value)}
              placeholder="输入幻灯片标题..."
              onClick={stopProp}
            />
          ) : (
            <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-2xl">{card.title || '无标题幻灯片'}</h3>
          )}
          
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full"></div>
          
          {mode === AppMode.EDIT && isFocused ? (
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-slate-300 outline-none focus:border-indigo-500 min-h-[180px] text-sm leading-relaxed custom-scrollbar resize-none transition-all"
              value={card.backDescription}
              onChange={(e) => handleBackChange('backDescription', e.target.value)}
              placeholder="简要描述此幻灯片的核心要点..."
              onClick={stopProp}
            />
          ) : (
            <p className="text-slate-400 text-sm leading-relaxed line-clamp-4 max-w-[85%]">{card.backDescription || '点击进入编辑模式，添加精彩的内容描述。'}</p>
          )}

          {mode === AppMode.EDIT && isFocused && (
            <button 
              onClick={handleMagicSuggest}
              disabled={isSuggesting}
              className="mt-6 flex items-center gap-2 px-8 py-3 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 rounded-full text-xs font-black transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={14} className={isSuggesting ? 'animate-pulse' : ''} />
              {isSuggesting ? 'AI 正在生成内容...' : '利用 Gemini AI 自动构思内容'}
            </button>
          )}
        </div>

        {!isFocused && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
             <span className="bg-indigo-600/20 px-6 py-2 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/30 backdrop-blur-md">点击展开内容详情</span>
          </div>
        )}
      </div>

      {/* 卡片正面 (展开状态：内容画布) */}
      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-950 border-2 border-indigo-500/30 rounded-[2.5rem] flex flex-col shadow-[0_0_100px_rgba(79,70,229,0.15)] overflow-hidden">
        {/* 工具栏 */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] truncate max-w-[150px]">{card.title}</h4>
            {mode === AppMode.EDIT && (
              <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                {[
                  { icon: Type, type: 'text', label: '文字' },
                  { icon: Image, type: 'image', label: '图片' },
                  { icon: Video, type: 'video', label: '视频' },
                  { icon: Link, type: 'link', label: '链接' }
                ].map(tool => (
                  <button 
                    key={tool.type}
                    onClick={(e) => onToolClick(e, tool.type as ItemType)}
                    className="p-2.5 hover:bg-indigo-500 text-slate-400 hover:text-white rounded-lg transition-all"
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
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2.5 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all" title="删除当前幻灯片">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onClose?.(); }} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* 画布 */}
        <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#1e293b_1px,transparent_0)] bg-[size:32px_32px]" onClick={() => setActiveItemId(null)}>
          {card.frontItems.map((item) => {
            const isActive = activeItemId === item.id && mode === AppMode.EDIT;
            return (
              <div 
                key={item.id}
                className={`absolute transition-all group/item ${isActive ? 'z-50' : 'z-10'}`}
                style={{ 
                  left: `${item.x}%`, 
                  top: `${item.y}%`, 
                  width: `${item.width}%`, 
                  height: `${item.height}%` 
                }}
                onClick={(e) => { e.stopPropagation(); if(mode === AppMode.EDIT) setActiveItemId(item.id); }}
              >
                {mode === AppMode.EDIT && isActive && (
                  <div className="absolute -top-10 left-0 flex gap-1 animate-in fade-in slide-in-from-bottom-2">
                    <button className="p-2 bg-indigo-600 text-white rounded-lg cursor-move shadow-xl"><Move size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-2 bg-rose-600 text-white rounded-lg shadow-xl"><Trash2 size={14} /></button>
                  </div>
                )}

                <div className={`w-full h-full rounded-2xl overflow-hidden transition-all duration-300 ${isActive ? 'ring-4 ring-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)]' : 'hover:ring-2 hover:ring-white/10'}`}>
                  {item.type === 'text' && (
                    <div className="w-full h-full flex items-center justify-center p-6 bg-white/[0.02]">
                      {mode === AppMode.EDIT ? (
                        <textarea 
                          className="w-full h-full bg-transparent border-none outline-none text-white font-bold resize-none text-center flex items-center justify-center custom-scrollbar text-xl"
                          value={item.content}
                          onChange={(e) => updateItem(item.id, { content: e.target.value })}
                          onClick={stopProp}
                          onFocus={stopProp}
                        />
                      ) : (
                        <p className="text-white font-bold text-center text-xl whitespace-pre-wrap">{item.content}</p>
                      )}
                    </div>
                  )}
                  {item.type === 'image' && (
                    <img src={item.content} className="w-full h-full object-cover" draggable={false} alt="幻灯片图片内容" />
                  )}
                  {item.type === 'video' && (
                    <video src={item.content} controls={isFocused} className="w-full h-full object-cover" />
                  )}
                  {item.type === 'link' && (
                    <a href={item.content} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center gap-3 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 font-black transition-all px-6 rounded-2xl text-sm">
                      <Link size={16} />
                      <span className="truncate">{item.content}</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {card.frontItems.length === 0 && (
             <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 opacity-20 pointer-events-none">
                <Maximize2 size={64} strokeWidth={1} className="mb-6" />
                <p className="text-sm uppercase tracking-[0.5em] font-black">画布为空 · 点击顶部工具栏开始创作</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Card3D;
