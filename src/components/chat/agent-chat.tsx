'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useSmartPoll } from '@/hooks/use-smart-poll';
import { timeAgo } from '@/lib/utils';
import { MessageBubble } from './message-bubble';
import type { ChatMessage, ChatConversation } from '@/types';

const AGENTS = [
  { id: 'hermes', name: 'Hermes', emoji: '\u{1F3DB}\u{FE0F}', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'apollo', name: 'Apollo', emoji: '\u{1F3AF}', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
];

function isGroupedWithPrevious(messages: ChatMessage[], index: number): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  return (
    prev.from_agent === curr.from_agent &&
    curr.created_at - prev.created_at < 120 &&
    prev.message_type !== 'system' &&
    curr.message_type !== 'system'
  );
}

function formatDateGroup(ts: number): string {
  const date = new Date(ts * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function AgentChat() {
  // Sync session transcripts on mount
  useEffect(() => {
    fetch('/api/chat/sync-sessions', { method: 'POST' }).catch(() => {});
  }, []);

  const [expanded, setExpanded] = useState(true);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingIdRef = useRef(-1);

  // Poll conversations
  const { data: conversations } = useSmartPoll<ChatConversation[]>(
    () => fetch('/api/chat/conversations').then(r => r.json()).then(d => d.conversations || []),
    { interval: 15_000, enabled: expanded },
  );

  // Load messages when conversation changes
  const loadMessages = useCallback(async () => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/chat/messages?conversation_id=${encodeURIComponent(activeConv)}&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [activeConv]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Poll for new messages
  useSmartPoll(loadMessages, { interval: 10_000, enabled: !!activeConv && expanded });

  // Auto-scroll on new messages
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll to bottom on conversation change
  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [activeConv]);

  // Send message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeConv || sending) return;

    // Determine recipient from conversation or @mention
    const mentionMatch = text.match(/^@(\w+)\s/);
    let to = mentionMatch ? mentionMatch[1] : null;
    const cleanContent = mentionMatch ? text.slice(mentionMatch[0].length) : text;

    if (!to && activeConv.startsWith('agent_')) {
      to = activeConv.replace('agent_', '');
    }

    // Optimistic update
    pendingIdRef.current -= 1;
    const tempId = pendingIdRef.current;
    const optimistic: ChatMessage = {
      id: tempId,
      conversation_id: activeConv,
      from_agent: 'nyk',
      to_agent: to,
      content: cleanContent,
      message_type: 'text',
      metadata: null,
      read_at: null,
      created_at: Math.floor(Date.now() / 1000),
      pendingStatus: 'sending',
    };

    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'nyk',
          to,
          content: cleanContent,
          conversation_id: activeConv,
          message_type: 'text',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
        }
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pendingStatus: 'failed' as const } : m));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pendingStatus: 'failed' as const } : m));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Start a new conversation
  const startConversation = (agentId: string) => {
    setActiveConv(`agent_${agentId}`);
  };

  // Group messages by date
  const dateGroups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const d = formatDateGroup(msg.created_at);
    if (d !== currentDate) {
      currentDate = d;
      dateGroups.push({ date: d, messages: [] });
    }
    dateGroups[dateGroups.length - 1].messages.push(msg);
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageCircle size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">Agent Chat</h3>
            <p className="text-[11px] text-muted-foreground">
              {conversations?.length || 0} conversations
              {conversations?.some(c => c.unread_count > 0)
                ? ` · ${conversations.filter(c => c.unread_count > 0).reduce((a, c) => a + c.unread_count, 0)} unread`
                : ''}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/30 flex" style={{ height: '480px' }}>
          {/* Sidebar */}
          <div className="w-48 border-r border-border/30 flex flex-col shrink-0">
            {/* Quick start buttons */}
            <div className="p-2 border-b border-border/20 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2 mb-1">Chat with</div>
              {AGENTS.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => startConversation(agent.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    activeConv === `agent_${agent.id}` ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <span>{agent.emoji}</span>
                  <span className="font-medium">{agent.name}</span>
                </button>
              ))}
              <button
                onClick={() => setActiveConv('hermes_apollo')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  activeConv === 'hermes_apollo' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
                }`}
              >
                <Users size={14} />
                <span className="font-medium">Team Chat</span>
              </button>
            </div>

            {/* Existing conversations */}
            <div className="flex-1 overflow-y-auto">
              {conversations && conversations.length > 0 ? (
                conversations.map(conv => {
                  const isActive = activeConv === conv.id;
                  const agentName = conv.id.replace('agent_', '');
                  const agent = AGENTS.find(a => a.id === agentName);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConv(conv.id)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${
                        isActive ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/30 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">
                          {agent ? `${agent.emoji} ${agent.name}` : conv.id}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {conv.unread_count > 0 && (
                            <span className="bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                              {conv.unread_count}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/40">
                            {conv.last_message_at ? timeAgo(new Date(conv.last_message_at * 1000).toISOString()) : ''}
                          </span>
                        </div>
                      </div>
                      {conv.last_message && (
                        <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                          {conv.last_message.from_agent === 'nyk'
                            ? `You: ${conv.last_message.content}`
                            : conv.last_message.content}
                        </p>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-[11px] text-muted-foreground/50 text-center">
                  No conversations yet
                </div>
              )}
            </div>
          </div>

          {/* Message area */}
          <div className="flex-1 flex flex-col min-w-0">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <MessageCircle size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Select a conversation</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">or start a new one</p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="px-4 py-2 border-b border-border/30 flex items-center gap-2 shrink-0">
                  {activeConv === 'hermes_apollo' ? (
                    <>
                      <Users size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium">Hermes + Apollo</span>
                      <span className="text-[10px] text-muted-foreground">Team conversation</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">{AGENTS.find(a => `agent_${a.id}` === activeConv)?.emoji || ''}</span>
                      <span className="text-sm font-medium">{activeConv.replace('agent_', '')}</span>
                    </>
                  )}
                </div>

                {/* Messages */}
                <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-muted-foreground/50">No messages yet. Send one to get started.</p>
                    </div>
                  ) : (
                    dateGroups.map(group => (
                      <div key={group.date}>
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{group.date}</span>
                          <div className="flex-1 h-px bg-border/50" />
                        </div>
                        {group.messages.map((msg, idx) => (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isHuman={msg.from_agent === 'nyk' || msg.from_agent === 'human'}
                            isGrouped={isGroupedWithPrevious(group.messages, idx)}
                          />
                        ))}
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border/30 p-3 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${activeConv === 'hermes_apollo' ? 'team' : activeConv.replace('agent_', '')}...`}
                      rows={1}
                      className="flex-1 resize-none bg-muted/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                      style={{ maxHeight: '100px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
