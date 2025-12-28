
import React, { useState, useEffect, useRef } from 'react';
import { CardData, AppMode } from './types';
import Card3D from './components/Card3D';
import SpaceBackground from './components/SpaceBackground';
import { Plus, Presentation, Edit3, Trash2, Rocket, X, Sparkles, ChevronRight, Save, RotateCcw, Download, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';

const STORAGE_KEY = 'vortex_3d_project_data';
const PROJECT_JSON_PATH = './vortex_data.json'; // 代码库中的数据文件

const INITIAL_CARDS: CardData[] = [
  {
    id: '1',
    title: '3D 交互星系',
    backDescription: '拖动背景来旋转卡牌组。快速拖拽可产生惯性。',
    frontItems: [{ id: 'i1', type: 'text', x: 10, y: 10, width: 80, height: 20, content: '体验极致的 3D 物理动效。' }]
  },
  { id: '2', title: '惯性物理引擎', backDescription: '模拟真实的物理阻尼，滑动体验极其丝滑。', frontItems: [] },
  { id: '3', title: '聚焦视界', backDescription: '点击卡片，它会从星系中飞向你，呈现巨幕效果。', frontItems: [] },
  { id: '4', title: '智能创作', backDescription: '利用 AI 润色你的每一张幻灯片。', frontItems: [] },
];

const App: React.FC = () => {
  // 初始状态：优先尝试 LocalStorage，否则使用基础初始值
  const [cards, setCards] = useState<CardData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_CARDS;
  });

  const [mode, setMode] = useState<AppMode>(AppMode.EDIT);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  // 状态指示
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 物理旋转状态
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
  const radius = 750;

  // 1. 自动从代码库加载 JSON 的功能 (初始化及手动触发)
  const syncWithProjectFile = async (silent = false) => {
    setIsSyncing(true);
    try {
      const response = await fetch(PROJECT_JSON_PATH);
      if (response.ok) {
        const projectData = await response.json();
        setCards(projectData);
        if (!silent) alert('项目已从代码库同步成功！');
      } else {
        if (!silent) console.warn('未在代码库根目录找到 vortex_data.json，将使用本地缓存。');
      }
    } catch (error) {
      if (!silent) console.error('同步项目文件失败:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 页面加载时：如果本地存储为空，则尝试自动同步代码库文件
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      syncWithProjectFile(true);
    }
  }, []);

  // 2. 自动保存到 LocalStorage
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      setSaveStatus('saved');
    }, 1000);
    return () => clearTimeout(timer);
  }, [cards]);

  // 物理动画循环
  useEffect(() => {
    const update = () => {
      if (!isDragging.current && !selectedCardId && !showOutline) {
        velocity.current.x *= 0.96;
        velocity.current.y *= 0.96;
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
      velocity.current = { x: deltaX * 0.25, y: deltaY * 0.25 };
      setRotationY(prev => prev + velocity.current.x);
      setRotationX(prev => prev - velocity.current.y);
      if (dragDistanceY > 150 && dragDistanceY > dragDistanceX) {
        setShowOutline(true);
        isDragging.current = false;
        velocity.current = { x: 0, y: 0 };
      }
    } else if (dragDistanceY < -150 && Math.abs(dragDistanceY) > dragDistanceX) {
      setSelectedCardId(null);
      setShowOutline(false);
      isDragging.current = false;
      velocity.current = { x: 0, y: 0 };
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseUp = () => { isDragging.current = false; };
  const onWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom(prev => Math.max(0.3, Math.min(3.0, prev * delta)));
  };

  const handleReset = () => {
    if (window.confirm('警告：确定要重置吗？所有当前未保存的本地修改将永久丢失，恢复至初始状态。')) {
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
            const fileName = `media_${item.id}.${ext}`;
            const base64Data = parts[1];
            componentsFolder?.file(fileName, base64Data, { base64: true });
            return { ...item, content: `./components/${fileName}` };
          }
          return item;
        }));
        return { ...card, frontItems: updatedItems };
      }));

      zip.file("vortex_data.json", JSON.stringify(processedCards, null, 2));
      zip.file("README.txt", "Vortex 3D Presentation Pro Export\n将此包解压到代码库根目录，系统将自动读取 components/ 路径下的资源。");

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Vortex_Project_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请检查浏览器限制。');
    } finally {
      setIsExporting(false);
    }
  };

  const updateCard = (updatedCard: CardData) => setCards(cards.map(c => (c.id === updatedCard.id ? updatedCard : c)));
  const updateCardTitleFromOutline = (id: string, newTitle: string) => setCards(cards.map(c => c.id === id ? { ...c, title: newTitle } : c));
  const addCard = () => setCards([...cards, { id: Math.random().toString(36).substr(2, 9), title: '新幻灯片', backDescription: '点击编辑内容...', frontItems: [] }]);
  const removeCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cards.length <= 1) return;
    setCards(cards.filter(c => c.id !== id));
    if (selectedCardId === id) setSelectedCardId(null);
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden text-slate-100 flex flex-col select-none bg-[#020617]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      <SpaceBackground velocity={currentVelocity} />

      {/* 顶部导航 */}
      <header className={`relative z-[1000] flex justify-between items-center p-6 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 transition-transform duration-500 ${selectedCardId ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Rocket className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Vortex 3D Pro
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-pulse'}`}></div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                {saveStatus === 'saved' ? 'Synced to Local' : 'Syncing changes...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {mode === AppMode.EDIT && (
            <>
              <button
                onClick={() => syncWithProjectFile()}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 transition-all font-bold text-xs"
                title="从代码库加载 vortex_data.json"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> 同步文件
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-all font-bold text-xs"
                title="清空本地缓存并重置"
              >
                <RotateCcw size={14} /> 重置
              </button>
              <button
                onClick={handleExportZip}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 transition-all font-bold text-xs"
                title="导出为 ZIP 项目包"
              >
                {isExporting ? <Sparkles size={14} className="animate-spin" /> : <Download size={14} />}
                打包导出
              </button>
            </>
          )}
          <div className="w-px h-6 bg-white/10 mx-2 self-center"></div>
          <button
            onClick={() => setMode(mode === AppMode.EDIT ? AppMode.PRESENT : AppMode.EDIT)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all border font-bold text-sm shadow-xl ${
              mode === AppMode.PRESENT ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
            }`}
          >
            {mode === AppMode.EDIT ? <Presentation size={18} /> : <Edit3 size={18} />}
            {mode === AppMode.EDIT ? '开启演说' : '返回编辑'}
          </button>
        </div>
      </header>

      {/* 3D 舞台区域 */}
      <main className="flex-1 relative perspective-2000 flex items-center justify-center">
        <div 
          className="relative w-full h-full flex items-center justify-center preserve-3d transition-all duration-300 ease-out"
          style={{ transform: `scale(${zoom}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)` }}
        >
          {showOutline && !selectedCardId && (
            <div className="absolute z-[2500]" style={{ transform: `rotateY(${-rotationY}deg) rotateX(${-rotationX}deg) translateZ(200px)`, width: 'min(680px, 90vw)', height: 'min(760px, 85vh)' }}>
              <div className="relative w-full h-full bg-slate-950/95 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 flex flex-col shadow-2xl animate-in slide-in-from-top-32 duration-700">
                <button onClick={() => setShowOutline(false)} className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl border border-white/10"><X size={24} /></button>
                <div className="flex flex-col items-center mb-16"><h2 className="text-3xl font-black text-white tracking-[0.6em] uppercase">OUTLINE</h2><div className="h-1 w-12 bg-indigo-500/60 rounded-full mt-6"></div></div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {cards.map((c, idx) => (
                    <div key={c.id} className="group relative p-1 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl border border-white/5 flex items-center gap-0 overflow-hidden">
                      <div className="w-16 flex items-center justify-center text-slate-700 font-black text-xl group-hover:text-indigo-500">{idx + 1}</div>
                      <div className="flex-1 py-5"><input className="w-full bg-transparent border-none text-lg font-bold text-slate-300 group-hover:text-white focus:outline-none" value={c.title} onChange={(e) => updateCardTitleFromOutline(c.id, e.target.value)} /></div>
                      <button onClick={() => { setSelectedCardId(c.id); setShowOutline(false); }} className="h-full px-8 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-r-xl transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100"><ChevronRight size={16} /></button>
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
                transform = `rotateY(${-rotationY}deg) rotateX(${-rotationX}deg) translateZ(800px)`;
                zIndex = 1000;
              } else {
                transform = `rotateY(${angle}deg) translateZ(${radius - 600}px)`;
                opacity = 0.05;
                zIndex = 0;
              }
            } else if (showOutline) {
              opacity = 0.1;
              transform = `rotateY(${angle}deg) translateZ(${radius + 200}px)`;
            }

            return (
              <div key={card.id} className="absolute transition-all duration-[1000ms] cubic-bezier(0.23, 1, 0.32, 1) card-interactive" style={{ transform, opacity, zIndex, width: isSelected ? 'min(1240px, 94vw)' : '320px', height: isSelected ? 'min(840px, 90vh)' : '480px', pointerEvents: isSelected ? 'auto' : (selectedCardId || showOutline ? 'none' : 'auto') }}>
                <Card3D card={card} mode={mode} isFocused={isSelected} onClick={() => setSelectedCardId(card.id)} onClose={() => setSelectedCardId(null)} onUpdate={updateCard} />
                {mode === AppMode.EDIT && !selectedCardId && !showOutline && (
                  <button onClick={(e) => removeCard(card.id, e)} className="absolute -top-3 -right-3 p-2 bg-rose-500/20 hover:bg-rose-500 border border-rose-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-[1100] text-white shadow-lg"><Trash2 size={14} /></button>
                )}
              </div>
            );
          })}

          {mode === AppMode.EDIT && !selectedCardId && !showOutline && (
            <div className="absolute pointer-events-auto" style={{ transform: 'translateY(120px) translateZ(-50px)' }}>
              <button onClick={addCard} className="flex flex-col items-center gap-4 group">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-900/40 backdrop-blur-md group-hover:border-indigo-500 group-hover:bg-indigo-500/10 transition-all shadow-xl shadow-indigo-500/10">
                  <Plus size={32} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-[11px] font-black text-slate-500 group-hover:text-indigo-400 transition-colors uppercase tracking-[0.3em]">ADD SLIDE</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className={`relative z-[1000] p-10 text-center transition-all duration-700 ${selectedCardId || showOutline ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="inline-flex items-center gap-6 px-12 py-5 bg-slate-900/30 backdrop-blur-3xl rounded-full border border-white/5 shadow-2xl">
           <span className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase flex items-center gap-3">
             <Sparkles size={14} className="text-indigo-500" />
             左右旋转 · 滚轮缩放 · 向下拖拽大纲
           </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
