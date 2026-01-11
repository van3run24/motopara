import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Gauge, Music, Shield, Target } from 'lucide-react';

const SupabaseManager = ({ userData, onUsersLoaded, onChatsLoaded, onEventsLoaded }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const typingChannelsRef = useRef({});

  // Получение геолокации пользователя
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 минут
        }
      );
    });
  };

  // Обновление геолокации пользователя
  const updateUserLocation = async () => {
    try {
      const location = await getUserLocation();
      const userId = localStorage.getItem('userId');
      
      if (userId) {
        const { error } = await supabase
          .from('users')
          .update({
            latitude: location.latitude,
            longitude: location.longitude,
            location_updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  // Загрузка пользователей для поиска
  const loadUsers = async () => {
    if (!userData) return;
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .neq('email', userData.email)
        .eq('city', userData.city)
        .eq('gender', userData.gender === 'male' ? 'female' : 'male');
      
      if (error) throw error;
      
      // Получаем чаты чтобы исключить уже знакомых
      const { data: chats } = await supabase
        .from('chats')
        .select('*')
        .or(`participant_1_id.eq.${localStorage.getItem('userId')},participant_2_id.eq.${localStorage.getItem('userId')}`);
      
      const matchedIds = chats?.map(chat => 
        chat.participant_1_id === localStorage.getItem('userId') ? chat.participant_2_id : chat.participant_1_id
      ) || [];
      
      // Получаем лайки/дизлайки
      const userId = localStorage.getItem('userId');
      const { data: likes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userId);

      const swipedIds = likes?.map(like => like.to_user_id) || [];
      const excludeIds = [...matchedIds, ...swipedIds];

      const filteredUsers = users.filter(user => !excludeIds.includes(user.id))
        .map(u => {
           const coords = u.coords || { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 };
           
           let interests = u.interests;
           
           // Handle case where interests might be a JSON string
           if (typeof interests === 'string') {
             try {
               interests = JSON.parse(interests);
             } catch (e) {
               console.error('Error parsing interests:', e);
               interests = null;
             }
           }

           if (!interests || !Array.isArray(interests)) {
              interests = [
                { id: 'style', label: 'Стиль', value: u.temp || 'Спорт', icon: 'Gauge' },
                { id: 'music', label: 'Музыка', value: u.music || 'Rock', icon: 'Music' },
                { id: 'equip', label: 'Экип', value: u.equip || 'Full', icon: 'Shield' },
                { id: 'goal', label: 'Цель', value: u.goal || 'Катка', icon: 'Target' }
              ];
           }
           
           const interestsWithIcons = interests.map(i => ({
             ...i,
             icon: i.icon === 'Gauge' ? <Gauge size={14} /> :
                   i.icon === 'Music' ? <Music size={14} /> :
                   i.icon === 'Shield' ? <Shield size={14} /> :
                   i.icon === 'Target' ? <Target size={14} /> :
                   <Gauge size={14} />
           }));

           return {
             ...u,
             coords,
             images: u.images || (u.image ? [u.image] : []),
             interests: interestsWithIcons,
             about: u.about // Ensure about is passed
           };
        });
      onUsersLoaded(filteredUsers);
      
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message);
    }
  };

  // Загрузка чатов
  const loadChats = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          participant_1:participant_1_id(name, image, location_updated_at),
          participant_2:participant_2_id(name, image, location_updated_at)
        `)
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
      
      if (error) throw error;
      
      // Загружаем сообщения для каждого чата
      const chatsWithMessages = await Promise.all(
        chats.map(async (chat) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });
          
          const partner = chat.participant_1_id === userId ? chat.participant_2 : chat.participant_1;
          const isOnline = partner?.location_updated_at && (new Date() - new Date(partner.location_updated_at) < 15 * 60 * 1000);

          return {
            ...chat,
            messages: messages?.map(m => ({
              ...m,
              sender: m.sender_id === userId ? 'me' : 'other'
            })) || [],
            name: partner?.name || 'Неизвестный пользователь',
            image: partner?.image || null,
            online: isOnline,
            partnerId: partner ? (chat.participant_1_id === userId ? chat.participant_2_id : chat.participant_1_id) : null,
            lastMessage: messages?.[messages.length - 1]?.text || 'Начните общение',
            time: messages?.[messages.length - 1]?.created_at ? 
              new Date(messages[messages.length - 1].created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) :
              '',
            unreadCount: messages?.filter(m => m.sender_id !== userId && !m.is_read).length || 0
          };
        })
      );
      
      onChatsLoaded(chatsWithMessages);
      
    } catch (err) {
      console.error('Error loading chats:', err);
      setError(err.message);
    }
  };

  // Загрузка событий
  const loadEvents = async () => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('city', userData.city)
        .order('date', { ascending: true });
      
      if (error) throw error;
      onEventsLoaded(events || []);
      
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message);
    }
  };

  // Загрузка при изменении данных
  useEffect(() => {
    if (userData?.email && localStorage.getItem('userId')) {
      loadUsers();
      loadChats();
      loadEvents();
      updateUserLocation(); // Обновляем геолокацию
    }
    setLoading(false);
  }, [userData?.city, userData?.gender]);

  // Периодическое обновление геолокации (каждые 5 минут)
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('userId')) {
        updateUserLocation();
      }
    }, 300000); // 5 минут

    return () => clearInterval(interval);
  }, []);

  // Real-time подписка на сообщения
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          console.log('Message update:', payload);
          loadChats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Real-time подписка на новые чаты
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const subscription = supabase
      .channel('chats')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chats'
        }, 
        (payload) => {
          console.log('New chat:', payload);
          if (payload.new.participant_1_id === userId || payload.new.participant_2_id === userId) {
            loadChats();
            loadUsers();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Экспортируем функции для использования в MainApp
  window.supabaseManager = {
    sendMessage: async (chatId, text, type = 'text', imageUrl = null) => {
      const userId = localStorage.getItem('userId');
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          sender_id: userId,
          text: text,
          type: type,
          image: imageUrl
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    recordLike: async (targetUserId) => {
      const userId = localStorage.getItem('userId');
      
      // 1. Записываем лайк
      const { error: likeError } = await supabase
        .from('likes')
        .insert([{ from_user_id: userId, to_user_id: targetUserId }]);
      
      if (likeError && likeError.code !== '23505') { // Игнорируем дубликаты
         console.error('Error recording like:', likeError);
      }

      // 2. Проверяем взаимность
      const { data: mutualLike } = await supabase
        .from('likes')
        .select('*')
        .eq('from_user_id', targetUserId)
        .eq('to_user_id', userId)
        .single();

      if (mutualLike) {
        // Мэтч! Создаем чат
        const chat = await window.supabaseManager.createChat(userId, targetUserId);
        return { isMatch: true, chat };
      }
      
      return { isMatch: false };
    },
    createChat: async (participant1Id, participant2Id) => {
      const { data, error } = await supabase
        .from('chats')
        .insert([{
          participant_1_id: participant1Id,
          participant_2_id: participant2Id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    createEvent: async (eventData) => {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    deleteMessage: async (messageId) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
    },
    markAsRead: async (chatId) => {
      const userId = localStorage.getItem('userId');
      console.log('Marking messages as read for chat:', chatId, 'user:', userId);
      
      try {
        // Try RPC function first
        const { error } = await supabase.rpc('mark_messages_read', { p_chat_id: chatId });
        
        if (error) {
          console.warn('RPC mark_messages_read failed, trying direct update:', error);
          
          // Fallback: direct update with the new policy
          const { error: directError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('chat_id', chatId)
            .neq('sender_id', userId)
            .eq('is_read', false);
            
          if (directError) {
            console.error('Direct update also failed:', directError);
          } else {
            console.log('Direct update succeeded');
          }
        } else {
          console.log('RPC update succeeded');
        }
      } catch (err) {
        console.error('markAsRead error:', err);
      }
    },
    editMessage: async (messageId, newText) => {
      const { error } = await supabase
        .from('messages')
        .update({ text: newText, is_edited: true })
        .eq('id', messageId);
      if (error) throw error;
    },
    updateUserLocation,
    loadUsers,
    loadChats,
    loadEvents,
    sendTyping: async (chatId) => {
      const userId = localStorage.getItem('userId');
      let channel = typingChannelsRef.current[chatId];
      
      if (!channel) {
          channel = supabase.channel(`typing:${chatId}`);
          typingChannelsRef.current[chatId] = channel;
          await channel.subscribe();
      }

      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, chatId }
      });
    },
    subscribeToTyping: (chatId, callback) => {
      let channel = typingChannelsRef.current[chatId];
      
      if (!channel) {
          channel = supabase.channel(`typing:${chatId}`);
          typingChannelsRef.current[chatId] = channel;
          channel.subscribe();
      }
      
      channel.on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.userId !== localStorage.getItem('userId')) {
            callback(payload.payload);
          }
      });
      
      return () => {
          supabase.removeChannel(channel);
          delete typingChannelsRef.current[chatId];
      };
    },
    // Тестовая функция для заполнения базы
    seedDatabase: async () => {
      const demoUsers = [
        {
          name: "Анна",
          age: 24,
          city: "Москва",
          bike: "Honda CBR600RR",
          gender: "female",
          has_bike: true,
          about: "Люблю скорость и ночные поездки по МКАДу.",
          image: "https://images.unsplash.com/photo-1622616239407-e83210e53a0f?auto=format&fit=crop&q=80&w=800",
          email: "anna@demo.com",
          created_at: new Date().toISOString()
        },
        {
          name: "Марина",
          age: 27,
          city: "Москва",
          bike: "Kawasaki Ninja 400",
          gender: "female",
          has_bike: true,
          about: "Ищу напарника для путешествия в Крым.",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800",
          email: "marina@demo.com",
          created_at: new Date().toISOString()
        },
        {
          name: "Виктория",
          age: 25,
          city: "Москва",
          bike: "Ducati Monster",
          gender: "female",
          has_bike: true,
          about: "Второй сезон за рулем. Хочу найти компанию.",
          image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=800",
          email: "vika@demo.com",
          created_at: new Date().toISOString()
        }
      ];

      for (const user of demoUsers) {
        // Проверяем существование
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (!existing) {
          await supabase.from('users').insert([user]);
        }
      }
      
      return true;
    }
  };

  if (loading) return null;
  if (error) return <div style={{color: 'red'}}>Ошибка: {error}</div>;
  
  return null;
};

export default SupabaseManager;
