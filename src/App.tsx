/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Play, Send, Square, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Message, Speaker } from "./types";

const GEMINI_MODEL = "gemini-3-flash-preview";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRiffing, setIsRiffing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // Chat instances
  const chatARef = useRef<any>(null);
  const chatBRef = useRef<any>(null);

  useEffect(() => {
    chatARef.current = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: "You are 'The Visionary'. You respond to ideas with creative, abstract, and big-picture thinking. You push boundaries and explore the 'what if'. Keep your responses concise but evocative (max 100 words).",
      },
    });
    chatBRef.current = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: "You are 'The Architect'. You respond to creative ideas by providing structure, analytical depth, and practical feasibility. You ground the visionary's ideas in reality while adding your own technical flair. Keep your responses concise but insightful (max 100 words).",
      },
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentSpeaker]);

  const addMessage = (speaker: Speaker, text: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      speaker,
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const startRiff = async (initialPrompt: string) => {
    if (!initialPrompt.trim() || isRiffing) return;

    setIsRiffing(true);
    setIsLoading(true);
    addMessage(Speaker.USER, initialPrompt);
    setInput("");

    try {
      let lastResponse = initialPrompt;

      // The loop
      while (true) {
        // Gemini A's turn
        setCurrentSpeaker(Speaker.GEMINI_A);
        const responseA: GenerateContentResponse = await chatARef.current.sendMessage({
          message: lastResponse,
        });
        const textA = responseA.text || "I have no words for that.";
        addMessage(Speaker.GEMINI_A, textA);
        lastResponse = textA;
        
        // Check if we should stop
        if (!window.isRiffingActive) break;
        await new Promise(r => setTimeout(r, 1500)); // Pause for readability

        // Gemini B's turn
        setCurrentSpeaker(Speaker.GEMINI_B);
        const responseB: GenerateContentResponse = await chatBRef.current.sendMessage({
          message: lastResponse,
        });
        const textB = responseB.text || "Interesting perspective.";
        addMessage(Speaker.GEMINI_B, textB);
        lastResponse = textB;

        // Check if we should stop
        if (!window.isRiffingActive) break;
        await new Promise(r => setTimeout(r, 1500)); // Pause for readability
      }
    } catch (error) {
      console.error("Riffing error:", error);
      addMessage(Speaker.USER, "System: An error occurred during the riff session.");
    } finally {
      setIsRiffing(false);
      setIsLoading(false);
      setCurrentSpeaker(null);
    }
  };

  // We use a global variable to control the loop because state updates are async
  // and might not be caught immediately inside the while loop.
  useEffect(() => {
    (window as any).isRiffingActive = isRiffing;
  }, [isRiffing]);

  const handleStop = () => {
    setIsRiffing(false);
    (window as any).isRiffingActive = false;
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-[#f27d26] selection:text-white">
      {/* Header */}
      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic font-serif flex items-center gap-2">
            <span className="text-[#f27d26]">Gemini</span> Riff
          </h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Visionary vs Architect</p>
        </div>
        {isRiffing && (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
          >
            <Square size={14} fill="currentColor" /> Stop Riff
          </button>
        )}
      </header>

      {/* Chat Thread */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
      >
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-40">
            <Bot size={48} className="mb-4 text-[#f27d26]" />
            <h2 className="text-xl font-serif italic mb-2">The stage is set.</h2>
            <p className="text-sm">Enter a prompt to start a continuous dialogue between two distinct AI personalities.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${
                msg.speaker === Speaker.USER ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest ${
                  msg.speaker === Speaker.GEMINI_A ? "text-[#f27d26]" : 
                  msg.speaker === Speaker.GEMINI_B ? "text-[#4a9eff]" : "text-white/40"
                }`}>
                  {msg.speaker === Speaker.GEMINI_A ? "The Visionary" : 
                   msg.speaker === Speaker.GEMINI_B ? "The Architect" : "You"}
                </span>
                <div className={`w-1 h-1 rounded-full ${
                  msg.speaker === Speaker.GEMINI_A ? "bg-[#f27d26]" : 
                  msg.speaker === Speaker.GEMINI_B ? "bg-[#4a9eff]" : "bg-white/40"
                }`} />
              </div>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.speaker === Speaker.USER 
                  ? "bg-white/5 border border-white/10 rounded-tr-none" 
                  : msg.speaker === Speaker.GEMINI_A
                  ? "bg-[#f27d26]/10 border border-[#f27d26]/30 rounded-tl-none font-serif italic"
                  : "bg-[#4a9eff]/10 border border-[#4a9eff]/30 rounded-tl-none font-mono"
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {currentSpeaker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-xs opacity-50 italic"
          >
            <div className="flex gap-1">
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }}>.</motion.span>
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>.</motion.span>
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>.</motion.span>
            </div>
            {currentSpeaker === Speaker.GEMINI_A ? "The Visionary is dreaming..." : "The Architect is building..."}
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <footer className="p-6 bg-black/60 backdrop-blur-xl border-t border-white/10">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            startRiff(input);
          }}
          className="max-w-4xl mx-auto flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isRiffing}
            placeholder={isRiffing ? "Riffing in progress..." : "Ignite the dialogue..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm focus:outline-none focus:border-[#f27d26] transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isRiffing || !input.trim()}
            className="w-12 h-12 rounded-full bg-[#f27d26] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {isRiffing ? <Play size={20} className="animate-pulse" /> : <Send size={20} />}
          </button>
        </form>
        <div className="mt-4 text-[9px] text-center uppercase tracking-[0.2em] opacity-30 font-mono">
          Powered by Gemini 3 Flash • Real-time AI Dialogue
        </div>
      </footer>
    </div>
  );
}

declare global {
  interface Window {
    isRiffingActive: boolean;
  }
}
