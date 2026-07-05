import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, Paperclip, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleRecording = () => {
    setPermissionError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPermissionError('Browser Speech Recognition not supported. Use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      setIsRecording(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setText(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setPermissionError('Microphone permission denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          setPermissionError('No speech detected.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    } catch (e: any) {
      console.error(e);
      setIsRecording(false);
      setPermissionError('Could not access microphone.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(prev => (prev ? `${prev}\n\n${content}` : content));
      };
      reader.readAsText(file as Blob);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(prev => (prev ? `${prev}\n\n${content}` : content));
      };
      reader.readAsText(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
    setPermissionError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.08] bg-[#090909] font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".md,.txt,.pdf,.docx"
      />

      {permissionError && (
        <div className="mb-2 text-[10px] text-rose-400 bg-rose-950/30 border border-rose-900/50 p-1.5 rounded-lg flex justify-between items-center font-mono">
          <span>{permissionError}</span>
          <button type="button" onClick={() => setPermissionError(null)} className="text-white hover:underline cursor-pointer">Dismiss</button>
        </div>
      )}

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex items-center bg-[#111111] border border-white/10 rounded-2xl p-1.5 focus-within:border-white transition-colors shadow-inner gap-1"
      >
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Voice Input Button */}
        <button
          type="button"
          onClick={toggleRecording}
          title={isRecording ? 'Listening... click to stop' : 'Voice Input (Click to speak)'}
          className={`p-2 transition-colors cursor-pointer ${
            isRecording ? 'text-red-400 animate-pulse bg-red-950/40 rounded-lg' : 'text-white/40 hover:text-white'
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening... speak now...' : 'Ask me anything about CatalystOS...'}
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-2 py-2 text-xs sm:text-sm text-white placeholder:text-[#777777] focus:outline-none resize-none max-h-32 font-sans"
        />

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
            text.trim() && !disabled
              ? 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 px-1 text-[9px] font-mono text-[#777777]">
        <span className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-white/50" />
          <span>Press Enter to send, Shift+Enter for new line</span>
        </span>
        <span>{text.length} / 2000</span>
      </div>
    </form>
  );
}
