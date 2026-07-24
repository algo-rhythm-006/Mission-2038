"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import io from "socket.io-client";
import { Send, User, MessageSquare, ShieldCheck, Loader } from "lucide-react";

export default function PlayerMessages() {
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState("");

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket and load active chat lists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setCurrentUser(parsed);
        
        // Connect to Socket.io backend
        const SOCKET_URL = "http://localhost:5000";
        socketRef.current = io(SOCKET_URL);
        
        // Join personal user notification channel
        socketRef.current.emit("join_user", parsed.id);

        // Listen for chats list updates
        socketRef.current.on("chat_list_update", () => {
          loadChatThreads();
        });

        // Listen for typing notifications
        socketRef.current.on("typing_status", (data) => {
          if (data.isTyping) {
            setPartnerTyping(`${data.userName} is typing...`);
          } else {
            setPartnerTyping("");
          }
        });
      }
    }

    loadChatThreads();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Handle messages receiving from selected chat room
  useEffect(() => {
    if (!socketRef.current || !selectedChat) return;

    socketRef.current.on("receive_message", (msg) => {
      if (msg.chat === selectedChat._id) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();

        // Mark message as read
        socketRef.current.emit("mark_seen", {
          chatId: selectedChat._id,
          userId: currentUser?.id
        });
      }
    });

    socketRef.current.on("marked_seen_status", (data) => {
      if (data.chatId === selectedChat._id) {
        setMessages(prev => prev.map(m => m.sender !== currentUser?.id ? { ...m, seen: true } : m));
      }
    });

    return () => {
      socketRef.current.off("receive_message");
      socketRef.current.off("marked_seen_status");
    };
  }, [selectedChat, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatThreads = () => {
    setLoadingChats(true);
    api.get("/social/chats")
      .then(res => {
        setChats(res);
        setLoadingChats(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingChats(false);
      });
  };

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    setLoadingMessages(true);
    setMessages([]);
    setPartnerTyping("");

    // Join room
    if (socketRef.current) {
      socketRef.current.emit("join_chat", chat._id);
      
      // Mark existing messages as read
      socketRef.current.emit("mark_seen", {
        chatId: chat._id,
        userId: currentUser?.id
      });
    }

    try {
      const msgs = await api.get(`/social/chats/${chat._id}/messages`);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim() || !selectedChat) return;

    const messagePayload = {
      chatId: selectedChat._id,
      senderId: currentUser?.id,
      text: newMessageText
    };

    // Emit message to Socket Server
    if (socketRef.current) {
      socketRef.current.emit("send_message", messagePayload);
      
      // Send typing status false
      socketRef.current.emit("typing", {
        chatId: selectedChat._id,
        userId: currentUser?.id,
        userName: "Someone",
        isTyping: false
      });
    }

    setNewMessageText("");
    setIsTyping(false);
  };

  // Emit typing updates
  const handleTyping = (e) => {
    setNewMessageText(e.target.value);
    if (!isTyping && socketRef.current && selectedChat) {
      setIsTyping(true);
      socketRef.current.emit("typing", {
        chatId: selectedChat._id,
        userId: currentUser?.id,
        userName: "Player",
        isTyping: true
      });
    }

    // Reset typing timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socketRef.current && selectedChat) {
        socketRef.current.emit("typing", {
          chatId: selectedChat._id,
          userId: currentUser?.id,
          userName: "Player",
          isTyping: false
        });
      }
    }, 2000);
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto h-[78vh] flex gap-8">
        {/* CHATS LIST SIDEBAR */}
        <div className="w-80 bg-zinc-900/30 border border-zinc-805 rounded-3xl p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-3">
              Conversations
            </h3>

            {loadingChats ? (
              <div className="text-center py-10 space-y-3">
                <Loader className="w-5 h-5 animate-spin text-yellow-400 mx-auto" />
                <span className="text-xs text-zinc-500 font-bold uppercase">Loading Threads...</span>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">
                No active conversations yet. Scouts will message you when you stand out!
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {chats.map((c) => {
                  const otherProfile = c.otherProfile || {};
                  const active = selectedChat?._id === c._id;
                  
                  return (
                    <div
                      key={c._id}
                      onClick={() => handleSelectChat(c)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                        active
                          ? "bg-yellow-400/10 border-yellow-400/80 text-yellow-400"
                          : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-805 border border-zinc-800 shrink-0">
                        <img 
                          src={otherProfile.profilePhoto || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150"} 
                          alt="Partner" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="truncate flex-1">
                        <h4 className="font-bold text-xs truncate text-white flex items-center gap-1">
                          {otherProfile.name || c.otherUser?.email.split('@')[0]}
                          {otherProfile.verifiedBadge && <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                        </h4>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{c.lastMessage}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MESSAGING BOX */}
        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl relative">
          {selectedChat ? (
            <>
              {/* Header */}
              <div className="flex justify-between items-center bg-zinc-900/20 px-6 py-4 border-b border-zinc-850">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                    <img 
                      src={selectedChat.otherProfile?.profilePhoto || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150"} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1">
                      {selectedChat.otherProfile?.name || selectedChat.otherUser?.email.split('@')[0]}
                      {selectedChat.otherProfile?.verifiedBadge && <ShieldCheck className="w-4 h-4 text-blue-400" />}
                    </h4>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">
                      {selectedChat.otherUser?.role} {partnerTyping && `• ${partnerTyping}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-zinc-950/20 scrollbar-thin">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOwn = m.sender === currentUser?.id;
                    return (
                      <div key={m._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isOwn 
                            ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold rounded-tr-none" 
                            : "bg-zinc-905 border border-zinc-850 text-zinc-350 rounded-tl-none"
                        }`}>
                          <p>{m.text}</p>
                          <span className={`block text-[8px] mt-1 text-right font-black uppercase ${isOwn ? "text-black/60" : "text-zinc-500"}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-850 bg-zinc-900/10 flex items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder="Type your message..."
                  value={newMessageText}
                  onChange={handleTyping}
                  className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-yellow-400 focus:outline-none rounded-xl p-4 text-xs text-white"
                />
                <button type="submit" className="p-4 bg-yellow-400 hover:bg-yellow-500 rounded-xl text-black transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-600 text-center space-y-4">
              <MessageSquare className="w-16 h-16 stroke-1" />
              <div>
                <h4 className="text-white font-bold text-sm uppercase tracking-wider">Select a conversation</h4>
                <p className="text-zinc-500 text-xs mt-1">Review inquiries and messages from scouts here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
