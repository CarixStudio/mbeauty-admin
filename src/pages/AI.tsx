
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { ChatSession, ChatMessage } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { 
  Send, 
  Bot, 
  Sparkles, 
  Sidebar, 
  ChevronRight, 
  Database, 
  Clock, 
  Zap, 
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  X,
  Loader2,
  Plus,
  MessageSquare,
  Trash2
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Analyze revenue trends for last month",
  "Identify low stock items",
  "Draft a email to VIP customers",
  "Explain the sudden drop in conversion"
];

export const AIPage: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Data State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // UI State
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(window.innerWidth >= 768);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Store Context Cache
  const [storeContext, setStoreContext] = useState<any>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Fetch Sessions
  useEffect(() => {
      fetchSessions();
      gatherStoreContext(); // Pre-fetch context
  }, []);

  // 2. Fetch Messages when Session Changes
  useEffect(() => {
      if (currentSessionId) {
          fetchMessages(currentSessionId);
      } else {
          setMessages([{
              id: 'welcome',
              session_id: 'temp',
              sender: 'ai',
              text: "Hello! I'm Momoh Intelligence. I have full access to your live store data. Start a new conversation or pick up where we left off.",
              created_at: new Date().toISOString()
          }]);
      }
  }, [currentSessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // --- Data Fetching Functions ---

  const fetchSessions = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
          .from('ai_chat_sessions')
          .select('*')
          .order('updated_at', { ascending: false });
      
      if (!error && data) {
          setSessions(data);
          // Auto-select most recent if available and no current selection
          if (data.length > 0 && !currentSessionId) {
              setCurrentSessionId(data[0].id);
          }
      }
  };

  const fetchMessages = async (sessionId: string) => {
      setIsLoadingHistory(true);
      const { data, error } = await supabase
          .from('ai_chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
      
      if (!error && data) {
          setMessages(data);
      }
      setIsLoadingHistory(false);
  };

  const gatherStoreContext = async () => {
      if (!supabase) return;
      
      // Parallel fetch for summary data
      const [ordersRes, productsRes, customersRes, notifRes] = await Promise.all([
          supabase.from('orders').select('total_amount, status, created_at').order('created_at', {ascending: false}).limit(20),
          supabase.from('products').select('name, price, product_variants(inventory_count)').limit(20), // simplified
          supabase.from('customers').select('id', {count: 'exact', head: true}),
          supabase.from('admin_notifications').select('message, type, created_at').order('created_at', {ascending: false}).limit(5)
      ]);

      const lowStock = (productsRes.data || []).filter((p: any) => 
          p.product_variants && p.product_variants.some((v: any) => v.inventory_count < 10)
      ).map((p: any) => p.name);

      const recentRevenue = (ordersRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

      const context = {
          total_customers: customersRes.count,
          recent_revenue_sample: recentRevenue,
          recent_orders_count: ordersRes.data?.length,
          low_stock_items: lowStock,
          recent_alerts: notifRes.data?.map((n: any) => n.message)
      };
      
      setStoreContext(context);
  };

  // --- Action Handlers ---

  const handleCreateSession = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
          .from('ai_chat_sessions')
          .insert({ title: 'New Conversation' })
          .select()
          .single();
      
      if (!error && data) {
          setSessions([data, ...sessions]);
          setCurrentSessionId(data.id);
          addToast('New chat started', 'success');
      }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!await confirm({ title: 'Delete Chat', description: 'Are you sure?', variant: 'danger' })) return;

      const { error } = await supabase.from('ai_chat_sessions').delete().eq('id', id);
      if (!error) {
          setSessions(prev => prev.filter(s => s.id !== id));
          if (currentSessionId === id) setCurrentSessionId(null);
          addToast('Chat deleted', 'success');
      }
  };

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;
    
    // Ensure we have a session
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
        const { data } = await supabase!.from('ai_chat_sessions').insert({ title: text.substring(0, 30) + '...' }).select().single();
        if (data) {
            activeSessionId = data.id;
            setSessions([data, ...sessions]);
            setCurrentSessionId(data.id);
        } else {
            addToast("Failed to start chat session", 'error');
            return;
        }
    }

    setInputValue('');
    setIsTyping(true);

    // 1. Optimistic User Message
    const tempUserMsg: ChatMessage = {
        id: 'temp_user',
        session_id: activeSessionId!,
        sender: 'user',
        text: text,
        created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
        // 2. Save User Message to DB
        await supabase!.from('ai_chat_messages').insert({
            session_id: activeSessionId,
            sender: 'user',
            text: text
        });

        // 3. AI Generation
        const apiKey = import.meta.env.VITE_API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const ai = new GoogleGenAI({ apiKey });
        
        // Refresh context lightly
        await gatherStoreContext();

        const systemInstruction = `You are Momoh Intelligence, the AI for Momoh Beauty Admin.
        You have FULL access to the database context below.
        
        LIVE STORE CONTEXT:
        ${JSON.stringify(storeContext, null, 2)}
        
        Rules:
        - Be concise, professional, and helpful.
        - Use the provided context to answer questions about stock, revenue, etc.
        - If data implies action (e.g. low stock), suggest specific steps.
        - Format with Markdown.
        `;

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text }] }], // Ideally pass history here too
            config: { systemInstruction }
        });

        let fullText = '';
        const tempAiMsgId = 'temp_ai';
        
        // Add placeholder AI message
        setMessages(prev => [...prev, {
            id: tempAiMsgId,
            session_id: activeSessionId!,
            sender: 'ai',
            text: '',
            created_at: new Date().toISOString()
        }]);

        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                setMessages(prev => prev.map(m => m.id === tempAiMsgId ? { ...m, text: fullText } : m));
            }
        }

        // 4. Save AI Message to DB
        await supabase!.from('ai_chat_messages').insert({
            session_id: activeSessionId,
            sender: 'ai',
            text: fullText
        });
        
        // Update session timestamp
        await supabase!.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', activeSessionId);
        
        // Replace temp IDs with real fetch (optional, but cleaner to just let state persist)

    } catch (error: any) {
        console.error("AI Error:", error);
        setMessages(prev => [...prev, {
            id: 'error',
            session_id: activeSessionId!,
            sender: 'ai',
            text: "Error connecting to intelligence network: " + error.message,
            created_at: new Date().toISOString()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-300 relative overflow-hidden">
      
      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <div className={`
          flex-shrink-0 w-64 bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col
          ${isContextOpen ? 'block' : 'hidden md:block'}
      `}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 dark:text-white">History</h3>
              <Button size="sm" variant="ghost" onClick={handleCreateSession}><Plus size={16}/></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => setCurrentSessionId(s.id)}
                    className={`group flex items-center justify-between p-2 rounded-lg text-sm cursor-pointer ${currentSessionId === s.id ? 'bg-brand-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                  >
                      <div className="flex items-center gap-2 truncate">
                          <MessageSquare size={14} />
                          <span className="truncate max-w-[120px]">{s.title}</span>
                      </div>
                      <button onClick={(e) => handleDeleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-300 p-1"><Trash2 size={12}/></button>
                  </div>
              ))}
              {sessions.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">No history yet.</div>}
          </div>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden relative h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-[#262626] z-10 shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary dark:bg-gray-100 flex items-center justify-center text-white dark:text-brand-primary shadow-lg shadow-brand-primary/20">
                 <Sparkles size={16} />
              </div>
              <div>
                 <h2 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Momoh Intelligence</h2>
                 <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></span> Gemini 2.5 Connected
                 </p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
               {/* Quick Actions acting as prompt triggers */}
               <Button size="sm" variant="ghost" onClick={() => handleSendMessage('Run a stock analysis')}>
                   <Zap size={16} className="text-brand-accent"/>
               </Button>
               <Button size="sm" variant="ghost" onClick={() => gatherStoreContext()} title="Refresh Data Context">
                   <RefreshCw size={16} />
               </Button>
           </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 dark:bg-[#1a1a1a] scroll-smooth">
           {isLoadingHistory ? (
               <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-primary"/></div>
           ) : (
               messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 md:gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.sender === 'user' ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600' : 'bg-brand-primary dark:bg-gray-100 border-brand-primary dark:border-gray-100 text-white dark:text-brand-primary'}`}>
                        {msg.sender === 'user' ? <div className="text-xs font-bold">You</div> : <Bot size={16} />}
                     </div>

                     <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div 
                           className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                              msg.sender === 'user' 
                                 ? 'bg-brand-primary text-white dark:text-gray-900 rounded-tr-none' 
                                 : 'bg-white dark:bg-[#333] text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none'
                           }`}
                        >
                           {msg.text}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 ml-1">
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                     </div>
                  </div>
               ))
           )}

           {isTyping && (
              <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-brand-primary dark:bg-gray-100 flex items-center justify-center text-white dark:text-brand-primary shrink-0">
                    <Bot size={16} />
                 </div>
                 <div className="bg-white dark:bg-[#333] border border-gray-100 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                 </div>
              </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Footer Input */}
        <div className="p-4 bg-white dark:bg-[#262626] border-t border-gray-100 dark:border-gray-700 shrink-0">
           {messages.length <= 1 && !isLoadingHistory && (
              <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
                 {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button 
                       key={i}
                       onClick={() => handleSendMessage(prompt)}
                       className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300 hover:bg-brand-light dark:hover:bg-gray-700 hover:border-brand-accent/30 dark:hover:border-brand-accent/30 hover:text-brand-primary dark:hover:text-white transition-all"
                    >
                       {prompt}
                    </button>
                 ))}
              </div>
           )}
           
           <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-[#333] border border-gray-200 dark:border-gray-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-accent/20 focus-within:border-brand-accent transition-all shadow-sm">
              <textarea 
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                 placeholder="Ask Momoh Intelligence..." 
                 className="flex-1 bg-transparent border-none outline-none text-sm p-2 resize-none max-h-32 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                 rows={1}
                 style={{ minHeight: '44px' }}
                 disabled={isTyping}
              />
              <Button 
                 onClick={() => handleSendMessage()} 
                 disabled={!inputValue.trim() || isTyping}
                 className={`mb-1 h-8 w-8 p-0 rounded-lg flex items-center justify-center transition-all ${inputValue.trim() ? 'bg-brand-primary text-white dark:text-gray-900' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}
              >
                 {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
           </div>
        </div>
      </Card>
    </div>
  );
};
