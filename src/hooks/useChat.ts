import { useState, useCallback, useEffect } from 'react';
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
  'How do I get started?',
  'Tell me about the AI agents',
  'How does CatalystOS work?',
  'What can I build with CatalystOS?',
  'Where should I begin?'
];

export function useChat(apiFetch?: (url: string, options?: RequestInit) => Promise<Response>, userId?: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(INITIAL_SUGGESTED_QUESTIONS);

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
    setSuggestedQuestions(INITIAL_SUGGESTED_QUESTIONS);
  }, []);

  // Listen to onboarding context to trigger automated welcome greeting
  useEffect(() => {
    if (!userId) return;
    const contextStr = localStorage.getItem(`catalystos_onboarding_context_${userId}`);
    if (contextStr) {
      try {
        const context = JSON.parse(contextStr);
        
        const summaryMsg: ChatMessage = {
          id: `msg_ast_greeting_${Date.now()}`,
          role: 'assistant',
          content: `Welcome! I've reviewed everything you've shared about your startup.

Here's a summary of what I understand:

* **Startup:** ${context.startupName || 'Your Startup'}
* **Industry:** ${context.industry || 'B2B SaaS'}
* **Current Stage:** ${context.stage || 'MVP'}
* **Team Size:** ${context.teamSize || '1'}
* **Biggest Challenge:** ${context.biggestChallenge || 'Hiring'}
* **Next Milestone:** ${context.timeline || 'Launch'}

**How would you like to proceed?**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: []
        };
        
        setMessages([summaryMsg]);
        setIsOpen(true);
        setSuggestedQuestions([
          'Map out my startup journey',
          'I have something specific in mind'
        ]);
        
        // Clean up flag so greeting only triggers once
        localStorage.removeItem(`catalystos_onboarding_context_${userId}`);
      } catch (err) {
        console.error('Error parsing onboarding context:', err);
      }
    }
  }, [userId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    // Intercept Map out my startup journey Action
    if (text.trim() === 'Map out my startup journey') {
      const userMsg: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      setTimeout(() => {
        const roadmapMsg: ChatMessage = {
          id: `msg_ast_roadmap_${Date.now()}`,
          role: 'assistant',
          content: `Here is a complete, custom launch roadmap synthesized for your startup from your current stage:

### 📍 Phase 1: Vetting & Infrastructure (Days 1–30)
* **Goal:** Resolve core validation and structural setups.
* **Talent Vetting:** Task HR Agent Evelyn Brooks to screen candidate engineering leads matching your technology specifications.
* **Financial Model:** Task Marcus Sterling to review cash layout runway.

### 📍 Phase 2: MVP Iteration & Compliance Audit (Days 31–60)
* **Goal:** Launch a secure beta system.
* **Legal Shield:** Generate standard proprietary IP transfer agreements and vest-cliff schedules with Helena Vance, Esq.
* **Operations:** Scale AWS server instances automatically with Finch's operations pipelines.

### 📍 Phase 3: Launch Loops & User Acquisition (Days 61–90)
* **Goal:** Drive onboarding loops.
* **Growth:** Launch CMO Dax Ramirez's viral loop campaigns.

**Would you like me to create a detailed strategic sprint task list for Phase 1?**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: []
        };
        setMessages(prev => [...prev, roadmapMsg]);
        setIsTyping(false);
        setSuggestedQuestions(INITIAL_SUGGESTED_QUESTIONS);
      }, 1500);

      return;
    }

    // Intercept I have something specific in mind Action
    if (text.trim() === 'I have something specific in mind') {
      const userMsg: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      setTimeout(() => {
        const replyMsg: ChatMessage = {
          id: `msg_ast_reply_${Date.now()}`,
          role: 'assistant',
          content: `Understood! What specific challenge or question can I help you with today? Feel free to ask about your runway calculations, legal documents, hiring templates, or operations setup.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: []
        };
        setMessages(prev => [...prev, replyMsg]);
        setIsTyping(false);
        setSuggestedQuestions(INITIAL_SUGGESTED_QUESTIONS);
      }, 1000);

      return;
    }

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
