import { useState, useCallback, useEffect } from 'react';
import { 
  OrchestrationResponse, 
  OrchestrationAgentActivity, 
  OrchestrationCalculation, 
  OrchestrationEvidence, 
  OrchestrationApprovalRequirement 
} from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; score: number }>;
  isStreaming?: boolean;
  autoPlaySpeech?: boolean;
  // Dynamic AI Orchestration metadata
  activeAgents?: OrchestrationAgentActivity[];
  calculations?: OrchestrationCalculation[];
  evidence?: OrchestrationEvidence[];
  approval?: OrchestrationApprovalRequirement;
  status?: 'completed' | 'needs_approval' | 'needs_information' | 'failed';
  commandId?: string;
  intent?: string;
  objective?: string;
  nextActions?: Array<{ label: string; action: string }>;
}

export const INITIAL_SUGGESTED_QUESTIONS = [
  'What is our current runway?',
  'Can we afford to hire three engineers?',
  'What are the biggest risks to the company right now?',
  'Prepare a 30-day GTM plan.',
  'What contracts should I review?'
];

export function useChat(apiFetch?: (url: string, options?: RequestInit) => Promise<Response>, userId?: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(INITIAL_SUGGESTED_QUESTIONS);
  const [language, setLanguageState] = useState(() => localStorage.getItem('catalystos_chat_language') || 'auto');

  const setLanguage = useCallback((value: string) => {
    setLanguageState(value);
    localStorage.setItem('catalystos_chat_language', value);
  }, []);

  const toggleOpen = useCallback(() => setIsOpen(prev => !prev), []);
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
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
          content: `Welcome to Catalyst OS! I am Sophia Vance, your CEO Orchestrator.

I've reviewed your company profile:
* **Startup:** ${context.startupName || 'Your Startup'}
* **Industry:** ${context.industry || 'B2B SaaS'}
* **Current Stage:** ${context.stage || 'MVP'}
* **Team Size:** ${context.teamSize || '1'}
* **Immediate Priority:** ${context.biggestChallenge || 'Operational Velocity'}

Your AI Executive Team (CFO, Talent, Growth, Operations, Legal, Auditor) is online and ready. What strategic command would you like to issue today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: []
        };
        
        setMessages([summaryMsg]);
        setIsOpen(true);
        localStorage.removeItem(`catalystos_onboarding_context_${userId}`);
      } catch (err) {
        console.error('Error parsing onboarding context:', err);
      }
    }
  }, [userId]);

  const sendMessage = useCallback(async (text: string, isVoice: boolean = false) => {
    if (!text.trim() || isTyping) return;

    const trimmedText = text.trim();
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const assistantMsgId = `msg_ast_${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
      autoPlaySpeech: isVoice,
      activeAgents: [
        { role: 'CEO', status: 'analyzing', contribution: 'Understanding founder command & startup state' }
      ]
    };

    setMessages(prev => [...prev, initialAssistantMsg]);

    const fetchImpl = apiFetch || fetch;

    try {
      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let streamSucceeded = false;
      try {
        const streamRes = await fetchImpl('/api/orchestrate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: trimmedText, commandId })
        });

        if (!streamRes.ok) {
          const errData = await streamRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.details || `Server returned status ${streamRes.status}`);
        }

        if (streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === '[DONE]') {
                streamSucceeded = true;
                break;
              }

              try {
                const event = JSON.parse(dataStr);
                
                if (event.type === 'intent_detected') {
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                    ...m,
                    intent: event.intent,
                    objective: event.objective,
                    activeAgents: event.activatedRoles.map((r: string) => ({
                      role: r,
                      status: r === 'CEO' ? 'collaborating' : 'analyzing'
                    }))
                  } : m));
                } else if (event.type === 'agent_started') {
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                    ...m,
                    activeAgents: (m.activeAgents || []).map(ag => ag.role === event.role ? { ...ag, status: event.status } : ag)
                  } : m));
                } else if (event.type === 'agent_completed') {
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                    ...m,
                    activeAgents: (m.activeAgents || []).map(ag => ag.role === event.role ? { ...ag, status: 'completed', contribution: event.contribution } : ag)
                  } : m));
                } else if (event.type === 'final_response' && event.result) {
                  const res: OrchestrationResponse = event.result;
                  const formattedContent = res.answer.details
                    ? `${res.answer.summary}\n\n${res.answer.details}`
                    : res.answer.summary;

                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                    ...m,
                    content: formattedContent,
                    activeAgents: res.agents,
                    calculations: res.calculations,
                    evidence: res.evidence,
                    approval: res.approval,
                    status: res.status,
                    commandId: res.commandId,
                    intent: res.interpretation.intent,
                    objective: res.interpretation.objective,
                    nextActions: res.nextActions,
                    isStreaming: false,
                  } : m));

                  if (res.approval?.required) {
                    window.dispatchEvent(new CustomEvent('CATALYST_APPROVAL_CREATED', { detail: res.approval }));
                  }
                  streamSucceeded = true;
                }
              } catch {
                // Ignore parse errors on intermediate lines
              }
            }
          }
        }
      } catch (streamErr: any) {
        // If it was an explicit HTTP error from the server (e.g. 400, 429, 500), do not retry
        if (streamErr.message && streamErr.message.includes('Server returned status')) {
          throw streamErr;
        }
        console.warn('[useChat] SSE stream unavailable, falling back to standard POST:', streamErr);
      }

      // If SSE streaming endpoint was not available (e.g. 404 or network protocol), use standard POST
      if (!streamSucceeded) {
        const response = await fetchImpl('/api/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: trimmedText, commandId })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.details || `Server returned status ${response.status}`);
        }

        const resData: OrchestrationResponse = await response.json();
        const formattedContent = resData.answer.details
          ? `${resData.answer.summary}\n\n${resData.answer.details}`
          : resData.answer.summary;

        setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
          ...m,
          content: formattedContent,
          activeAgents: resData.agents,
          calculations: resData.calculations,
          evidence: resData.evidence,
          approval: resData.approval,
          status: resData.status,
          commandId: resData.commandId,
          intent: resData.interpretation.intent,
          objective: resData.interpretation.objective,
          nextActions: resData.nextActions,
          isStreaming: false,
        } : m));

        if (resData.approval?.required) {
          window.dispatchEvent(new CustomEvent('CATALYST_APPROVAL_CREATED', { detail: resData.approval }));
        }
      }
    } catch (err: any) {
      console.error('[useChat Error]:', err);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
        ...m,
        content: `I couldn't complete the executive analysis right now. Reason: ${err.message || 'AI orchestration pipeline unavailable'}. Please try again.`,
        isStreaming: false,
        status: 'failed'
      } : m));
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, apiFetch]);

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
    language,
    setLanguage,
    sendMessage,
    regenerateLastMessage,
  };
}
