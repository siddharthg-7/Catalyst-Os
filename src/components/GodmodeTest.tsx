import React, { useState } from 'react';
import { Rocket } from 'lucide-react';

export default function GodmodeTest() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('Waiting for question...');
  const [loading, setLoading] = useState(false);

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

  async function askGodmode() {
      if (!question.trim()) return;
      
      setLoading(true);
      setAnswer("Thinking (Racing 12 models)...");
      
      const finalAnswer = await getAnswerFromGodmode(question);
      
      setAnswer(finalAnswer);
      setLoading(false);
  }

  return (
    <div className="h-full w-full bg-[#F3F0EE] text-[#141413] p-8 overflow-y-auto font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 mb-2 text-[#141413]">
            <Rocket className="text-[#141413] w-6 h-6" />
            G0DM0D3 API Integration
          </h1>
          <p className="text-[#696969] text-sm">
            This tab is directly connected to your deployed Hugging Face backend.
          </p>
        </div>

        {/* Input Area */}
        <div className="bg-white border border-[#141413]/10 rounded-[20px] p-6 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <label className="block text-sm font-bold text-[#141413] mb-2 font-mono uppercase tracking-wider text-[10px]">
            Query the Multi-Model Engine
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askGodmode()}
              className="flex-1 bg-white border border-[#141413]/20 rounded-[12px] px-4 py-2.5 text-sm text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all font-sans"
              placeholder="e.g. What is the capital of France?"
            />
            <button
              onClick={askGodmode}
              disabled={loading || !question.trim()}
              className="bg-[#141413] hover:bg-[#262627] disabled:opacity-50 disabled:cursor-not-allowed text-[#F3F0EE] px-6 py-2.5 rounded-[20px] text-xs font-bold transition-all whitespace-nowrap font-sans cursor-pointer"
            >
              {loading ? 'Racing...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Output Area */}
        <div className="bg-white border border-[#141413]/10 rounded-[20px] overflow-hidden shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="bg-[#F3F0EE] px-6 py-3 border-b border-[#141413]/10">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#696969] font-mono">
              API Response
            </h3>
          </div>
          <div className="p-6">
            <div className={`text-sm leading-relaxed ${loading ? 'text-[#141413]/60 animate-pulse' : 'text-[#141413]'}`}>
              {answer}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
