import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, Sparkles, User, Brain, AlertCircle, RefreshCw 
} from 'lucide-react';
import { BrainItem } from '../types';

interface BrainChatProps {
  items: BrainItem[];
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function BrainChat({ items, isOpen, onClose }: BrainChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      text: "Hello! I am AMBIT, your External Brain Assistant. I have indexed your captured thoughts, tasks, habits, and journals. Ask me anything, or tell me to synthesize or find something!" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat history
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    // Append user message
    const updatedMessages = [...messages, { role: 'user', text: userText } as ChatMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          items: items // Send database context for Gemini
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with the External Brain API.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'assistant', text: data.text || "I processed that concept but didn't output a text result. Ask me to list your items or tags." }]);
    } catch (err: any) {
      console.error("Brain Chat Error:", err);
      setError(err.message || "An unexpected error occurred during semantic recall.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      { 
        role: 'assistant', 
        text: "External Brain index refreshed. Ask me any question about your captured ideas or planned tasks!" 
      }
    ]);
    setError(null);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 bg-surface shadow-2xl border-l border-border flex flex-col justify-between animate-fade-in">
      {/* Chat Header */}
      <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-pill-active text-pill-active-text rounded-xl">
            <Brain size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-textPrimary font-headline">Ask My Brain</h3>
            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-ping" />
              Gemini Core Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearChat}
            className="p-2 hover:bg-surfaceSecondary rounded-lg text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            title="Clear chat history"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surfaceSecondary rounded-lg text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Database Quick Stats bar */}
      <div className="px-5 py-2.5 bg-surfaceSecondary/50 border-b border-border flex items-center justify-between text-[10px] text-textSecondary font-semibold">
        <span>KNOWLEDGE BASE CONTEXT</span>
        <span>{items.length} items parsed</span>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-background">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';

          return (
            <div 
              key={index} 
              className={`flex gap-3 max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-border ${
                isUser ? 'bg-surfaceSecondary text-textPrimary' : 'bg-pill-active text-pill-active-text'
              }`}>
                {isUser ? <User size={14} /> : <Sparkles size={14} className="text-yellow-400" />}
              </div>

              {/* Message Bubble */}
              <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                isUser 
                  ? 'bg-pill-active text-pill-active-text border-pill-active rounded-tr-none' 
                  : 'bg-surface text-textPrimary border-border rounded-tl-none canvas-shadow'
              }`}>
                {/* Format markdown or text split by lists */}
                <p className="whitespace-pre-line font-medium">{msg.text}</p>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-pill-active text-pill-active-text flex items-center justify-center border border-border">
              <Sparkles size={14} className="animate-spin text-yellow-400" />
            </div>
            <div className="p-4 bg-surface text-textSecondary border border-border rounded-2xl rounded-tl-none canvas-shadow text-xs font-semibold flex items-center gap-2">
              <span>AMBIT is scanning memory indexes...</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-[#ba1a1a] dark:text-red-300 rounded-xl text-xs font-semibold flex items-start gap-2 border border-red-200 dark:border-red-900/20">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error retrieving brain data</p>
              <p className="text-[10px] opacity-80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-surface">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search, filter, or chat about your thoughts..."
            className="w-full bg-surfaceSecondary border border-border focus:ring-1 focus:ring-accent text-xs pl-4 pr-12 py-3 rounded-xl placeholder:text-textMuted text-textPrimary outline-none font-semibold"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-1.5 p-2 bg-pill-active text-pill-active-text rounded-lg hover:opacity-90 transition-all cursor-pointer ${
              (!input.trim() || isLoading) ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[9px] text-textSecondary text-center mt-2.5 font-medium">
          Powered by Gemini 2.5 Flash. Fully private context.
        </p>
      </form>
    </div>
  );
}
