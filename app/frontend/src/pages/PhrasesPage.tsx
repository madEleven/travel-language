import { useState } from 'react';
import { phrases, languages, categories } from '@/data/phrases';
import { PhraseCard } from '@/components/PhraseCard';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PhrasesPageProps {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

const decorAnimals = ['🐱', '🐶', '🐘', '🦆', '🐰', '🦊', '🐻', '🐼'];

const macaronColors = [
  'bg-pink-100 text-pink-700 hover:bg-pink-200',
  'bg-green-100 text-green-700 hover:bg-green-200',
  'bg-purple-100 text-purple-700 hover:bg-purple-200',
  'bg-blue-100 text-blue-700 hover:bg-blue-200',
];

export function PhrasesPage({ favorites, onToggleFavorite }: PhrasesPageProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0].code);
  const [selectedCategory, setSelectedCategory] = useState(categories[0].id);

  const filteredPhrases = phrases.filter(
    p => p.language === selectedLanguage && p.category === selectedCategory
  );

  return (
    <div className="flex flex-col h-full">
      {/* Language selector */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
          选择语言 <span className="text-base">🌍</span>
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {languages.map((lang, idx) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedLanguage === lang.code
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : macaronColors[idx % macaronColors.length]
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category selector */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-2 pb-1">
          {categories.map(cat => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1.5 text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'shadow-sm scale-105'
                  : 'hover:bg-accent'
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Phrases list */}
      <ScrollArea className="flex-1 px-4">
        <div className="pb-20">
          {filteredPhrases.length > 0 ? (
            filteredPhrases.map((phrase, idx) => (
              <div key={phrase.id} className="relative">
                <PhraseCard
                  phrase={phrase}
                  isFavorited={favorites.includes(phrase.id)}
                  onToggleFavorite={onToggleFavorite}
                />
                {/* Floating animal decoration every 3rd card */}
                {idx % 3 === 2 && (
                  <div className="absolute -right-1 -top-1 text-lg opacity-40 select-none pointer-events-none" aria-hidden="true">
                    {decorAnimals[idx % decorAnimals.length]}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <div className="text-4xl mb-3">🦉</div>
              <p>暂无语句</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}