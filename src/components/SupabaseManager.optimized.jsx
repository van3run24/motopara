import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Gauge, Music, Shield, Target } from 'lucide-react';

const SupabaseManager = ({ userData, onUsersLoaded, onChatsLoaded, onEventsLoaded }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const typingChannelsRef = useRef({});
  const realtimeChannelsRef = useRef([]);

  // Кэширование геолокации
  const getCachedLocation = async () => {
    const cached = localStorage.getItem('userLocation');
    if (cached) {
      const { timestamp, location } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 минут
        return location;
      }
    }
    return null;
  };

  const getUserLocation = async () => {
    try {
      const cached = await getCachedLocation();
      if (cached) return cached;

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            localStorage.setItem('userLocation', JSON.stringify({
              timestamp: Date.now(),
              location
            }));
            resolve(location);
          },
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      });
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // Приоритет 1: Загрузка базовых данных
  const loadEssentialData = async () => {
    if (!userData) return;
    
    try {
      setLoading(true);
      
      // Загружаем только пользователей для поиска
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', localStorage.getItem('userId'))
        .eq('gender', userData.gender === 'male' ? 'female' : 'male')
        .eq('city', userData.city);

      if (error) throw error;

      const processedUsers = users.map(u => {
        const coords = u.coords || { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 };
        
        let interests = u.interests;
        if (typeof interests === 'string') {
          try {
            interests = JSON.parse(interests);
          } catch (e) {
            interests = [];
          }
        }

        const interestsWithIcons = interests.map(interest => {
          const iconMap = {
            'Спокойный': 'Gauge',
            'Агрессивный': 'Zap', 
            'Рок': 'Music',
            'Попса': 'Music',
            'Только шлем': 'Shield',
            'Полная экипировка': 'Shield',
            'Только поездки': 'Target',
            'Отношения': 'Heart'
          };
          
          return {
            ...interest,
            icon: iconMap[interest.value] || 'Gauge'
          };
        });

        return {
          ...u,
          coords,
          images: u.images || (u.image ? [u.image] : []),
          interests: interestsWithIcons,
          about: u.about
        };
      });

      onUsersLoaded(processedUsers);
      setLoading(false);
      
    } catch (err) {
      console.error('Error loading essential data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Приоритет 2: Загрузка чатов и событий
  const loadSecondaryData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      // Загружаем чаты
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          participant_1:participant_1_id(name, image, location_updated_at),
          participant_2:participant_2_id(name, image, location_updated_at)
        `)
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
      
      if (error) throw error;
      
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
            lastMessage: messages?.length > 0 ? messages[messages.length - 1]?.text || 'Начните общение' : 'Начните общение',
            time: messages?.length > 0 && messages[messages.length - 1]?.created_at ? (() => {
              const messageDate = new Date(messages[messages.length - 1].created_at);
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
              const time = messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              
              if (messageDay.getTime() === today.getTime()) {
                return time;
              } else if (messageDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
                return `Вчера`;
              } else {
                return messageDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
              }
            })() : '',
            unreadCount: messages?.filter(m => m.sender_id !== userId && !m.is_read).length || 0
          };
        })
      );
      
      const sortedChats = chatsWithMessages.sort((a, b) => {
        const timeA = a.messages?.length > 0 && a.messages[a.messages.length - 1]?.created_at ? 
          new Date(a.messages[a.messages.length - 1].created_at) : new Date(0);
        const timeB = b.messages?.length > 0 && b.messages[b.messages.length - 1]?.created_at ? 
          new Date(b.messages[b.messages.length - 1].created_at) : new Date(0);
        return timeB - timeA;
      });
      
      onChatsLoaded(sortedChats);
      
      // Загружаем события
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });
      
      if (eventsError) throw eventsError;
      onEventsLoaded(events || []);
      
    } catch (err) {
      console.error('Error loading secondary data:', err);
    }
  };

  // Приоритет 3: Настройка Real-time подписок
  const setupRealtimeSubscriptions = () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Подписка на лайки
    const likesChannel = supabase
      .channel('likes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'likes'
        }, 
        (payload) => {
          console.log('New like:', payload);
          if (payload.new.to_user_id === userId) {
            const loadLikerInfo = async () => {
              const { data: liker } = await supabase
                .from('users')
                .select('name, image')
                .eq('id', payload.new.from_user_id)
                .single();
              
              if (liker) {
                window.supabaseManager.sendNotification(
                  '❤️ Новый лайк!',
                  `Вам поставил(а) лайк ${liker.name}`,
                  liker.image || '/favicons/android-chrome-192x192.png'
                );
                
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
      
    realtimeChannelsRef.current.push(likesChannel);

    // Подписка на сообщения
    const messagesChannel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${selectedChat?.id}`
        }, 
        (payload) => {
          console.log('Message update:', payload);
          loadChats();
          
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== userId) {
            window.supabaseManager.sendNotification(
              '🏍️ Новое сообщение',
              `У вас новое сообщение в чате`,
              userId,
              '/favicons/android-chrome-192x192.png'
            );
            
            window.supabaseManager.sendPushNotification(
              '🏍️ Новое сообщение',
              `У вас новое сообщение в чате`,
              userId,
              '/favicons/android-chrome-192x192.png'
            );
          }
        }
      )
      .subscribe();
      
    realtimeChannelsRef.current.push(messagesChannel);
  };

  // Основной useEffect с поэтапной загрузкой
  useEffect(() => {
    if (userData?.email && localStorage.getItem('userId')) {
      // Приоритет 1: Немедленная загрузка базовых данных
      loadEssentialData();
      
      // Приоритет 2: Загрузка чатов и событий через 500ms
      const secondaryTimer = setTimeout(() => {
        loadSecondaryData();
      }, 500);
      
      // Приоритет 3: Real-time подписки через 1s
      const realtimeTimer = setTimeout(() => {
        setupRealtimeSubscriptions();
      }, 1000);
      
      // Обновление геолокации
      updateUserLocation();
      
      return () => {
        clearTimeout(secondaryTimer);
        clearTimeout(realtimeTimer);
        
        // Очистка realtime подписок
        realtimeChannelsRef.current.forEach(channel => {
          supabase.removeChannel(channel);
        });
        realtimeChannelsRef.current = [];
      };
    }
  }, [userData?.city, userData?.gender]);

  // Очистка при скрытии приложения
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Пауза realtime подписок
        realtimeChannelsRef.current.forEach(channel => {
          supabase.removeChannel(channel);
        });
        realtimeChannelsRef.current = [];
      } else {
        // Возобновление подписок
        setupRealtimeSubscriptions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Остальные функции без изменений...
  const updateUserLocation = async () => {
    try {
      const location = await getUserLocation();
      const userId = localStorage.getItem('userId');
      
      if (userId && location) {
        const { error } = await supabase
          .from('users')
          .update({ 
            location_updated_at: new Date().toISOString(),
            coords: { x: location.longitude, y: location.latitude }
          })
          .eq('id', userId);
          
        if (error) console.error('Error updating location:', error);
      }
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  // ... остальные методы из оригинального компонента

  return null; // Компонент только для управления данными
};

export default SupabaseManager;
