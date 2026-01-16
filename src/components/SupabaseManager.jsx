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

  // Загрузка пользователей для поиска с кэшированием
  const loadUsers = async () => {
    if (!userData) return;
    
    // Проверяем кэш на 5 минут
    const cacheKey = `users_${userData.city}_${userData.gender}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 минут
        onUsersLoaded(data);
        return;
      }
    }
    
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
                { id: 'style', label: 'Стиль', value: u.temp || 'Спокойный', icon: 'Gauge' },
                { id: 'music', label: 'Музыка', value: u.music || 'Рок', icon: 'Music' },
                { id: 'equip', label: 'Экип', value: u.equip || 'Только шлем', icon: 'Shield' },
                { id: 'goal', label: 'Цель', value: u.goal || 'Только поездки', icon: 'Target' }
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
      
      // Сохраняем в кэш
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: filteredUsers
      }));
      
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
          
          console.log(`Loaded ${messages?.length || 0} messages for chat ${chat.id}:`, messages?.map(m => ({id: m.id, sender: m.sender_id, is_read: m.is_read, text: m.text?.substring(0, 30)})));
          
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
            canSendMessage: true, // Все чаты разрешают отправку сообщений
            lastMessage: messages?.length > 0 ? 
              (messages[messages.length - 1]?.type === 'image' ? 'Фотография' : messages[messages.length - 1]?.text) || 'Начните общение' : 'Начните общение',
            time: messages?.length > 0 && messages[messages.length - 1]?.created_at ? (() => {
              const messageDate = new Date(messages[messages.length - 1].created_at);
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
              const time = messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              
              if (messageDay.getTime() === today.getTime()) {
                return time; // Сегодня - только время
              } else if (messageDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
                return `Вчера`; // Вчера - только дата
              } else {
                return messageDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); // Другие даты
              }
            })() : '',
            unreadCount: messages?.filter(m => {
              const isUnread = m.sender_id !== userId && !m.is_read;
              if (isUnread) {
                console.log(`Unread message found: id=${m.id}, sender=${m.sender_id}, is_read=${m.is_read}, text=${m.text?.substring(0, 30)}...`);
              }
              return isUnread;
            }).length || 0
          };
        })
      );
      
      // Сортируем чаты по времени последнего сообщения (новые сверху)
      const sortedChats = chatsWithMessages.sort((a, b) => {
        const timeA = a.messages?.length > 0 && a.messages[a.messages.length - 1]?.created_at ? 
          new Date(a.messages[a.messages.length - 1].created_at) : new Date(0);
        const timeB = b.messages?.length > 0 && b.messages[b.messages.length - 1]?.created_at ? 
          new Date(b.messages[b.messages.length - 1].created_at) : new Date(0);
        return timeB - timeA;
      });
      
      onChatsLoaded(sortedChats);
      
    } catch (err) {
      console.error('Error loading chats:', err);
      setError(err.message);
    }
  };

  // Загрузка событий
  const loadEvents = async () => {
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const currentTime = today.toTimeString().slice(0, 5); // HH:MM format
      
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          participants_count:event_participants(count)
        `)
        .eq('city', userData.city)
        // Загружаем события созданные сегодня или в будущем
        .or(`date.gt.${todayString},and(date.eq.${todayString},time.ge.${currentTime})`)
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (error) throw error;
      
      // Автоудаление прошедших событий
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .or(`date.lt.${todayString},and(date.eq.${todayString},time.lt.${currentTime})`);
        
      if (deleteError) {
        console.error('Error deleting past events:', deleteError);
      } else {
        console.log('Deleted past events');
      }
      
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

  // Периодическая очистка прошедших событий (каждые 10 минут)
  useEffect(() => {
    const cleanupEvents = async () => {
      try {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const currentTime = today.toTimeString().slice(0, 5);
        
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .or(`date.lt.${todayString},and(date.eq.${todayString},time.lt.${currentTime})`);
          
        if (deleteError) {
          console.error('Error cleaning up past events:', deleteError);
        } else {
          console.log('Cleaned up past events');
          // Перезагружаем события после очистки
          loadEvents();
        }
      } catch (err) {
        console.error('Error in event cleanup:', err);
      }
    };

    // Запускаем сразу
    cleanupEvents();
    
    // Затем каждые 10 минут
    const interval = setInterval(cleanupEvents, 600000); // 10 минут

    return () => clearInterval(interval);
  }, []);

  // Real-time подписка на лайки
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const subscription = supabase
      .channel('likes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'likes'
        }, 
        (payload) => {
          console.log('New like:', payload);
          // Если лайк поставили текущему пользователю
          if (payload.new.to_user_id === userId) {
            // Загружаем информацию о том, кто лайкнул
            const loadLikerInfo = async () => {
              const { data: liker } = await supabase
                .from('users')
                .select('name, image')
                .eq('id', payload.new.from_user_id)
                .single();
              
              if (liker) {
                // Локальное уведомление
                window.supabaseManager.sendNotification(
                  '❤️ Новый лайк!',
                  `Вам поставил(а) лайк ${liker.name}`,
                  liker.image || '/favicons/android-chrome-192x192.png'
                );
                
                // Push уведомление
                window.supabaseManager.sendPushNotification(
                  '❤️ Новый лайк!',
                  `Вам поставил(а) лайк ${liker.name}`,
                  userId,
                  liker.image || '/favicons/android-chrome-192x192.png'
                );
              }
            };
            
            loadLikerInfo();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Real-time подписка на новые мэтчи
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const subscription = supabase
      .channel('matches')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chats'
        }, 
        (payload) => {
          console.log('New match:', payload);
          // Если мэтч создан с участием текущего пользователя
          if (payload.new.participant_1_id === userId || payload.new.participant_2_id === userId) {
            // Определяем ID собеседника
            const partnerId = payload.new.participant_1_id === userId 
              ? payload.new.participant_2_id 
              : payload.new.participant_1_id;
            
            // Загружаем информацию о партнере
            const loadPartnerInfo = async () => {
              const { data: partner } = await supabase
                .from('users')
                .select('name, image')
                .eq('id', partnerId)
                .single();
              
              if (partner) {
                // Локальное уведомление
                window.supabaseManager.sendNotification(
                  '🔥 Новый мэтч!',
                  `У вас мэтч с ${partner.name}! Начните общение`,
                  partner.image || '/favicons/android-chrome-192x192.png'
                );
                
                // Push уведомление
                window.supabaseManager.sendPushNotification(
                  '🔥 Новый мэтч!',
                  `У вас мэтч с ${partner.name}! Начните общение`,
                  userId,
                  partner.image || '/favicons/android-chrome-192x192.png'
                );
              }
            };
            
            loadPartnerInfo();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
          
          // Отправляем уведомление для новых сообщений от других пользователей
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== userId) {
            const chatName = payload.new.chat_id; // Здесь можно получить имя чата
            
            // Локальное уведомление (если приложение открыто)
            window.supabaseManager.sendNotification(
              'Новое сообщение',
              `У вас новое сообщение в чате`,
              '/favicons/android-chrome-192x192.png'
            );
            
            // Push уведомление (работает даже если приложение закрыто)
            window.supabaseManager.sendPushNotification(
              '🏍️ Новое сообщение',
              `У вас новое сообщение в чате`,
              userId, // отправляем конкретному пользователю
              '/favicons/android-chrome-192x192.png'
            );
          }
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
        async (payload) => {
          console.log('New chat:', payload);
          if (payload.new.participant_1_id === userId || payload.new.participant_2_id === userId) {
            // Определяем ID партнера
            const partnerId = payload.new.participant_1_id === userId ? 
              payload.new.participant_2_id : payload.new.participant_1_id;
            
            // Загружаем данные партнера для нового мэтча
            try {
              const { data: partner } = await supabase
                .from('users')
                .select('name, image, images')
                .eq('id', partnerId)
                .single();
                
              if (partner) {
                // Добавляем в новые мэтчи через глобальный менеджер
                if (window.newMatchesCallback) {
                  window.newMatchesCallback([{
                    ...partner,
                    chatId: payload.new.id,
                    isNew: true
                  }]);
                }
                
                // Отправляем уведомление о новом мэтче
                if (window.supabaseManager) {
                  window.supabaseManager.sendNotification(
                    '🏍️ Новый мэтч!',
                    `У вас мэтч с ${partner.name}! Начните общение`,
                    partner.image || '/favicons/android-chrome-192x192.png'
                  );
                  
                  window.supabaseManager.sendPushNotification(
                    '🏍️ Новый мэтч!',
                    `У вас мэтч с ${partner.name}! Начните общение`,
                    userId,
                    partner.image || '/favicons/android-chrome-192x192.png'
                  );
                }
              }
            } catch (error) {
              console.error('Error loading partner data for new match:', error);
            }
            
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

  // Realtime подписка для пользователей
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const subscription = supabase
      .channel('users')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users',
          filter: `id=neq.${userId}`
        }, 
        (payload) => {
          console.log('User updated:', payload);
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Экспортируем функции для использования в MainApp
  window.supabaseManager = {
    // Функция для отправки push уведомлений
    sendNotification: (title, body, icon = '/favicons/android-chrome-192x192.png') => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: icon,
          badge: '/favicons/favicon-32x32.png',
          vibrate: [100, 50, 100],
          tag: 'motopara-notification'
        });
      }
    },
    // Функция для отправки push уведомлений через Supabase Edge Function
    sendPushNotification: async (title, body, userId = null, icon = '/favicons/android-chrome-192x192.png') => {
      try {
        const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            title, 
            body, 
            icon,
            userId 
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to send push notification');
        }
        
        const result = await response.json();
        console.log('Push notification sent:', result);
        return result;
      } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error: error.message };
      }
    },
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

    recordDislike: async (targetUserId) => {
      const userId = localStorage.getItem('userId');
      
      // Записываем дизлайк в ту же таблицу likes с отрицательным значением или в отдельную таблицу
      // Для простоты используем ту же таблицу, но с флагом
      const { error: dislikeError } = await supabase
        .from('likes')
        .insert([{ 
          from_user_id: userId, 
          to_user_id: targetUserId,
          is_dislike: true 
        }]);
      
      if (dislikeError && dislikeError.code !== '23505') { // Игнорируем дубликаты
         console.error('Error recording dislike:', dislikeError);
      }
      
      return { success: true };
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
    // Функции для групповых чатов событий
    joinEventChat: async (eventId) => {
      const userId = localStorage.getItem('userId');
      
      // Получаем ID чата события
      const { data: chat } = await supabase
        .from('event_chats')
        .select('id')
        .eq('event_id', eventId)
        .single();
      
      if (!chat) throw new Error('Чат события не найден');
      
      // Добавляем пользователя в участники
      const { error } = await supabase
        .from('event_participants')
        .insert([{
          chat_id: chat.id,
          user_id: userId
        }]);
      
      if (error) throw error;
      return chat.id;
    },
    
    leaveEventChat: async (eventId) => {
      const userId = localStorage.getItem('userId');
      
      // Получаем ID чата события
      const { data: chat } = await supabase
        .from('event_chats')
        .select('id')
        .eq('event_id', eventId)
        .single();
      
      if (!chat) return;
      
      // Удаляем пользователя из участников
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('chat_id', chat.id)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    
    sendEventMessage: async (chatId, text, type = 'text', imageUrl = null) => {
      const userId = localStorage.getItem('userId');
      const { data, error } = await supabase
        .from('event_messages')
        .insert([{
          chat_id: chatId,
          sender_id: userId,
          text: text,
          type: type,
          image_url: imageUrl
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    getEventChatMessages: async (chatId) => {
      const { data, error } = await supabase
        .from('event_messages')
        .select(`
          *,
          sender:sender_id(name, image)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    
    getEventChatId: async (eventId) => {
      const { data, error } = await supabase
        .from('event_chats')
        .select('id')
        .eq('event_id', eventId)
        .single();
      
      if (error) throw error;
      return data.id;
    },
    
    isUserInEventChat: async (eventId) => {
      const userId = localStorage.getItem('userId');
      const { data, error } = await supabase
        .from('event_chats')
        .select(`
          id,
          event_participants!inner(user_id)
        `)
        .eq('event_id', eventId)
        .eq('event_participants.user_id', userId)
        .single();
      
      return !error && data;
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
