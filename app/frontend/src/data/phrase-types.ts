export interface Phrase {
  id: string;
  text: string;
  translation: string;
  pronunciation: string;
  language: string;
  category: string;
}

export interface Language {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  speechLang: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
}