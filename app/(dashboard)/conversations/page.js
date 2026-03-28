'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Instagram, Globe, Bot, User, Search, Send, Facebook, AlertCircle } from 'lucide-react';
import { getConversations, updateConversationStatus } from '@/app/actions/conversations';
import { sendOutboundMessage } from '@/app/actions/channels';

const channelFilters = ['All', 'WhatsApp', 'Instagram', 'Facebook', 'Website'];

const channelIcons = { WhatsApp: MessageSquare, Instagram, Facebook, Website: Globe };
const channelColors = {
  WhatsApp: 'text-success bg-success-light',
  Instagram: 'text-pink bg-pink-light',
  Facebook: 'text-blue-700 bg-blue-500/10',
  Website: 'text-teal bg-teal-light',
};
const statusColors = {
  'AI Handled': 'bg-success-light text-success',
  'Needs Human': 'bg-warning-light text-warning',
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [channelFilter, setChannelFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    getConversations().then(res => {
      if (res.success) {
        setConversations(res.data);
        if (res.data.length > 0) setSelectedConvo(res.data[0]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvo?.messages]);

  const filtered = conversations.filter(c =>
    (channelFilter === 'All' || c.channel === channelFilter) &&
    c.customer.toLowerCase().includes(search.toLowerCase())
  );

  const [sendError, setSendError] = useState('');

  const handleSend = async () => {
    if (!message.trim() || !selectedConvo) return;
    setSending(true);
    setSendError('');
    const res = await sendOutboundMessage(selectedConvo.id, message.trim());
    if (res.success) {
      if (!res.platformDelivered && res.platformError) {
        setSendError(`Message saved but delivery failed: ${res.platformError}`);
      }
      // Refresh conversations
      const updated = await getConversations();
      if (updated.success) {
        setConversations(updated.data);
        const fresh = updated.data.find(c => c.id === selectedConvo.id);
        if (fresh) setSelectedConvo(fresh);
      }
      setMessage('');
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleMarkHuman = async (convoId) => {
    await updateConversationStatus(convoId, 'Needs Human');
    const updated = await getConversations();
    if (updated.success) {
      setConversations(updated.data);
      const fresh = updated.data.find(c => c.id === selectedConvo?.id);
      if (fresh) setSelectedConvo(fresh);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-surface rounded-lg mb-4" />
        <div className="glass-card h-[calc(100vh-220px)]" />
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
        <p className="text-sm text-muted mt-1">AI-powered customer chat across all channels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 glass-card overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Conversation List */}
        <div className="border-r border-border flex flex-col">
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="text" placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface rounded-xl border border-border text-sm" />
            </div>
            <div className="flex gap-1">
              {channelFilters.map(f => (
                <button key={f} onClick={() => setChannelFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${channelFilter === f ? 'bg-accent text-white' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}>{f}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted text-sm">No conversations found</div>
            ) : filtered.map(convo => {
              const ChannelIcon = channelIcons[convo.channel];
              const isSelected = selectedConvo?.id === convo.id;
              const lastMsg = convo.messages[convo.messages.length - 1];
              return (
                <div key={convo.id} onClick={() => setSelectedConvo(convo)}
                  className={`flex items-start gap-3 p-4 cursor-pointer border-b border-border transition-colors ${
                    isSelected ? 'bg-accent/5 border-l-2 border-l-accent' : 'hover:bg-surface-hover border-l-2 border-l-transparent'
                  }`}>
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent flex-shrink-0">
                    {convo.customer.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{convo.customer}</p>
                      <span className="text-[10px] text-muted flex-shrink-0">{convo.date}</span>
                    </div>
                    <p className="text-xs text-muted truncate mb-1.5">{lastMsg?.text?.slice(0, 55)}...</p>
                    <div className="flex items-center gap-2">
                      {ChannelIcon && (
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${channelColors[convo.channel]}`}>
                          <ChannelIcon className="w-3 h-3" />
                        </div>
                      )}
                      <span className={`badge text-[10px] ${statusColors[convo.status]}`}>{convo.status}</span>
                      {convo.unread > 0 && (
                        <span className="ml-auto w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">{convo.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 flex flex-col">
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent">
                    {selectedConvo.customer.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{selectedConvo.customer}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">via {selectedConvo.channel}</span>
                      <span className={`badge text-[10px] ${statusColors[selectedConvo.status]}`}>{selectedConvo.status}</span>
                    </div>
                  </div>
                </div>
                {selectedConvo.status !== 'Needs Human' && (
                  <button onClick={() => handleMarkHuman(selectedConvo.id)}
                    className="text-xs text-warning font-medium px-3 py-1.5 rounded-lg bg-warning-light hover:bg-warning/20 transition-colors">
                    Escalate to Human
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selectedConvo.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.from !== 'customer' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.from === 'bot' ? 'bg-accent/20' : msg.from === 'staff' ? 'bg-info/20' : 'bg-teal-light'
                    }`}>
                      {msg.from === 'bot' ? <Bot className="w-4 h-4 text-accent" /> :
                       msg.from === 'staff' ? <User className="w-4 h-4 text-info" /> :
                       <User className="w-4 h-4 text-teal" />}
                    </div>
                    <div className={`max-w-[75%] ${msg.from !== 'customer' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-3.5 rounded-2xl text-sm leading-relaxed ${
                        msg.from !== 'customer'
                          ? 'bg-accent/10 border border-accent/20 text-foreground rounded-tr-md'
                          : 'bg-surface border border-border text-foreground rounded-tl-md'
                      }`}>
                        <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                      </div>
                      <p className={`text-[10px] text-muted mt-1 ${msg.from !== 'customer' ? 'text-right' : ''}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="px-5 py-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <textarea
                    rows={1}
                    placeholder="Type a reply... (Enter to send, Shift+Enter for new line)"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 py-2.5 px-4 bg-surface rounded-xl border border-border text-sm resize-none focus:outline-none focus:border-accent/50"
                    style={{ maxHeight: '100px', overflowY: 'auto' }}
                  />
                  <button onClick={handleSend} disabled={!message.trim() || sending}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {sendError && (
                  <p className="text-[10px] text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {sendError}
                  </p>
                )}
                <p className="text-[10px] text-muted mt-2 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> AI is actively monitoring · Replying via {selectedConvo.channel}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a conversation to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
