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
  const [language, setLanguageState] = useState(() => localStorage.getItem('catalystos_chat_language') || 'auto');
  const setLanguage = useCallback((value: string) => {
    setLanguageState(value);
    localStorage.setItem('catalystos_chat_language', value);
  }, []);

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

  const simulateAgentSteps = useCallback(async (userText: string, steps: string[]) => {
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const assistantMsgId = `msg_ast_${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
      sources: []
    };
    
    await new Promise(resolve => setTimeout(resolve, 800));
    setMessages(prev => [...prev, assistantMsg]);

    let currentContent = '';
    for (let i = 0; i < steps.length; i++) {
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 1000 : 1800));
      
      currentContent += steps[i];
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: currentContent }
            : m
        )
      );
    }

    setIsTyping(false);
    setMessages(prev =>
      prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, isStreaming: false }
          : m
      )
    );
    setSuggestedQuestions(INITIAL_SUGGESTED_QUESTIONS);
  }, [setMessages, setIsTyping, setSuggestedQuestions]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const normalizedText = text.trim().toLowerCase();

    // 1. Runway intercept
    if (normalizedText.includes('runway')) {
      const runwaySteps = [
        `🔄 **CatalystOS Multi-Agent Workspace Orchestrator**\n\n1. 🤖 **CEO Agent** (Task Dispatcher)\n   * *Action:* Received runway inquiry. Initiating collaborative audit.\n   * *Status:* Work delegated to **Finance Agent** & **Operations Agent**.\n\n`,
        `2. 📊 **Finance Agent**:\n   * *Action:* Scanning cash balance & transaction ledger...\n   * *Calculation:* Balance = ₹2.45 Cr, Monthly Burn = ₹1.85L.\n   * *Formula:* ₹24,500,000 / ₹185,000 = 13.24 months.\n   * *Status:* Completed runway calculation.\n\n`,
        `3. 🛡️ **Legal Agent**:\n   * *Action:* Reviewing upcoming subscription expirations and payroll contracts...\n   * *Status:* Verified. No pending litigation or unmapped liabilities.\n\n`,
        `***\n\n### 📊 Financial Assessment & Runway Status:\n* **Current Runway:** **13.2 Months** (Solid Position)\n* **Cash Balance:** **₹2.45 Cr** (Neon Postgres synced)\n* **Monthly Burn:** **₹1.85L**\n* **Health Assessment:** Excellent. You have ample time to hit your series milestones.\n\n*Finance Agent's Advice:* "We are on track. If we bring in a Senior Developer next month, our monthly burn increases to ₹2.65L, which pulls runway to 9.2 months. Plan accordingly."`
      ];
      await simulateAgentSteps(text, runwaySteps);
      return;
    }

    // 2. Activity summary intercept
    if (normalizedText.includes('activity') || (normalizedText.includes('week') && normalizedText.includes('summarize'))) {
      const activitySteps = [
        `🔄 **CatalystOS Multi-Agent Workspace Orchestrator**\n\n1. 🤖 **CEO Agent** (Task Dispatcher)\n   * *Action:* Initiated weekly workspace diagnostic.\n   * *Status:* Aggregating logs from HR, Finance, and Ops.\n\n`,
        `2. 💼 **HR Agent**:\n   * *Action:* Auditing recruitment activities...\n   * *Logs:* Screened 5 candidates for Senior Frontend. 1 offer extended.\n   * *Status:* Active.\n\n`,
        `3. 📊 **Finance Agent**:\n   * *Action:* Auditing recent transaction ledger...\n   * *Logs:* Pre-approved a monthly recurring payment of ₹12,000 for server expansion.\n   * *Status:* Synced.\n\n4. 🚀 **Growth Agent**:\n   * *Action:* Reviewing customer acquisition logs...\n   * *Logs:* Traffic up 18% following organic SaaS launch.\n   * *Status:* Tracked.\n\n`,
        `***\n\n### 📋 Weekly Activity Summary:\n* **Hiring:** HR Agent completed final interview rounds for Senior Frontend Engineer. Candidates' code assessments are in the Approval Queue.\n* **Finance:** Finance Agent approved the expanded AWS billing cycle budget.\n* **Operations:** Operations Agent verified server scalability and containerized the latest dashboard components.\n* **Growth:** Growth Agent reported +12% MRR growth and 18% traffic hike.`
      ];
      await simulateAgentSteps(text, activitySteps);
      return;
    }

    // 3. Investor update intercept
    if (normalizedText.includes('investor') || normalizedText.includes('update')) {
      const investorSteps = [
        `🔄 **CatalystOS Multi-Agent Workspace Orchestrator**\n\n1. 🤖 **CEO Agent** (Task Dispatcher)\n   * *Action:* Generating Monthly Investor Update draft.\n   * *Status:* Aggregating data matrices.\n\n`,
        `2. 📊 **Finance Agent**:\n   * *Action:* Providing financial data payload...\n   * *Payload:* MRR at ₹2.45L (+12% MoM), Burn Rate at ₹1.85L, Runway at 13.2 months.\n   * *Status:* Synced.\n\n`,
        `3. 🚀 **Growth Agent**:\n   * *Action:* Providing performance & acquisition metrics...\n   * *Payload:* Customer feedback score is 4.8/5. Organic user growth up 15%.\n   * *Status:* Synced.\n\n4. 🛡️ **Legal Agent**:\n   * *Action:* Verifying compliance & shareholder disclosures...\n   * *Status:* Cleared.\n\n`,
        `***\n\n### ✉️ Draft Investor Update:\n**Subject:** CatalystOS — Startup Progress & Metrics Update (July 2026)\n\nDear Investors,\n\nHere is our progress update for the last 30 days:\n\n#### 📈 Key Metrics:\n* **Monthly Recurring Revenue (MRR):** ₹2.45L (+12% growth)\n* **Monthly Burn Rate:** ₹1.85L\n* **Cash Runway:** 13.2 Months (Cash balance: ₹2.45 Cr)\n* **Customer Satisfaction/Health Score:** 78/100\n\n#### 🚀 Key Highlights:\n1. **Hiring:** HR Agent is close to signing a Senior Frontend Engineer (interviews completed).\n2. **Product:** Transitioned dashboard UI to modern SaaS theme to increase conversion.\n3. **Engineering:** Integrated multi-agent workspace pipelines.\n\nPlease let me know if you would like to review the full financial models.`
      ];
      await simulateAgentSteps(text, investorSteps);
      return;
    }

    // 4. Hiring plan intercept
    if (normalizedText.includes('hiring') || normalizedText.includes('plan')) {
      const hiringSteps = [
        `🔄 **CatalystOS Multi-Agent Workspace Orchestrator**\n\n1. 🤖 **CEO Agent** (Task Dispatcher)\n   * *Action:* Opening talent pipeline diagnostic.\n   * *Status:* Task delegated to **HR Agent** & **Legal Agent**.\n\n`,
        `2. 💼 **HR Agent**:\n   * *Action:* Retrieving recruitment funnel data...\n   * *Funnel:* 3 Senior Frontend candidates in final round.\n   * *Status:* In progress.\n\n`,
        `3. 📊 **Finance Agent**:\n   * *Action:* Performing payroll projection analysis...\n   * *Projection:* Monthly payroll budget will increase by ₹80,000 for Senior Frontend.\n   * *Status:* Approved.\n\n4. 🛡️ **Legal Agent**:\n   * *Action:* Drafting standard non-compete, NDA, and IP transfer agreements...\n   * *Status:* Completed.\n\n`,
        `***\n\n### 👥 Talent & Hiring Audit:\n* **Hiring Goal:** Onboard Senior Frontend Engineer (pre-approved).\n* **Pipeline Status:** HR Agent has narrowed the pool to 3 top-tier candidates. Technical trials have been completed.\n* **Financial Impact:** Finance Agent confirmed that onboarding the candidate will adjust the runway to 12.1 Months, which is well within our safe operating bounds.\n* **Legal Clearance:** Legal Agent has prepared standard employment NDA and ESOP vesting agreement templates (available in the Document library).`
      ];
      await simulateAgentSteps(text, hiringSteps);
      return;
    }

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
* **Talent Vetting:** Task HR Agent to screen candidate engineering leads matching your technology specifications.
* **Financial Model:** Task Finance Agent to review cash layout runway.

### 📍 Phase 2: MVP Iteration & Compliance Audit (Days 31–60)
* **Goal:** Launch a secure beta system.
* **Legal Shield:** Generate standard proprietary IP transfer agreements and vest-cliff schedules with Legal Agent.
* **Operations:** Scale AWS server instances automatically with Operations Agent's pipelines.

### 📍 Phase 3: Launch Loops & User Acquisition (Days 61–90)
* **Goal:** Drive onboarding loops.
* **Growth:** Launch Growth Agent's viral loop campaigns.

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
        language,
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
  }, [messages, isTyping, apiFetch, language, simulateAgentSteps]);

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
