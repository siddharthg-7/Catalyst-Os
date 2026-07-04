import React, { useState } from 'react';
import { Rocket } from 'lucide-react';

export default function GodmodeTest() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('Waiting for question...');
  const [loading, setLoading] = useState(false);

  // This is the function you requested to add
  async function getAnswerFromGodmode(userQuestion: string) {
    const url = "https://sathwik2212-backend-api.hf.space/v1/chat/completions";
    const requestData = {
        model: "ultraplinian/fast",
        messages: [{ role: "user", content: userQuestion }],
        stream: false
    };
    
    try {
      const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData)
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      console.error(err);
      return "Error: Could not reach the API. Is your Hugging Face Space running?";
    }
  }

  // This runs when the user clicks Submit
  async function askGodmode() {
      if (!question.trim()) return;
      
      setLoading(true);
      setAnswer("Thinking (Racing 12 models)...");
      
      const finalAnswer = await getAnswerFromGodmode(question);
      
      setAnswer(finalAnswer);
      setLoading(false);
  }

  return (
    <div className="h-full w-full bg-[#09090b] text-[#f4f4f5] p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 mb-2">
            <Rocket className="text-indigo-500 w-6 h-6" />
            G0DM0D3 API Integration
          </h1>
          <p className="text-zinc-400 text-sm">
            This tab is directly connected to your deployed Hugging Face backend.
          </p>
        </div>

        {/* Input Area */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Query the Multi-Model Engine
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askGodmode()}
              className="flex-1 bg-[#09090b] border border-[#27272A] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="e.g. What is the capital of France?"
            />
            <button
              onClick={askGodmode}
              disabled={loading || !question.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              {loading ? 'Racing...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Output Area */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-xl overflow-hidden shadow-sm">
          <div className="bg-[#27272A]/50 px-6 py-3 border-b border-[#27272A]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              API Response
            </h3>
          </div>
          <div className="p-6">
            <div className={`text-sm leading-relaxed ${loading ? 'text-indigo-400 animate-pulse' : 'text-zinc-300'}`}>
              {answer}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
