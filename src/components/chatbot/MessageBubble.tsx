import React, { useState } from 'react';
import { Bot, User, Check, Copy, ThumbsUp, ThumbsDown, Volume2, Square, RotateCw } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import SourceCard from './SourceCard';
import { ChatMessage } from '../../hooks/useChat';

interface MessageBubbleProps {
  key?: React.Key;
  message: ChatMessage;
  onRegenerate?: () => void;
}

export default function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const isAssistant = message.role === 'assistant';

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    // Clean markdown symbols for cleaner speech
    const plainText = message.content
      .replace(/#+\s+/g, '')
      .replace(/\*+/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingSpeech(false);
    utterance.onerror = () => setIsPlayingSpeech(false);

    setIsPlayingSpeech(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (rating: 'up' | 'down') => {
    setFeedback(rating);
    fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: message.id, rating })
    }).catch(console.error);
  };

  return (
    <div className={`flex items-start gap-3 my-3 font-sans group ${!isAssistant ? 'flex-row-reverse' : ''}`}>
      {/* Avatar Badge */}
      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-md ${
        isAssistant 
          ? 'bg-[#111111] border-white/10 text-white' 
          : 'bg-white text-black border-white'
      }`}>
        {isAssistant ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-black" />}
      </div>

      {/* Bubble Box */}
      <div className={`max-w-[85%] p-4 rounded-2xl border text-sm relative space-y-2 shadow-sm ${
        isAssistant 
          ? 'bg-[#111111] border-white/[0.08] text-[#B8B8B8] rounded-tl-sm' 
          : 'bg-[#181818] border-white/10 text-white rounded-tr-sm'
      }`}>
        {/* Header Metadata */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-1.5 text-[10px] font-mono text-[#777777]">
          <span className="font-bold uppercase tracking-wider">
            {isAssistant ? 'Catalyst OS AI' : 'You'}
          </span>
          <div className="flex items-center gap-2">
            <span>{message.timestamp}</span>
            <button
              onClick={handleCopyMessage}
              title="Copy message text"
              className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Content Render */}
        <MarkdownRenderer content={message.content} />

        {/* RAG Source Cards */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <SourceCard sources={message.sources} />
        )}

        {/* Assistant Actions: Speech Output, Regenerate & Feedback */}
        {isAssistant && (
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-zinc-500 text-[10px] font-mono">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeech}
                title={isPlayingSpeech ? 'Stop Voice Speech' : 'Listen to Voice Speech (TTS)'}
                className={`flex items-center gap-1 hover:text-white transition-colors cursor-pointer ${
                  isPlayingSpeech ? 'text-emerald-400 font-bold' : ''
                }`}
              >
                {isPlayingSpeech ? <Square className="w-3 h-3 animate-pulse" /> : <Volume2 className="w-3 h-3" />}
                <span>{isPlayingSpeech ? 'Speaking...' : 'Listen'}</span>
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleFeedback('up')}
                className={`p-1 rounded hover:text-white transition-colors cursor-pointer ${
                  feedback === 'up' ? 'text-emerald-400' : ''
                }`}
                title="Helpful"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleFeedback('down')}
                className={`p-1 rounded hover:text-white transition-colors cursor-pointer ${
                  feedback === 'down' ? 'text-rose-400' : ''
                }`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
