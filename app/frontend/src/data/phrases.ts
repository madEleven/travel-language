import type { Language, Category, Phrase } from './phrase-types';
import { enPhrases } from './phrases-en';
import { koPhrases } from './phrases-ko';
import { jaPhrases } from './phrases-ja';
import { ruPhrases } from './phrases-ru';
import { itPhrases } from './phrases-it';
import { esPhrases } from './phrases-es';
import { frPhrases } from './phrases-fr';
import { thPhrases } from './phrases-th';
import { trPhrases } from './phrases-tr';
import { viPhrases } from './phrases-vi';
import { kkPhrases } from './phrases-kk';

export type { Phrase, Language, Category } from './phrase-types';

export const languages: Language[] = [
  { code: 'en', name: '英语', nameEn: 'English', flag: '🇬🇧', speechLang: 'en-US' },
  { code: 'ko', name: '韩语', nameEn: 'Korean', flag: '🇰🇷', speechLang: 'ko-KR' },
  { code: 'ja', name: '日语', nameEn: 'Japanese', flag: '🇯🇵', speechLang: 'ja-JP' },
  { code: 'ru', name: '俄语', nameEn: 'Russian', flag: '🇷🇺', speechLang: 'ru-RU' },
  { code: 'it', name: '意大利语', nameEn: 'Italian', flag: '🇮🇹', speechLang: 'it-IT' },
  { code: 'es', name: '西班牙语', nameEn: 'Spanish', flag: '🇪🇸', speechLang: 'es-ES' },
  { code: 'fr', name: '法语', nameEn: 'French', flag: '🇫🇷', speechLang: 'fr-FR' },
  { code: 'th', name: '泰语', nameEn: 'Thai', flag: '🇹🇭', speechLang: 'th-TH' },
  { code: 'tr', name: '土耳其语', nameEn: 'Turkish', flag: '🇹🇷', speechLang: 'tr-TR' },
  { code: 'vi', name: '越南语', nameEn: 'Vietnamese', flag: '🇻🇳', speechLang: 'vi-VN' },
  { code: 'kk', name: '哈萨克语', nameEn: 'Kazakh', flag: '🇰🇿', speechLang: 'kk-KZ' },
];

export const categories: Category[] = [
  { id: 'greetings', name: '问候', nameEn: 'Greetings', icon: '👋' },
  { id: 'directions', name: '问路', nameEn: 'Directions', icon: '🗺️' },
  { id: 'dining', name: '点餐', nameEn: 'Dining', icon: '🍽️' },
  { id: 'shopping', name: '购物', nameEn: 'Shopping', icon: '🛍️' },
  { id: 'emergency', name: '紧急求助', nameEn: 'Emergency', icon: '🆘' },
  { id: 'airport', name: '机场', nameEn: 'Airport', icon: '✈️' },
  { id: 'hotel', name: '酒店', nameEn: 'Hotel', icon: '🏨' },
  { id: 'tickets', name: '买门票', nameEn: 'Tickets', icon: '🎫' },
  { id: 'transport', name: '坐车', nameEn: 'Transport', icon: '🚌' },
  { id: 'universal', name: '万能句', nameEn: 'Universal', icon: '✨' },
];

export const phrases: Phrase[] = [
  ...enPhrases,
  ...koPhrases,
  ...jaPhrases,
  ...ruPhrases,
  ...itPhrases,
  ...esPhrases,
  ...frPhrases,
  ...thPhrases,
  ...trPhrases,
  ...viPhrases,
  ...kkPhrases,
];