// Placeholder for Dictionary.tsx
import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRightLeft } from 'lucide-react';

const Dictionary = () => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en'); // Default to English
  const [targetLanguage, setTargetLanguage] = useState('mr'); // Default to Marathi
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputText.trim()) {
        translateText();
      } else {
        setTranslatedText('');
      }
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [inputText, sourceLanguage, targetLanguage]);

  const translateText = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, sourceLanguage, targetLanguage }),
      });

      if (!response.ok) {
        throw new Error('Translation failed.');
      }

      const data = await response.json();
      setTranslatedText(data.translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // List of languages for the dropdowns
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'mr', name: 'Marathi' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
  ];

  const swapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name || code;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Dictionary & Translation</h1>
        <p className="text-slate-500">Translate words and phrases instantly between any languages.</p>
      </div>

      <div className="flex items-center justify-center space-x-4">
        <select
          value={sourceLanguage}
          onChange={(e) => setSourceLanguage(e.target.value)}
          className="border border-slate-300 rounded-md p-2 min-w-[150px]"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={swapLanguages}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          title="Swap languages"
        >
          <ArrowRightLeft className="w-5 h-5 text-slate-600" />
        </button>
        
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="border border-slate-300 rounded-md p-2 min-w-[150px]"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-slate-600 mb-2">
            {getLanguageName(sourceLanguage)}
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Enter text in ${getLanguageName(sourceLanguage)}...`}
            className="w-full p-4 border border-slate-300 rounded-lg h-48 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium text-slate-600 mb-2">
            {getLanguageName(targetLanguage)}
          </label>
          <div className="relative w-full p-4 border border-slate-300 rounded-lg h-48 bg-slate-50 overflow-auto">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            )}
            <p className="text-slate-700 whitespace-pre-wrap">{translatedText}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default Dictionary;
