import { useState, useEffect, useCallback } from 'react';
import { BottomNav, TabType } from '@/components/BottomNav';
import { PhrasesPage } from '@/pages/PhrasesPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { MapPage } from '@/pages/MapPage';
import { CameraTranslatePage } from '@/pages/CameraTranslatePage';
import { getFavorites, addFavorite, removeFavorite } from '@/lib/favorites';
import { Plane } from 'lucide-react';

interface TranslationResult {
  text: string;
  pronunciation: string;
}

interface CustomPhrase {
  id: string;
  text: string;
  language: string;
  translations?: Record<string, TranslationResult>;
}

const CUSTOM_PHRASES_KEY = 'travel-custom-phrases';

function loadCustomPhrases(): CustomPhrase[] {
  try {
    const stored = localStorage.getItem(CUSTOM_PHRASES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomPhrases(phrases: CustomPhrase[]) {
  localStorage.setItem(CUSTOM_PHRASES_KEY, JSON.stringify(phrases));
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('phrases');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [customPhrases, setCustomPhrases] = useState<CustomPhrase[]>(loadCustomPhrases);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    getFavorites().then(setFavorites);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (favorites.includes(id)) {
      await removeFavorite(id);
      setFavorites(prev => prev.filter(f => f !== id));
    } else {
      await addFavorite(id);
      setFavorites(prev => [...prev, id]);
    }
  }, [favorites]);

  const handleAddCustomPhrase = useCallback((text: string, language: string, translations?: Record<string, TranslationResult>) => {
    const newPhrase: CustomPhrase = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      translations,
      text,
      language,
    };
    setCustomPhrases(prev => {
      const updated = [newPhrase, ...prev];
      saveCustomPhrases(updated);
      return updated;
    });
  }, []);

  const handleRemoveCustomPhrase = useCallback((id: string) => {
    setCustomPhrases(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveCustomPhrases(updated);
      return updated;
    });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with warm feel */}
      <header className="shrink-0 px-4 py-3 border-b border-border/40 bg-white sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐾</span>
            <Plane className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">旅行语言助手</h1>
          </div>
          <div className="flex items-center gap-1">
            {isOffline && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                离线模式
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 max-w-lg mx-auto w-full">
        {activeTab === 'phrases' && (
          <PhrasesPage favorites={favorites} onToggleFavorite={handleToggleFavorite} />
        )}
        {activeTab === 'favorites' && (
          <FavoritesPage
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            customPhrases={customPhrases}
            onAddCustomPhrase={handleAddCustomPhrase}
            onRemoveCustomPhrase={handleRemoveCustomPhrase}
          />
        )}
        {activeTab === 'map' && <MapPage />}
        {activeTab === 'camera' && <CameraTranslatePage />}
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}