import React from 'react';
import ChatButton from './ChatButton';
import ChatWindow from './ChatWindow';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';

export default function CatalystOsChatbot() {
  // Grab apiFetch if available inside AuthProvider
  let apiFetch: ((url: string, options?: RequestInit) => Promise<Response>) | undefined;
  let userId: string | undefined;
  try {
    const auth = useAuth();
    apiFetch = auth.apiFetch;
    userId = auth.user?.id;
  } catch (e) {
    // If mounted outside AuthProvider, use standard fetch
    apiFetch = undefined;
    userId = undefined;
  }

  const {
    isOpen,
    toggleOpen,
    closeChat,
    clearChat,
    messages,
    isTyping,
    suggestedQuestions,
    sendMessage,
    regenerateLastMessage,
  } = useChat(apiFetch, userId);

  return (
    <>
      <ChatWindow
        isOpen={isOpen}
        messages={messages}
        isTyping={isTyping}
        suggestedQuestions={suggestedQuestions}
        onSendMessage={sendMessage}
        onClearChat={clearChat}
        onClose={closeChat}
        onRegenerate={regenerateLastMessage}
      />
      <ChatButton
        isOpen={isOpen}
        onClick={toggleOpen}
        unreadCount={messages.filter(m => m.role === 'assistant').length}
      />
    </>
  );
}
