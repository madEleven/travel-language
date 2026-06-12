import { useState } from 'react';
import { Volume2, Heart, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phrase, languages } from '@/data/phrases';
import { toast } from 'sonner';

interface PhraseCardProps {
  phrase: Phrase;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}

const animalEmojis = ['🐱', '🐶', '🐘', '🦆', '🐰', '🦊', '🐻', '🐼', '🦉', '🐧', '🦋', '🐢', '🦒', '🐨', '🐹'];

function getAnimalForPhrase(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return animalEmojis[Math.abs(hash) % animalEmojis.length];
}

export function PhraseCard({ phrase, isFavorited, onToggleFavorite }: PhraseCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const language = languages.find(l => l.code === phrase.language);
  const animal = getAnimalForPhrase(phrase.id);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('当前设备不支持语音播放功能');
      return;
    }

    window.speechSynthesis.cancel();

    // Check if the language voice is available
    const voices = window.speechSynthesis.getVoices();
    const targetLang = language?.speechLang || 'en-US';
    const langPrefix = targetLang.split('-')[0];
    const hasVoice = voices.length === 0 || voices.some(v => v.lang.startsWith(langPrefix));

    const utterance = new SpeechSynthesisUtterance(phrase.text);
    utterance.lang = targetLang;
    utterance.rate = 0.8;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      setIsPlaying(false);
      if (e.error !== 'canceled') {
        toast.error('当前设备不支持该语言语音播放');
      }
    };

    if (!hasVoice) {
      toast.warning('当前设备可能不支持该语言语音播放');
    }

    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card className="mb-3 border-border/60 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5 select-none" aria-hidden="true">{animal}</span>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground leading-tight">{phrase.text}</p>
            <p className="text-sm text-muted-foreground mt-1">{phrase.translation}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{phrase.pronunciation}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-full ${isPlaying ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'}`}
              onClick={handleSpeak}
              aria-label="播放发音"
            >
              <Volume2 className={`h-5 w-5 ${isPlaying ? 'animate-pulse' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-full ${isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
              onClick={() => onToggleFavorite(phrase.id)}
              aria-label={isFavorited ? '取消收藏' : '收藏'}
            >
              {isFavorited ? <Heart className="h-5 w-5 fill-current" /> : <HeartOff className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}