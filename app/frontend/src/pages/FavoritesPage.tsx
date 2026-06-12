import { useState } from 'react';
import { phrases, languages, Phrase } from '@/data/phrases';
import { PhraseCard } from '@/components/PhraseCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Volume2, X, Languages, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@metagptx/web-sdk';

const client = createClient();

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

interface FavoritesPageProps {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  customPhrases: CustomPhrase[];
  onAddCustomPhrase: (text: string, language: string, translations?: Record<string, TranslationResult>) => void;
  onRemoveCustomPhrase: (id: string) => void;
}

export function FavoritesPage({ favorites, onToggleFavorite, customPhrases, onAddCustomPhrase, onRemoveCustomPhrase }: FavoritesPageProps) {
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['en']);
  const [translating, setTranslating] = useState(false);

  const favoritePhrases = phrases.filter(p => favorites.includes(p.id));

  // Group by language
  const groupedByLanguage = languages
    .map(lang => ({
      language: lang,
      items: favoritePhrases.filter(p => p.language === lang.code),
    }))
    .filter(group => group.items.length > 0);

  const toggleLangSelection = (code: string) => {
    setSelectedLangs(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const selectAllLangs = () => {
    setSelectedLangs(languages.map(l => l.code));
  };

  const clearLangSelection = () => {
    setSelectedLangs([]);
  };

  /**
   * Extract translations from various possible response structures.
   */
  function extractTranslations(response: unknown): Record<string, TranslationResult> | null {
    if (!response || typeof response !== 'object') return null;

    const resp = response as Record<string, unknown>;

    // Try direct: response.translations
    if (resp.translations && typeof resp.translations === 'object') {
      return resp.translations as Record<string, TranslationResult>;
    }

    // Try: response.data.translations
    if (resp.data && typeof resp.data === 'object') {
      const data = resp.data as Record<string, unknown>;
      if (data.translations && typeof data.translations === 'object') {
        return data.translations as Record<string, TranslationResult>;
      }

      // Try: response.data.data.translations
      if (data.data && typeof data.data === 'object') {
        const innerData = data.data as Record<string, unknown>;
        if (innerData.translations && typeof innerData.translations === 'object') {
          return innerData.translations as Record<string, TranslationResult>;
        }
      }
    }

    // Try: response.body.translations
    if (resp.body && typeof resp.body === 'object') {
      const body = resp.body as Record<string, unknown>;
      if (body.translations && typeof body.translations === 'object') {
        return body.translations as Record<string, TranslationResult>;
      }
    }

    // Try: if the response itself looks like a translations map
    const langCodes = languages.map(l => l.code);
    const keys = Object.keys(resp);
    const matchingKeys = keys.filter(k => langCodes.includes(k));
    if (matchingKeys.length >= 2) {
      const result: Record<string, TranslationResult> = {};
      for (const key of matchingKeys) {
        const val = resp[key];
        if (val && typeof val === 'object' && 'text' in (val as object)) {
          result[key] = val as TranslationResult;
        }
      }
      if (Object.keys(result).length > 0) return result;
    }

    return null;
  }

  const handleTranslateAndAdd = async () => {
    if (!inputText.trim()) return;

    if (selectedLangs.length === 0) {
      toast.error('请至少选择一种目标语言');
      return;
    }

    if (!navigator.onLine) {
      toast.error('翻译功能需要联网使用');
      return;
    }

    setTranslating(true);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/translate/',
        method: 'POST',
        data: {
          text: inputText.trim(),
          target_languages: selectedLangs,
        },
        options: {
          timeout: 600_000,
        },
      });

      console.log('[Translate] Raw response:', JSON.stringify(response).slice(0, 1000));

      const translations = extractTranslations(response);

      if (!translations || Object.keys(translations).length === 0) {
        console.warn('[Translate] Could not extract translations from response');
        onAddCustomPhrase(inputText.trim(), 'zh');
        setInputText('');
        setShowInput(false);
        toast.warning('翻译返回为空，已保存原文。可稍后重试。');
        return;
      }

      console.log('[Translate] Extracted translations:', Object.keys(translations));

      onAddCustomPhrase(inputText.trim(), 'zh', translations);
      setInputText('');
      setShowInput(false);
      toast.success(`翻译完成！已翻译为 ${Object.keys(translations).length} 种语言`);
    } catch (error: unknown) {
      console.error('[Translate] Error:', error);
      onAddCustomPhrase(inputText.trim(), 'zh');
      setInputText('');
      setShowInput(false);
      toast.warning('翻译失败，已保存原文。请检查网络连接后重试。');
    } finally {
      setTranslating(false);
    }
  };

  const handleRetranslate = async (cp: CustomPhrase) => {
    if (!navigator.onLine) {
      toast.error('翻译功能需要联网使用');
      return;
    }

    setTranslating(true);
    try {
      const targetLangs = languages.map(l => l.code);
      const response = await client.apiCall.invoke({
        url: '/api/v1/translate/',
        method: 'POST',
        data: {
          text: cp.text,
          target_languages: targetLangs,
        },
        options: {
          timeout: 600_000,
        },
      });

      const translations = extractTranslations(response);

      if (!translations || Object.keys(translations).length === 0) {
        toast.warning('翻译返回为空，请稍后重试');
        return;
      }

      onRemoveCustomPhrase(cp.id);
      onAddCustomPhrase(cp.text, cp.language, translations);
      toast.success('重新翻译完成！');
    } catch (error: unknown) {
      console.error('[Retranslate] Error:', error);
      toast.error('翻译失败，请检查网络连接后重试');
    } finally {
      setTranslating(false);
    }
  };

  const handleSpeakText = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('当前设备不支持语音播放功能');
      return;
    }

    window.speechSynthesis.cancel();
    const lang = languages.find(l => l.code === langCode);
    const targetLang = lang?.speechLang || 'en-US';

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.8;
    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        toast.error('当前设备不支持该语言语音播放');
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              我的收藏 <span className="text-xl">🐱</span>
            </h2>
            <p className="text-sm text-muted-foreground">已收藏 {favorites.length} 条 · 自定义 {customPhrases.length} 条</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowInput(!showInput)}
            className="rounded-full gap-1"
          >
            <Plus className="h-4 w-4" />
            智能翻译
          </Button>
        </div>

        {/* Translation input section */}
        {showInput && (
          <div className="mt-3 p-3 bg-accent/50 rounded-xl border border-border/50 space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">输入中文，选择目标语言翻译</p>
            </div>
            <Input
              placeholder="输入中文语句，如：请问附近有餐厅吗？"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !translating && handleTranslateAndAdd()}
              className="bg-background"
            />

            {/* Language selector chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">选择目标语言：</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={selectAllLangs}
                    className="text-xs text-primary hover:underline px-1"
                  >
                    全选
                  </button>
                  <span className="text-xs text-muted-foreground">|</span>
                  <button
                    type="button"
                    onClick={clearLangSelection}
                    className="text-xs text-muted-foreground hover:underline px-1"
                  >
                    清除
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {languages.map(lang => {
                  const isSelected = selectedLangs.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLangSelection(lang.code)}
                      className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                        transition-all duration-150 border
                        ${isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5'
                        }
                      `}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              {selectedLangs.length > 0 && (
                <p className="text-xs text-primary">
                  已选 {selectedLangs.length} 种语言
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleTranslateAndAdd}
                disabled={!inputText.trim() || selectedLangs.length === 0 || translating}
                className="gap-1"
              >
                {translating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    翻译中...
                  </>
                ) : (
                  <>
                    <Languages className="h-3 w-3" />
                    翻译 ({selectedLangs.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="pb-20">
          {/* Custom phrases section with translations */}
          {customPhrases.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                <span className="text-lg">✏️</span>
                <span className="text-sm font-semibold text-foreground">我的自定义语句</span>
                <span className="text-xs text-muted-foreground">({customPhrases.length})</span>
              </div>
              {customPhrases.map(cp => {
                const translations = cp.translations;
                const hasTranslations = translations && Object.keys(translations).length > 0;
                return (
                  <div key={cp.id} className="mb-3 p-3 rounded-xl border border-border/60 bg-card/80 shadow-sm">
                    {/* Original Chinese text */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">🇨🇳</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{cp.text}</p>
                        <p className="text-xs text-muted-foreground">中文原文</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => onRemoveCustomPhrase(cp.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Translations */}
                    {hasTranslations ? (
                      <div className="space-y-1.5 pl-2 border-l-2 border-primary/30 ml-3 mt-2">
                        {languages.map(lang => {
                          const t = translations[lang.code];
                          if (!t) return null;
                          return (
                            <div key={lang.code} className="flex items-center gap-2 py-0.5">
                              <span className="text-sm shrink-0">{lang.flag}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground leading-tight">{t.text}</p>
                                {t.pronunciation && (
                                  <p className="text-xs text-muted-foreground italic leading-tight">{t.pronunciation}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary shrink-0"
                                onClick={() => handleSpeakText(t.text, lang.code)}
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pl-5 mt-1">
                        <p className="text-xs text-muted-foreground flex-1">翻译未完成</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleRetranslate(cp)}
                          disabled={translating}
                        >
                          {translating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Languages className="h-3 w-3" />
                          )}
                          重新翻译
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Favorited phrases from library */}
          {groupedByLanguage.length > 0 ? (
            groupedByLanguage.map(group => (
              <div key={group.language.code} className="mb-4">
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                  <span className="text-lg">{group.language.flag}</span>
                  <span className="text-sm font-semibold text-foreground">{group.language.name}</span>
                  <span className="text-xs text-muted-foreground">({group.items.length})</span>
                </div>
                {group.items.map(phrase => (
                  <PhraseCard
                    key={phrase.id}
                    phrase={phrase}
                    isFavorited={true}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ))
          ) : customPhrases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="text-5xl mb-4">🐶</div>
              <p className="text-lg font-medium">还没有收藏</p>
              <p className="text-sm mt-1">在语句库中点击 ♥ 收藏常用语句</p>
              <p className="text-sm mt-1">或点击上方"智能翻译"输入中文自动翻译</p>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}