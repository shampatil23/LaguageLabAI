import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mic, MicOff, AlertCircle, ArrowLeft, Bot, User, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Message {
  role: 'ai' | 'user' | 'system';
  text: string;
}

export default function ConversationPractice() {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<Message[]>([
    { role: 'system', text: "You are a helpful airline check-in agent. Keep your responses short and natural for language practice." },
    { role: 'ai', text: "Hello! Welcome to Global Airlines. May I have your ticket and passport, please?" }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage: Message = { role: 'user', text: inputText };
    setConversation(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Map format for groq API
      const messagesForApi = conversation.concat(userMessage).map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi })
      });

      const data = await response.json();
      
      if (response.ok) {
        setConversation(prev => [...prev, { role: 'ai', text: data.result }]);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Airport Check-in Scenario</h1>
            <p className="text-slate-500 mt-1">AI Conversation Practice</p>
          </div>
        </div>
        <Button variant="outline" className="text-danger-600 border-danger-200 hover:bg-danger-50">End Session</Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-sm">
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-center items-center shrink-0">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-success-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm font-medium text-slate-700">AI Agent is ready</span>
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fcfdfd]">
          {conversation.filter(m => m.role !== 'system').map((msg, idx) => (
            <div key={idx} className={cn("flex max-w-2xl gap-4", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm", msg.role === 'ai' ? "bg-primary-100 text-primary-700" : "bg-slate-800 text-white")}>
                {msg.role === 'ai' ? <Bot className="w-5 h-5"/> : <User className="w-5 h-5"/>}
              </div>
              <div className={cn("p-4 rounded-2xl shadow-sm text-sm leading-relaxed", msg.role === 'ai' ? "bg-white border border-slate-200 text-slate-800 rounded-tl-sm" : "bg-primary-600 text-white rounded-tr-sm")}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex max-w-2xl gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5"/>
              </div>
              <div className="p-4 rounded-2xl shadow-sm text-sm leading-relaxed bg-white border border-slate-200 text-slate-800 rounded-tl-sm flex items-center gap-2">
                 <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                 Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <button 
              onClick={() => setIsRecording(!isRecording)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-all shrink-0",
                isRecording 
                  ? "bg-danger-500 hover:bg-danger-600 text-white animate-pulse" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              )}
            >
              {isRecording ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
            </button>

            <div className="flex-1 relative">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-12 flex items-center overflow-hidden"
                placeholder="Type your response or speak..."
              />
            </div>
            
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors disabled:opacity-50 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center mt-3 text-xs text-slate-400 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Type a message or click microphone to simulate speech input.
          </div>
        </div>
      </Card>
    </div>
  );
}
