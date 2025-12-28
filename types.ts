
export type ItemType = 'text' | 'image' | 'video' | 'link';

export interface CardItem {
  id: string;
  type: ItemType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage
  height: number; // percentage
  content: string; // text, url, or video embed
}

export interface CardData {
  id: string;
  title: string;
  backDescription: string;
  frontItems: CardItem[];
}

export enum AppMode {
  EDIT = 'edit',
  PRESENT = 'present'
}
