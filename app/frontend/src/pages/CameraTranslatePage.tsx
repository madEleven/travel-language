import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Volume2, Loader2, RotateCcw, X, Image as ImageIcon, List } from 'lucide-react';
import { client } from '@/lib/api';

// ============ Image Compression ============

async function compressImageToMaxSize(dataUri: string, maxBase64Length = 350_000): Promise<string> {
  let maxDim = 1024;
  let quality = 0.6;
  const minDim = 400;
  const minQuality = 0.15;
  const img = await loadImage(dataUri);

  for (let attempt = 0; attempt < 8; attempt++) {
    const compressed = resizeAndCompress(img, maxDim, quality);
    if (compressed.length <= maxBase64Length) {
      return compressed;
    }
    if (quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.12);
    } else if (maxDim > minDim) {
      maxDim = Math.max(minDim, Math.round(maxDim * 0.7));
      quality = 0.4;
    } else {
      return compressed;
    }
  }
  return resizeAndCompress(img, minDim, minQuality);
}

function loadImage(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUri;
  });
}

function resizeAndCompress(img: HTMLImageElement, maxDim: number, quality: number): string {
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

// ============ Language Utils ============

function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

/**
 * Robustly extract translation text from various possible response structures.
 * The apiCall.invoke response can be nested differently depending on SDK version.
 */
function extractTranslationsFromResp(resp: unknown, targetLang: string): string | null {
  if (!resp || typeof resp !== 'object') return null;

  const r = resp as Record<string, unknown>;

  // Try multiple paths to find the translations object
  let translations: Record<string, unknown> | null = null;

  // Path 1: resp.translations
  if (r.translations && typeof r.translations === 'object') {
    translations = r.translations as Record<string, unknown>;
  }
  // Path 2: resp.data.translations
  else if (r.data && typeof r.data === 'object') {
    const data = r.data as Record<string, unknown>;
    if (data.translations && typeof data.translations === 'object') {
      translations = data.translations as Record<string, unknown>;
    }
    // Path 3: resp.data.data.translations
    else if (data.data && typeof data.data === 'object') {
      const innerData = data.data as Record<string, unknown>;
      if (innerData.translations && typeof innerData.translations === 'object') {
        translations = innerData.translations as Record<string, unknown>;
      }
    }
  }
  // Path 4: resp.body.translations
  else if (r.body && typeof r.body === 'object') {
    const body = r.body as Record<string, unknown>;
    if (body.translations && typeof body.translations === 'object') {
      translations = body.translations as Record<string, unknown>;
    }
  }

  if (!translations) return null;

  // Extract the target language translation
  const t = translations[targetLang] || Object.values(translations)[0];
  if (!t) return null;

  // Handle both string and object formats
  if (typeof t === 'string') return t;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.translation === 'string') return obj.translation;
    // Try first string value
    for (const val of Object.values(obj)) {
      if (typeof val === 'string') return val;
    }
  }
  return null;
}

interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  translation?: string;
}

const LANG_VOICE_MAP: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en-US',
};

// ============ Canvas Overlay Rendering ============

