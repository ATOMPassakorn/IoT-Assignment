"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Send, User, Bot, Wrench, Activity } from "lucide-react";
import { fetchMcpTools, callMcpTool, McpTool } from "../lib/api";
import { matchMcpTool, getQuickActionButtons } from "../lib/chat_helpers";
import { attachLiquidPointerTracker } from "../lib/pointer_engine";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolUsed?: string;
  timestamp: string;
  isError?: boolean;
}

interface AiChatBoxProps {
  onLedChange?: (newStatus: "ON" | "OFF") => void;
}

export default function AiChatBox({ onLedChange }: AiChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your Intelligence IoT Assistant. I communicate directly with physical hardware via the Model Context Protocol (MCP) on Raspberry Pi. You can tap any tool pill below or type a natural language command.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [mcpConnected, setMcpConnected] = useState(false);
  const actionButtons = getQuickActionButtons(tools);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      return attachLiquidPointerTracker(cardRef.current);
    }
  }, []);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  useEffect(() => {
    let isMounted = true;
    const loadTools = async () => {
      try {
        const data = await fetchMcpTools();
        if (isMounted) {
          setTools(data.tools || []);
          setMcpConnected(true);
        }
      } catch {
        if (isMounted) {
          setMcpConnected(false);
        }
      }
    };
    loadTools();
    const interval = setInterval(loadTools, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const executeMcpTool = async (
    toolName: string,
    args: Record<string, unknown>,
    userQuery?: string
  ) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (userQuery) {
      setMessages((prev) => [...prev, { role: "user", content: userQuery, timestamp: time }]);
    }

    setIsProcessing(true);

    try {
      const resp = await callMcpTool(toolName, args);

      if (resp.success && resp.result) {
        if (onLedChange) {
          if (toolName === "control_pi_devices") {
            const actionStr = typeof args.action === "string" ? args.action.toUpperCase() : "";
            if (actionStr === "ON" || actionStr === "OFF") {
              onLedChange(actionStr);
            }
          } else if (toolName === "publish_mqtt_command") {
            const msgStr = typeof args.message === "string" ? args.message.toUpperCase() : "";
            if (msgStr === "ON" || msgStr === "OFF") {
              onLedChange(msgStr);
            }
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: resp.result!,
            toolUsed: `MCP: ${toolName}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `MCP Server Error: ${resp.error || "Execution failed"}`,
            isError: true,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Network error";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Connection error reaching MCP: ${errMsg}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isProcessing) return;

    setInput("");

    const matched = matchMcpTool(query, tools);
    if (matched) {
      executeMcpTool(matched.tool.name, matched.args, query);
    }
  };

  return (
    <div
      ref={cardRef}
      className="apple-liquid-glass liquid-sheen-tracker glass-sheen rounded-3xl h-[480px] w-full relative overflow-hidden flex flex-col transition-all duration-300 shadow-xl"
    >
      {/* Apple Intelligence Chromatic Processing Rim */}
      {isProcessing && (
        <div
          aria-hidden="true"
          className="siri-chromatic-rim"
        />
      )}

      {/* Specular top-edge light catch */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent pointer-events-none z-10" />

      {/* Clean visionOS Header */}
      <div className="px-6 py-4 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between bg-white/20 dark:bg-black/20 backdrop-blur-md relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                MCP Intelligence
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Model Context Protocol (JSON-RPC 2.0)
            </p>
          </div>
        </div>

        <span
          className={`liquid-capsule inline-flex items-center px-3 py-1 text-xs font-semibold ${
            mcpConnected
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
          }`}
        >
          {mcpConnected ? "MCP Protocol Online" : "Connecting..."}
        </span>
      </div>

      {/* Interactive Tool Badges (Click to run) */}
      <div className="px-6 py-2.5 bg-slate-100/40 dark:bg-black/30 border-b border-slate-200/40 dark:border-white/5 flex items-center space-x-2 overflow-x-auto scrollbar-none relative z-10">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 flex-shrink-0">
          <Wrench className="w-3 h-3" />
          <span>Quick Actions:</span>
        </span>
        {actionButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => executeMcpTool(btn.toolName, btn.args, btn.queryText)}
            disabled={isProcessing}
            className={`liquid-capsule px-3 py-1 text-xs font-medium flex items-center space-x-1.5 transition-all flex-shrink-0 cursor-pointer active:scale-95 disabled:opacity-50 ${
              btn.variant === "on"
                ? "text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-200 hover:border-emerald-400/40"
                : btn.variant === "off"
                ? "text-rose-700 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200 hover:border-rose-400/40"
                : "text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-400/40"
            }`}
          >
            {btn.variant === "on" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
            )}
            {btn.variant === "off" && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shadow-sm" />
            )}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-6 overflow-y-auto space-y-4 relative z-10"
      >
        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 ${
              m.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
            }`}
          >
            <div
              className={`p-2 rounded-2xl flex-shrink-0 ${
                m.role === "user"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white/80 dark:bg-white/10 text-purple-600 dark:text-purple-300 border border-slate-200 dark:border-white/10"
              }`}
            >
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600 text-white shadow-md rounded-tr-sm"
                  : m.isError
                  ? "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-tl-sm"
                  : "glass-panel text-slate-800 dark:text-slate-200 rounded-tl-sm"
              }`}
            >
              {m.toolUsed && (
                <div className="mb-1.5 pb-1 border-b border-slate-200/50 dark:border-white/10 flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  <Activity className="w-3 h-3" />
                  <span>{m.toolUsed}</span>
                </div>
              )}
              <div className="whitespace-pre-line">{m.content}</div>
              <div
                className={`text-[10px] mt-1.5 text-right ${
                  m.role === "user" ? "text-blue-100/70" : "text-slate-400"
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-2xl bg-white/80 dark:bg-white/10 text-purple-600 dark:text-purple-300 border border-slate-200 dark:border-white/10">
              <Sparkles className="w-4 h-4 animate-spin text-purple-500" />
            </div>
            <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              <span>Invoking MCP hardware protocol on Raspberry Pi...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-slate-100/50 dark:bg-black/20 border-t border-slate-200/50 dark:border-white/10 flex items-center space-x-2 relative z-10"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Siri: 'Turn ON LED', 'Turn OFF LED', 'Read sensors'..."
          disabled={isProcessing}
          className="flex-1 bg-white/70 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 rounded-full px-5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          aria-label="Send message"
          className="p-2.5 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
