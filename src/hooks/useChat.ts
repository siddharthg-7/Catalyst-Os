import { useState, useCallback } from 'react';
import { sendChatMessage, streamChatMessage, ChatApiMessage } from '../services/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; score: number }>;
  isStreaming?: boolean;
}

export const INITIAL_SUGGESTED_QUESTIONS = [
  'What is Catalyst OS?',
  'How do I onboard?',
  'Explain Executive Council.',
  'Pricing Plans',
  'Security Features'
];

export function useChat(apiFetch?: (url: string, options?: RequestInit) => Promise<Response>) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions] = useState<string[]>(INITIAL_SUGGESTED_QUESTIONS);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setIsTyping(false);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Prepare API history
    const apiHistory: ChatApiMessage[] = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    const assistantMsgId = `msg_ast_${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
      sources: []
    };

    setMessages(prev => [...prev, assistantMsg]);

    try {
      await streamChatMessage(
        apiHistory,
        (chunkText) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + chunkText }
                : m
            )
          );
        },
        (sources) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, sources }
                : m
            )
          );
        },
        apiFetch
      );
    } catch (err) {
      console.error('[useChat Error]:', err);
    } finally {
      setIsTyping(false);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, isStreaming: false }
            : m
        )
      );
    }
  }, [messages, isTyping, apiFetch]);

  const regenerateLastMessage = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  }, [messages, sendMessage]);

  return {
    isOpen,
    toggleOpen,
    openChat,
    closeChat,
    clearChat,
    messages,
    isTyping,
    suggestedQuestions,
    sendMessage,
    regenerateLastMessage,
  };
}