async function renderTranslatedImage(
  originalImageUri: string,
  blocks: TextBlock[]
): Promise<string> {
  const img = await loadImage(originalImageUri);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Draw translation overlays
  for (const block of blocks) {
    if (!block.translation) continue;

    const bx = (block.x / 100) * img.width;
    const by = (block.y / 100) * img.height;
    const bw = (block.width / 100) * img.width;
    const bh = (block.height / 100) * img.height;

    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    const padding = 4;
    ctx.fillRect(bx - padding, by - padding, bw + padding * 2, bh + padding * 2);

    // Draw border
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx - padding, by - padding, bw + padding * 2, bh + padding * 2);

    // Calculate font size based on block height
    const fontSize = Math.max(12, Math.min(bh * 0.7, bw / (block.translation.length * 0.6)));
    ctx.font = `bold ${fontSize}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = '#6b21a8';
    ctx.textBaseline = 'middle';

    // Word wrap if text is too long
    const maxWidth = bw - 4;
    const lines = wrapText(ctx, block.translation, maxWidth);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    const startY = by + (bh - totalTextHeight) / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + 2, startY + i * lineHeight, maxWidth);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const char of text) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [text];
}

// ============ OCR Helpers ============

async function ocrWithPositions(compressedImage: string): Promise<TextBlock[]> {
  try {
    const response = await client.apiCall.invoke({
      url: '/api/v1/ocr/with-positions',
      method: 'POST',
      data: { image: compressedImage },
      options: { timeout: 180_000 },
    });
    const blocks: TextBlock[] = response?.data?.blocks || [];
    if (blocks.length > 0) return blocks;
  } catch (e) {
    console.warn('[CameraTranslate] with-positions failed, falling back to basic OCR', e);
  }

  // Fallback: use basic OCR and create a single block
  const fallbackResponse = await client.apiCall.invoke({
    url: '/api/v1/ocr/',
    method: 'POST',
    data: { image: compressedImage },
    options: { timeout: 180_000 },
  });
  const text = fallbackResponse?.data?.text || '';
  if (!text.trim()) return [];

  // Split by lines and distribute vertically
  const lines = text.split('\n').filter((l: string) => l.trim());
  if (lines.length === 1) {
    return [{ text: lines[0], x: 5, y: 10, width: 90, height: 15 }];
  }
  const heightPerLine = Math.min(12, 80 / lines.length);
  return lines.map((line: string, idx: number) => ({
    text: line,
    x: 5,
    y: 5 + idx * (heightPerLine + 2),
    width: 90,
    height: heightPerLine,
  }));
}

// ============ Component ============

export function CameraTranslatePage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [translatedImageUri, setTranslatedImageUri] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [viewMode, setViewMode] = useState<'image' | 'list'>('image');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'idle' | 'compressing' | 'ocr' | 'translating' | 'rendering' | 'done'>('idle');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setTranslatedImageUri(null);
      setBlocks([]);
      setError('');
      setStage('idle');
    };
    reader.readAsDataURL(file);
  };

  const handleRecognizeAndTranslate = async () => {
    if (!imagePreview) return;
    if (!navigator.onLine) {
      setError('离线模式下无法使用拍照翻译功能');
      return;
    }
    setLoading(true);
    setError('');
    setBlocks([]);
    setTranslatedImageUri(null);
    setStage('compressing');

    try {
      // Step 1: Compress
      const compressedImage = await compressImageToMaxSize(imagePreview, 350_000);
      console.log(`[CameraTranslate] Compressed: ${(compressedImage.length / 1024).toFixed(1)}KB`);

      setStage('ocr');

      // Step 2: OCR with positions (with fallback)
      const textBlocks = await ocrWithPositions(compressedImage);

      if (!textBlocks.length) {
        setError('未能识别到文字，请尝试更清晰的图片');
        setLoading(false);
        setStage('idle');
        return;
      }

      setBlocks(textBlocks);
      setStage('translating');

      // Step 3: Determine translation direction
      const allText = textBlocks.map(b => b.text).join('');
      const isChinese = containsChinese(allText);
      const targetLang = isChinese ? 'en' : 'zh';

      // Step 4: Translate each block individually for reliability
      const translatedBlocks = [...textBlocks];

      for (let i = 0; i < translatedBlocks.length; i++) {
        try {
          const resp = await client.apiCall.invoke({
            url: '/api/v1/translate/',
            method: 'POST',
            data: { text: translatedBlocks[i].text, target_languages: [targetLang] },
            options: { timeout: 120_000 },
          });

          // Robust extraction: try multiple response structures
          const translations = extractTranslationsFromResp(resp, targetLang);
          if (translations) {
            translatedBlocks[i].translation = translations;
          } else {
            console.warn(`[CameraTranslate] No translation extracted for block ${i}, resp:`, JSON.stringify(resp).slice(0, 500));
            translatedBlocks[i].translation = `[${targetLang === 'en' ? 'Translation failed' : '翻译失败'}]`;
          }
        } catch (err) {
          console.warn(`[CameraTranslate] Failed to translate block ${i}`, err);
          translatedBlocks[i].translation = `[${targetLang === 'en' ? 'Translation failed' : '翻译失败'}]`;
        }
      }

      setBlocks(translatedBlocks);
      setStage('rendering');

      // Step 5: Render translated image
      const rendered = await renderTranslatedImage(imagePreview, translatedBlocks);
      setTranslatedImageUri(rendered);
      setStage('done');
      setViewMode('image');
    } catch (e: unknown) {
      const err = e as { data?: { detail?: string }; response?: { data?: { detail?: string } }; message?: string };
      const detail = err?.data?.detail || err?.response?.data?.detail || err?.message || '';
      const lowerDetail = detail.toLowerCase();
      if (lowerDetail.includes('network') || lowerDetail.includes('timeout') || lowerDetail.includes('err_') || lowerDetail.includes('failed to fetch') || lowerDetail.includes('413')) {
        setError('网络连接失败或图片过大，请检查网络后重试');
      } else {
        setError(detail || '识别或翻译失败，请重试');
      }
      setStage('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_VOICE_MAP[lang] || 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveImage = useCallback(() => {
    if (!translatedImageUri) return;
    const link = document.createElement('a');
    link.download = `translated_${Date.now()}.jpg`;
    link.href = translatedImageUri;
    link.click();
  }, [translatedImageUri]);

  const reset = () => {
    setImagePreview(null);
    setTranslatedImageUri(null);
    setBlocks([]);
    setError('');
    setStage('idle');
    setViewMode('image');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const stageLabel = () => {
    switch (stage) {
      case 'compressing': return '正在压缩图片...';
      case 'ocr': return '正在识别文字...';
      case 'translating': return '正在翻译...';
      case 'rendering': return '正在生成翻译结果...';
      default: return '处理中...';
    }
  };

  const isChinese = blocks.length > 0 && containsChinese(blocks.map(b => b.text).join(''));

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4 space-y-4">
        {/* Image capture area */}
        {!imagePreview ? (
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-100">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm">
                <Camera className="h-8 w-8 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">拍照翻译</h3>
                <p className="text-sm text-gray-500 mt-1">拍照或选择图片，AI自动识别文字并翻译</p>
                <p className="text-xs text-gray-400 mt-1">中文 → 英文 | 其他语言 → 中文</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-pink-400 text-white rounded-xl font-medium shadow-sm hover:bg-pink-500 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  拍照
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-400 text-white rounded-xl font-medium shadow-sm hover:bg-purple-500 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  相册
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Image preview (before processing) */}
            {stage === 'idle' && (
              <>
                <div className="relative rounded-2xl overflow-hidden border border-pink-100">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-56 object-contain bg-gray-50" />
                  <button
                    onClick={reset}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={handleRecognizeAndTranslate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-xl font-medium shadow-sm hover:from-pink-500 hover:to-purple-500 transition-all disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" />
                  识别并翻译
                </button>
              </>
            )}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
            <p className="text-sm text-gray-600">{stageLabel()}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <div>
              <p>{error}</p>
              <button
                onClick={handleRecognizeAndTranslate}
                className="mt-2 text-xs text-red-500 underline hover:text-red-700"
              >
                点击重试
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {stage === 'done' && !loading && (
          <div className="space-y-3">
            {/* View mode toggle */}
            <div className="flex items-center justify-between">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'image' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  图片
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  列表
                </button>
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                重新拍照
              </button>
            </div>

            {/* Image view - translated overlay */}
            {viewMode === 'image' && translatedImageUri && (
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden border border-purple-100 shadow-sm">
                  <img
                    src={translatedImageUri}
                    alt="Translated"
                    className="w-full object-contain"
                  />
                </div>
                <button
                  onClick={handleSaveImage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-500 text-white rounded-xl font-medium shadow-sm hover:bg-purple-600 transition-colors"
                >
                  💾 保存翻译图片
                </button>
              </div>
            )}

            {/* List view - text blocks */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {blocks.map((block, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                        {block.text}
                      </div>
                      {block.translation && (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 bg-purple-50 rounded-lg p-2">
                            <p className="text-sm font-medium text-purple-800">
                              {block.translation}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSpeak(block.translation!, isChinese ? 'en' : 'zh')}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-500 hover:bg-purple-200 transition-colors"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}