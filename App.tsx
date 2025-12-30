
import React, { useState, useEffect, useRef } from 'react';
import { CardData, AppMode } from './types';
import Card3D from './components/Card3D';
import SpaceBackground from './components/SpaceBackground';
import { Plus, Presentation, Edit3, Trash2, Rocket, X, Sparkles, ChevronRight, RotateCcw, Download, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';

const STORAGE_KEY = 'vortex_3d_project_data';
const PROJECT_JSON_PATH = './vortex_data.json'; 

const INITIAL_CARDS: CardData[] = [
  {
    id: '1',
    title: '3D 交互空间',
    backDescription: '拖动背景来旋转卡牌组。快速拖拽可产生惯性，感受极致的 3D 物理动效。',
    frontItems: [{ id: 'i1', type: 'text', x: 20, y: 35, width: 60, height: 30, content: '体验沉浸式的智能演说。' }]
  },
  { id: '2', title: '惯性物理引擎', backDescription: '模拟真实的物理阻尼，滑动体验极其丝滑，支持多维视角切换。', frontItems: [] },
  { id: '3', title: '聚焦视界', backDescription: '点击卡片，它会从星系中飞向你，呈现高清巨幕演示效果。', frontItems: [] },
  { id: '4', title: '智能创作', backDescription: '利用 Gemini AI 灵感激发功能，润色你的每一张幻灯片。', frontItems: [] },
];

const App: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_CARDS;
  });

  const [mode, setMode] = useState<AppMode>(AppMode.EDIT);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(-10);
  const [zoom, setZoom] = useState(1);
  const [showOutline, setShowOutline] = useState(false);
  const [currentVelocity, setCurrentVelocity] = useState({ x: 0, y: 0 });

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const startDragPos = useRef({ x: 0, y: 0 }); 
  const velocity = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number>(null);
  const radius = 850;

  const syncWithProjectFile = async (silent = false) => {
    setIsSyncing(true);
    try {
      const response = await fetch(PROJECT_JSON_PATH);
      if (response.ok) {
        const projectData = await response.json();
        setCards(projectData);
        if (!silent) alert('项目已从配置文件同步成功！');
      } else if (!silent) {
        console.warn('未找到 vortex_data.json 配置文件');
      }
    } catch (error) {
      if (!silent) console.error('同步失败:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) syncWithProjectFile(true);
  }, []);

  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      setSaveStatus('saved');
    }, 1000);
    return () => clearTimeout(timer);
  }, [cards]);

  useEffect(() => {
    const update = () => {
      if (!isDragging.current && !selectedCardId && !showOutline) {
        velocity.current.x *= 0.97;
        velocity.current.y *= 0.97;
        if (Math.abs(velocity.current.x) > 0.01 || Math.abs(velocity.current.y) > 0.01) {
          setRotationY(prev => prev + velocity.current.x);
          setRotationX(prev => prev - velocity.current.y);
        }
      }
      setCurrentVelocity({ ...velocity.current });
      requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [selectedCardId, showOutline]);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.card-interactive')) return;
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    startDragPos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    const dragDistanceY = e.clientY - startDragPos.current.y;
    const dragDistanceX = Math.abs(e.clientX - startDragPos.current.x);
    
    if (!selectedCardId && !showOutline) {
      velocity.current = { x: deltaX * 0.3, y: deltaY * 0.3 };
      setRotationY(prev => prev + velocity.current.x);
      setRotationX(prev => prev - velocity.current.y);
      if (dragDistanceY > 180 && dragDistanceY > dragDistanceX) {
        setShowOutline(true);
        isDragging.current = false;
        velocity.current = { x: 0, y: 0 };
      }
    } else if (dragDistanceY < -180 && Math.abs(dragDistanceY) > dragDistanceX) {
      setSelectedCardId(null);
      setShowOutline(false);
      isDragging.current = false;
      velocity.current = { x: 0, y: 0 };
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleReset = () => {
    if (window.confirm('确定要重置吗？所有本地修改将丢失，恢复至初始状态。')) {
      setCards(INITIAL_CARDS);
      localStorage.removeItem(STORAGE_KEY);
      setSelectedCardId(null);
      setShowOutline(false);
    }
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const componentsFolder = zip.folder("components");
      const processedCards = await Promise.all(cards.map(async (card) => {
        const updatedItems = await Promise.all(card.frontItems.map(async (item) => {
          if ((item.type === 'image' || item.type === 'video') && item.content.startsWith('data:')) {
            const parts = item.content.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'binary/data';
            const ext = mime.split('/')[1] || 'file';
            const fileName = `res_${item.id}.${ext}`;
            componentsFolder?.file(fileName, parts[1], { base64: true });
            return { ...item, content: `./components/${fileName}` };
          }
          return item;
        }));
        return { ...card, frontItems: updatedItems };
      }));
      zip.file("vortex_data.json", JSON.stringify(processedCards, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Vortex_演说项目_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出失败，请检查浏览器权限');
    } finally {
      setIsExporting(false);
    }
  };

  const updateCard = (updatedCard: CardData) => setCards(cards.map(c => (c.id === updatedCard.id ? updatedCard : c)));
  const updateCardTitleFromOutline = (id: string, newTitle: string) => setCards(cards.map(c => c.id === id ? { ...c, title: newTitle } : c));
  const addCard = () => setCards([...cards, { id: Math.random().toString(36).substr(2, 9), title: '新幻灯片', backDescription: '点击这里添加该页面的核心内容描述...', frontItems: [] }]);
  
  const removeCard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (cards.length <= 1) {
      alert("请至少保留一张幻灯片卡牌");
      return;
    }
    if (window.confirm('确定要删除这张幻灯片吗？')) {
      setCards(prev => prev.filter(c => c.id !== id));
      if (selectedCardId === id) setSelectedCardId(null);
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden text-slate-100 flex flex-col select-none bg-[#020617]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={() => { isDragging.current = false; }}
      onWheel={(e) => {
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        setZoom(prev => Math.max(0.4, Math.min(2.5, prev * delta)));
      }}
    >
      <SpaceBackground velocity={currentVelocity} />

      <header className={`relative z-[1000] flex justify-between items-center p-8 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 transition-transform duration-700 ${selectedCardId ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <Rocket className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-slate-400 uppercase">Vortex 3D 智能演说</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 animate-pulse'}`}></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{saveStatus === 'saved' ? '本地已同步' : '正在自动保存...'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          {mode === AppMode.EDIT && (
            <>
              <button onClick={() => syncWithProjectFile()} disabled={isSyncing} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-800/40 hover:bg-slate-700/60 border border-white/10 text-slate-300 transition-all font-black text-xs uppercase tracking-widest"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> 同步文件</button>
              <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-all font-black text-xs uppercase tracking-widest"><RotateCcw size={14} /> 重置</button>
              <button onClick={handleExportZip} disabled={isExporting} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 transition-all font-black text-xs uppercase tracking-widest">{isExporting ? <Sparkles size={14} className="animate-spin" /> : <Download size={14} />} 打包导出</button>
            </>
          )}
          <div className="w-px h-8 bg-white/10 mx-2 self-center"></div>
          <button onClick={() => setMode(mode === AppMode.EDIT ? AppMode.PRESENT : AppMode.EDIT)} className={`flex items-center gap-3 px-8 py-3 rounded-full transition-all border font-black text-xs uppercase tracking-[0.2em] shadow-2xl ${mode === AppMode.PRESENT ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/40'}`}>{mode === AppMode.EDIT ? <Presentation size={18} /> : <Edit3 size={18} />} {mode === AppMode.EDIT ? '开启演说' : '返回编辑'}</button>
        </div>
      </header>

      <main className="flex-1 relative perspective-2000 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center preserve-3d transition-all duration-300 ease-out" style={{ transform: `scale(${zoom}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)` }}>
          {showOutline && !selectedCardId && (
            <div className="absolute z-[2500]" style={{ transform: `rotateY(${-rotationY}deg) rotateX(${-rotationX}deg) translateZ(300px)`, width: 'min(720px, 90vw)', height: 'min(800px, 85vh)' }}>
              <div className="relative w-full h-full bg-slate-950/95 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-16 flex flex-col shadow-2xl animate-in zoom-in-95 duration-700">
                <button onClick={() => setShowOutline(false)} className="absolute top-12 right-12 p-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-3xl border border-white/10 transition-all"><X size={28} /></button>
                <div className="flex flex-col items-center mb-16"><h2 className="text-4xl font-black text-white tracking-[0.8em] uppercase">大纲导航</h2><div className="h-1.5 w-24 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full mt-8"></div></div>
                <div className="flex-1 overflow-y-auto space-y-5 pr-4 custom-scrollbar">
                  {cards.map((c, idx) => (
                    <div key={c.id} className="group relative p-2 bg-white/[0.03] hover:bg-white/[0.08] rounded-3xl border border-white/5 flex items-center gap-0 overflow-hidden transition-all">
                      <div className="w-20 flex items-center justify-center text-slate-700 font-black text-3xl group-hover:text-indigo-500 transition-colors">{idx + 1}</div>
                      <div className="flex-1 py-6"><input className="w-full bg-transparent border-none text-xl font-black text-slate-300 group-hover:text-white focus:outline-none transition-colors" value={c.title} onChange={(e) => updateCardTitleFromOutline(c.id, e.target.value)} /></div>
                      <button onClick={() => { setSelectedCardId(c.id); setShowOutline(false); }} className="h-full px-10 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-r-2xl transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100"><ChevronRight size={20} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {cards.map((card, index) => {
            const angle = (index / cards.length) * 360;
            const isSelected = selectedCardId === card.id;
            let transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
            let opacity = 1;
            let zIndex = 1;

            if (selectedCardId) {
              if (isSelected) {
                transform = `rotateY(${-rotationY}deg) rotateX(${-rotationX}deg) translateZ(900px)`;
                zIndex = 1000;
              } else {
                transform = `rotateY(${angle}deg) translateZ(${radius - 700}px)`;
                opacity = 0.05;
                zIndex = 0;
              }
            } else if (showOutline) {
              opacity = 0.1;
              transform = `rotateY(${angle}deg) translateZ(${radius + 300}px)`;
            }

            return (
              <div key={card.id} className="group absolute transition-all duration-[1200ms] cubic-bezier(0.23, 1, 0.32, 1) card-interactive" style={{ transform, opacity, zIndex, width: isSelected ? 'min(1280px, 95vw)' : '350px', height: isSelected ? 'min(860px, 92vh)' : '520px', pointerEvents: isSelected ? 'auto' : (selectedCardId || showOutline ? 'none' : 'auto') }}>
                <Card3D card={card} mode={mode} isFocused={isSelected} onClick={() => setSelectedCardId(card.id)} onClose={() => setSelectedCardId(null)} onUpdate={updateCard} onDelete={() => removeCard(card.id)} />
                {mode === AppMode.EDIT && !selectedCardId && !showOutline && (
                  <button onClick={(e) => removeCard(card.id, e)} className="absolute -top-5 -right-5 p-4 bg-rose-500/20 hover:bg-rose-500 border border-rose-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-[1100] text-white shadow-2xl scale-90 hover:scale-110 active:scale-95"><Trash2 size={18} /></button>
                )}
              </div>
            );
          })}

          {mode === AppMode.EDIT && !selectedCardId && !showOutline && (
            <div className="absolute pointer-events-auto" style={{ transform: 'translateY(150px) translateZ(-100px)' }}>
              <button onClick={addCard} className="flex flex-col items-center gap-5 group">
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xl group-hover:border-indigo-500 group-hover:bg-indigo-500/10 transition-all shadow-2xl group-active:scale-90">
                  <Plus size={40} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-[12px] font-black text-slate-600 group-hover:text-indigo-400 tracking-[0.4em] uppercase transition-colors">新增幻灯片</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className={`relative z-[1000] p-12 text-center transition-all duration-1000 ${selectedCardId || showOutline ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="inline-flex items-center gap-8 px-14 py-6 bg-slate-900/40 backdrop-blur-3xl rounded-full border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
           <span className="text-slate-500 text-[11px] font-black tracking-[0.4em] uppercase flex items-center gap-4"><Sparkles size={16} className="text-indigo-500" /> 拖拽背景旋转轨道 · 滚轮缩放视图 · 向下滑动开启大纲导航</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
