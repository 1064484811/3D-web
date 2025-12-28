
import React, { useState, useEffect, useRef } from 'react';
import { CardData, AppMode, CardItem, ItemType } from '../types';
import { X, Image, Video, Type, Link, Sparkles, Move, Plus, Trash2 } from 'lucide-react';
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
          if (h > 80) { h = 80; w = h / ratio; }
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
      type, x: 15, y: 15, width, height, content
    };
    onUpdate({ ...card, frontItems: [...card.frontItems, newItem] });
  };

  const handleAction = (e: React.MouseEvent, type: ItemType) => {
    e.preventDefault(); e.stopPropagation();
    if (type === 'text') createNewItem('text', '在此编辑文字...', 80, 15);
    else if (type === 'image' || type === 'video') triggerUpload(type);
    else if (type === 'link') handleLinkAdd();
  };

  const updateItem = (itemId: string, updates: Partial<CardItem>) => {
    onUpdate({ ...card, frontItems: card.frontItems.map(item => item.id === itemId ? { ...item, ...updates } : item) });
  };

  const removeItem = (itemId: string) => {
    onUpdate({ ...card, frontItems: card.frontItems.filter(item => item.id !== itemId) });
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

  const stopProp = (e: React.MouseEvent | React.FocusEvent | React.WheelEvent) => e.stopPropagation();

  return (
    <div 
      className={`relative w-full h-full preserve-3d transition-all duration-500 ease-out ${isFocused ? '' : 'hover:scale-105 cursor-pointer'}`}
      onClick={(e) => { if (!isFocused) { e.stopPropagation(); onClick(); }