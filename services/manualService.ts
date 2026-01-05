
import { Chapter } from '../types';
import { MANUAL_CHAPTERS as FOUNDATIONAL_CHAPTERS } from '../content/manual';

const DYNAMIC_KEY = 'sovereign_dynamic_chapters';

export const getFullManual = (): Chapter[] => {
  const dynamicRaw = localStorage.getItem(DYNAMIC_KEY);
  const dynamicChapters: Chapter[] = dynamicRaw ? JSON.parse(dynamicRaw) : [];
  
  // Combine foundational and dynamic chapters, ensuring IDs are sequential
  return [...FOUNDATIONAL_CHAPTERS, ...dynamicChapters];
};

export const commitChapter = (title: string, subtitle: string, content: string[]) => {
  const current = getFullManual();
  const newId = current.length + 1;
  
  const newChapter: Chapter = {
    id: newId,
    title,
    subtitle,
    content
  };

  const dynamicRaw = localStorage.getItem(DYNAMIC_KEY);
  const dynamicChapters: Chapter[] = dynamicRaw ? JSON.parse(dynamicRaw) : [];
  dynamicChapters.push(newChapter);
  
  localStorage.setItem(DYNAMIC_KEY, JSON.stringify(dynamicChapters));
  return newChapter;
};

export const clearDynamicChapters = () => {
  localStorage.removeItem(DYNAMIC_KEY);
};
