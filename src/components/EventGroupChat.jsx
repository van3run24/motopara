import React, { useState, useEffect, useRef } from 'react';
import { Send, Camera, Users, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../supabaseService';
import { supabase } from '../supabaseClient';

const EventGroupChat = ({ eventId, eventName, onBack, userData }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [isInChat, setIsInChat] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [eventData, setEventData] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Загрузка чата и сообщений
  useEffect(() => {
    if (!eventId || !userData) return;

    const loadEventChat = async () => {
      try {
        // Загружаем данные события
        const { data: event } = await supabase
          .from('events')
          .select('*, participants_count:event_participants(count)')
          .eq('id', eventId)
          .single();
        
        setEventData(event);

        // Проверяем, состоит ли пользователь в чате
        const inChat = await window.supabaseManager.isUserInEventChat(eventId);
        setIsInChat(inChat);

        if (inChat) {
          // Получаем ID чата
          const chatId = await window.supabaseManager.getEventChatId(eventId);
          setChatId(chatId);

          // Загружаем сообщения
          const messages = await window.supabaseManager.getEventChatMessages(chatId);
          setMessages(messages);
        }
      } catch (error) {
        console.error('Error loading event chat:', error);
      }
    };

    loadEventChat();

    // Подписка на новые сообщения
    const subscription = supabase
      .channel(`event_messages:${eventId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'event_messages',
          filter: `chat_id=eq.${chatId}`
        }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId, userData]);

  // Прокрутка к новым сообщениям
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Группировка сообщений по отправителям
  const groupMessages = (messages) => {
    const grouped = [];
    let lastSender = null;

    messages.forEach((message, index) => {
      const currentSender = message.sender_id;
      const showName = currentSender !== lastSender;
      
      grouped.push({
        ...message,
        showName,
        isOwn: message.sender_id === userData.id
      });
      
      lastSender = currentSender;
    });

    return grouped;
  };

  const handleJoinChat = async () => {
    try {
      setIsJoining(true);
      
      // Проверяем лимит участников (только если указан)
      if (eventData.max_participants && eventData.participants_count >= eventData.max_participants) {
        alert('Достигнут максимальный лимит участников!');
        return;
      }

      const chatId = await window.supabaseManager.joinEventChat(eventId);
      setChatId(chatId);
      setIsInChat(true);
      
      // Добавляем системное сообщение
      const systemMessage = {
        id: Date.now(),
        type: 'system',
        text: `${userData.name} присоединился к чату`,
        created_at: new Date().toISOString(),
        showName: false,
        isOwn: false
      };
      setMessages([systemMessage]);
    } catch (error) {
      console.error('Error joining chat:', error);
      alert('Ошибка при присоединении к чату');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !chatId) return;

    try {
      await window.supabaseManager.sendEventMessage(chatId, messageInput.trim());
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleImageUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0 || !chatId) return;

    try {
      setIsUploading(true);
      const file = e.target.files[0];
      const userId = localStorage.getItem('userId');

      // Сжимаем изображение
      const compressedFile = await compressImage(file, 800, 800, 0.7);
      const fileExt = 'jpg';
      const fileName = `${userId}/event-chat/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Загружаем в storage
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, compressedFile, {
          cacheControl: '86400',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      // Отправляем сообщение с изображением
      await window.supabaseManager.sendEventMessage(chatId, '', 'image', publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const groupedMessages = groupMessages(messages);

  if (!isInChat) {
    return (
      <div className="flex flex-col h-screen bg-zinc-900">
        <div className="flex items-center gap-4 p-4 bg-zinc-800 border-b border-white/10">
          <button onClick={onBack} className="text-zinc-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{eventName}</h2>
            <p className="text-sm text-zinc-400">Групповой чат события</p>
            {eventData && eventData.max_participants && (
              <p className="text-xs text-zinc-500 mt-1">
                Участников: {eventData.participants_count || 0}/{eventData.max_participants}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Users size={64} className="mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-bold text-white mb-2">Групповой чат события</h3>
            <p className="text-zinc-400 mb-6">Присоединитесь к чату, чтобы общаться с другими участниками события</p>
            
            {eventData && eventData.max_participants && eventData.participants_count >= eventData.max_participants ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-full px-6 py-3">
                  <p className="text-zinc-400 text-sm">Все места заняты</p>
                  <p className="text-zinc-500 text-xs mt-1">{eventData.participants_count}/{eventData.max_participants} участников</p>
                </div>
              ) : (
                <button
                  onClick={handleJoinChat}
                  disabled={isJoining}
                  className="bg-orange-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Присоединяемся...
                    </>
                  ) : (
                    <>
                      <Users size={18} />
                      Присоединиться к чату
                    </>
                  )}
                </button>
              )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-zinc-800 border-b border-white/10">
        <button onClick={onBack} className="text-zinc-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{eventName}</h2>
          <p className="text-sm text-zinc-400">Групповой чат события</p>
        </div>
        <Users size={20} className="text-zinc-400" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupedMessages.map((message, index) => (
          <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md ${message.isOwn ? 'order-2' : 'order-1'}`}>
              {message.showName && message.type !== 'system' && (
                <p className={`text-xs font-semibold mb-1 ${message.isOwn ? 'text-right text-orange-400' : 'text-zinc-400'}`}>
                  {message.sender?.name}
                </p>
              )}
              
              {message.type === 'system' ? (
                <div className="text-center text-zinc-500 text-sm py-2">
                  {message.text}
                </div>
              ) : (
                <div className={`rounded-2xl px-4 py-2 ${
                  message.isOwn 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-zinc-800 text-white'
                }`}>
                  {message.type === 'image' ? (
                    <img 
                      src={message.image_url} 
                      alt="Изображение" 
                      className="rounded-lg max-w-full h-auto"
                      style={{ maxHeight: '200px' }}
                    />
                  ) : (
                    <p className="text-sm">{message.text}</p>
                  )}
                </div>
              )}
              
              <p className={`text-xs text-zinc-500 mt-1 ${message.isOwn ? 'text-right' : 'text-left'}`}>
                {new Date(message.created_at).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-zinc-800 border-t border-white/10">
        <div className="flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isUploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-zinc-700 w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-50"
          >
            {isUploading ? (
              <div className="animate-spin w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full" />
            ) : (
              <Camera size={18} />
            )}
          </button>
          
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Написать в групповой чат..."
            className="flex-1 bg-zinc-700 text-white px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-orange-500"
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="bg-orange-600 w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-orange-500"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventGroupChat;
