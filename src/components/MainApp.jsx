import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Heart, MapPin, MessageCircle, User, X, Gauge, Music, Shield, Target, Edit3, Settings, LogOut, ChevronLeft, ChevronDown, MessageSquare, Send, Camera, Navigation, Zap, Trash2, Ban, Image as ImageIcon, Plus, Calendar, Clock, MapPin as MapPinIcon, Smile, Database, Loader2, Check, CheckCheck, Info, ArrowRight } from 'lucide-react';
import SupabaseManager from './SupabaseManager';
import { supabase } from '../supabaseClient';
import { userService } from '../supabaseService';
import { cities } from '../data/cities';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Компонент для автоподстановки адресов
const AddressAutocomplete = ({ value, onChange, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Используем Яндекс Карты API для подсказок (если есть ключ)
      if (process.env.REACT_APP_YANDEX_API_KEY) {
        const response = await fetch(
          `https://suggest-maps.yandex.ru/v1/suggest?apikey=${process.env.REACT_APP_YANDEX_API_KEY}&text=${encodeURIComponent(query)}&type=geo&results=5`
        );
        
        if (response.ok) {
          const data = await response.json();
          const addresses = data.results?.map(item => item.text) || [];
          setSuggestions(addresses.slice(0, 5));
          return;
        }
      }
      
      // Fallback: простые но полезные подсказки на основе города
      const citySuggestions = [
        `${query} улица`,
        `${query} проспект`, 
        `${query} площадь`,
        `${query} шоссе`,
        `${query} бульвар`,
        `кафе ${query}`,
        `ресторан ${query}`,
        `парк ${query}`,
        `ТЦ ${query}`,
        `${query} центр`,
        `м. ${query}`,
        `ул. ${query}`,
        `пр. ${query}`,
        `пл. ${query}`
      ];
      
      setSuggestions(citySuggestions.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      // Минимальный fallback
      setSuggestions([`${query} улица`, `${query} проспект`, `${query} площадь`]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    fetchSuggestions(newValue);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClickOutside = (e) => {
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        className="flex-1 bg-transparent text-sm outline-none text-white placeholder-zinc-500"
        placeholder={placeholder}
        onFocus={() => setShowSuggestions(true)}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
          {loading ? (
            <div className="p-3 text-zinc-500 text-sm">Загрузка...</div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {suggestion}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Fix Leaflet icons - Custom Theme
delete L.Icon.Default.prototype._getIconUrl;

// Создаем кастомные иконки
const createCustomIcon = (color, isUser = false) => {
  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        width: ${isUser ? '20px' : '16px'};
        height: ${isUser ? '20px' : '16px'};
        border-radius: 50%;
        border: ${isUser ? '3px' : '2px'} solid white;
        box-shadow: 0 ${isUser ? '2px 8px' : '2px 6px'} rgba(0,0,0,0.3);
      "></div>
    `,
    className: 'custom-marker',
    iconSize: [isUser ? 20 : 16, isUser ? 20 : 16],
    iconAnchor: [isUser ? 10 : 8, isUser ? 10 : 8],
    popupAnchor: [0, isUser ? -10 : -8],
    shadowSize: [0, 0]
  });
};

// Иконки для разных типов
const userIcon = createCustomIcon('#ea580c', true); // Оранжевый для текущего пользователя
const maleIcon = createCustomIcon('#3b82f6'); // Голубой для мужчин
const femaleIcon = createCustomIcon('#ec4899'); // Розовый для женщин

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MainApp = () => {
  // --- СОСТОЯНИЯ ПРИЛОЖЕНИЯ ---
  const [isLoading, setIsLoading] = useState(false); // Не показываем загрузку
  const [isNewUser, setIsNewUser] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // Запрос разрешения на уведомления
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Разрешение на уведомления получено');
          // Регистрируем Service Worker для push уведомлений
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        }
      } catch (error) {
        console.error('Ошибка запроса разрешения на уведомления:', error);
      }
    }
  };

  // Отправка push уведомления
  const sendNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: options.body || 'Новое уведомление',
        icon: '/favicons/android-chrome-192x192.png',
        badge: '/favicons/favicon-32x32.png',
        vibrate: [100, 50, 100],
        tag: 'motopara-notification',
        requireInteraction: false,
        ...options
      });
      
      // Автоматически закрываем через 5 секунд
      setTimeout(() => {
        notification.close();
      }, 5000);
      
      return notification;
    }
    return null;
  };
  const formatMessageTime = (createdAt) => {
    if (!createdAt) return '';
    
    const messageDate = new Date(createdAt);
    const time = messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    return time;
  };

  // Функция форматирования даты для разделителя
  const formatDateForSeparator = (createdAt) => {
    if (!createdAt) return '';
    
    const messageDate = new Date(createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    if (messageDay.getTime() === today.getTime()) {
      return 'Сегодня';
    } else if (messageDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return 'Вчера';
    } else {
      return messageDate.toLocaleDateString('ru-RU', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
    }
  };

  // Группировка сообщений по датам
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];
    
    const grouped = [];
    let currentDate = null;
    
    messages.forEach((message, index) => {
      const messageDate = new Date(message.created_at);
      const dateKey = messageDate.toDateString();
      
      // Если это новая дата, добавляем разделитель
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        grouped.push({
          type: 'separator',
          date: formatDateForSeparator(message.created_at),
          created_at: message.created_at
        });
      }
      
      // Добавляем само сообщение
      grouped.push({
        type: 'message',
        ...message
      });
    });
    
    return grouped;
  };

  // Функция геокодирования адреса через Yandex API
  const geocodeAddress = async (address) => {
    if (!address) return null;
    
    try {
      const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=YOUR_YANDEX_API_KEY&geocode=${encodeURIComponent(address)}&format=json`);
      const data = await response.json();
      
      if (data.response.GeoObjectCollection.featureMember.length > 0) {
        const coords = data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(' ');
        return {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0])
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    return null;
  };

  const getProfileImage = (user) => {
    if (user.images && user.images.length > 0) return user.images[0];
    if (user.image) return user.image;
    return DEFAULT_AVATAR;
  };

  const [selectedImage, setSelectedImage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Online status tracking with Supabase Presence
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const channel = supabase.channel('online_users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = new Set();
        Object.values(state).forEach(presences => {
          presences.forEach(presence => {
            if (presence.user_id) onlineIds.add(presence.user_id);
          });
        });
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
          const checkSession = async () => {
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session) {
                  localStorage.setItem('userId', session.user.id);
                  
                  // Запрашиваем разрешение на уведомления
                  await requestNotificationPermission();
                  
                  // Load fresh profile data
                  let { data: user } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                  
                  // Если профиля нет, создаем его с пустыми полями
                  if (!user) {
                     const defaultProfile = {
                       id: session.user.id,
                       email: session.user.email,
                       name: session.user.user_metadata?.full_name || null, // Берем имя из метаданных регистрации
                       age: null, // Пустое по умолчанию
                       city: session.user.user_metadata?.city || "Москва",
                       bike: "",
                       gender: session.user.user_metadata?.gender || "male",
                       has_bike: false,
                       about: null,
                       image: null,
                       has_seen_welcome: false,
                       created_at: new Date().toISOString()
                     };
                     
                     const { data: newProfile, error } = await supabase
                       .from('users')
                       .insert([defaultProfile])
                       .select()
                       .single();
                       
                     if (!error) user = newProfile;
                     else console.error('Error creating profile:', error);
                  }
                    
                  if (user) {
                    setUserData(user);
                    if (user.images && Array.isArray(user.images)) {
                        setUserImages(user.images);
                        localStorage.setItem('userImages', JSON.stringify(user.images));
                    }
                    
                    // Проверяем, новый ли это пользователь (пустой профиль)
                    // Показываем приветствие только если профиль действительно пустой и пользователь еще не видел приветствие
                    const isEmptyProfile = !user.name || !user.age || !user.bio || !user.images || user.images.length === 0;
                    
                    if (isEmptyProfile && !user.has_seen_welcome) {
                      setIsNewUser(true);
                      setShowWelcomeModal(true);
                      
                      // Обновляем флаг в базе данных
                      await supabase
                        .from('users')
                        .update({ has_seen_welcome: true })
                        .eq('id', user.id);
                    }
                  }
              }
          };
          checkSession();
        }, []);

  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [showSettings, setShowSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [hasNewMatchNotification, setHasNewMatchNotification] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [contextMenuMessageId, setContextMenuMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const [swipedChatId, setSwipedChatId] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  
  // Settings States
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Данные из Supabase
  const [events, setEvents] = useState([]);
  const [bikers, setBikers] = useState([]);
  const [chats, setChats] = useState([]);
  const [newMatches, setNewMatches] = useState([]);

  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', address: '', link: '' });
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const chatFileInputRef = useRef(null);

  // Данные пользователя
  const [userData, setUserData] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // const cities = ["Москва", "Санкт-Петербург", "Сочи", "Краснодар"]; // Removed hardcoded cities

  // Состояния для свайпов в стиле Tinder
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState(null);
  const cardRef = useRef(null);
  const profileScrollRef = useRef(null); // Ref for resetting scroll

  // Фильтруем анкеты: используем данные из Supabase
  const matchedIds = useMemo(() => chats.map(chat => {
      // Ищем ID собеседника (не свой ID)
      const currentUserId = localStorage.getItem('userId');
      if (chat.participant_1_id == currentUserId) return chat.participant_2_id;
      if (chat.participant_2_id == currentUserId) return chat.participant_1_id;
      return null;
  }).filter(id => id), [chats]);

  const filteredBikers = useMemo(() => {
    const currentUserId = localStorage.getItem('userId');
    return bikers.filter(b => 
      !matchedIds.includes(b.id) && 
      b.id !== currentUserId &&
      b.city === userData?.city
    );
  }, [bikers, matchedIds, userData?.city]);

  // Безопасное получение currentBiker с проверкой на существование
  const currentBiker = filteredBikers.length > 0 && currentIndex >= 0 && currentIndex < filteredBikers.length 
    ? filteredBikers[currentIndex] 
    : null;

  const [userImages, setUserImages] = useState(() => {
    // Инициализация из localStorage при первом рендере
    try {
      const saved = localStorage.getItem('userImages');
      if (saved) {
        const images = JSON.parse(saved);
        if (Array.isArray(images) && images.length > 0) {
          return images;
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки галереи при инициализации:', e);
    }
    return [];
  });

  // Sync selectedChat with chats for real-time updates
  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(c => c.id === selectedChat.id);
      if (updatedChat) {
        // Preserve local state like scroll position if needed, but for now just update messages
        // We only want to update if messages count changed or last message changed to avoid unnecessary re-renders
        if (updatedChat.messages.length !== selectedChat.messages.length || 
            updatedChat.lastMessage !== selectedChat.lastMessage ||
            updatedChat.isPartnerTyping !== selectedChat.isPartnerTyping) {
          setSelectedChat(prev => ({
            ...prev,
            ...updatedChat,
            messages: updatedChat.messages
          }));
        }
      }
    }
  }, [chats]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!selectedChat?.id) return;
    
    // Reset typing state when chat changes
    setIsPartnerTyping(false);

    const unsubscribe = window.supabaseManager.subscribeToTyping(selectedChat.id, (payload) => {
      setIsPartnerTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsPartnerTyping(false);
      }, 3000);
    });
    
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedChat?.id]);

  // Обновление индекса при изменении фильтров
  useEffect(() => {
    setCurrentIndex(0);
    setCurrentImageIndex(0);
  }, [userData?.city, userData?.gender]);

  const handleNext = () => {
    if (filteredBikers.length > 0) {
      setExitDirection('left');
      setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setCurrentImageIndex(0);
          setDragOffset({ x: 0, y: 0 });
          setExitDirection(null);
          if (profileScrollRef.current) {
            profileScrollRef.current.scrollTop = 0;
          }
      }, 300);
    }
  };

  const handleLike = async () => {
    if (!currentBiker) return;
    const likedUser = currentBiker;
    
    setExitDirection('right');
    
    setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setCurrentImageIndex(0);
        setDragOffset({ x: 0, y: 0 });
        setExitDirection(null);
        if (profileScrollRef.current) profileScrollRef.current.scrollTop = 0;
    }, 300);

    try {
      if (window.supabaseManager && likedUser.id) {
        const result = await window.supabaseManager.recordLike(likedUser.id);
        
        if (result.isMatch) {
          const newChat = result.chat;
          const chatData = {
            id: newChat.id,
            name: likedUser.name,
            image: likedUser.images[0] || DEFAULT_AVATAR,
            lastMessage: 'Новый мэтч!',
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            online: true,
            unreadCount: 1,
            messages: [],
            partnerId: likedUser.id
          };
          setChats(prev => [...prev, chatData]);
          
          setMatchData(likedUser);
          setHasNewMatchNotification(true);
          setNewMatches(prev => [{...likedUser, isNew: true}, ...prev]);
          
          // Отправляем уведомление о новом мэтче
          sendNotification('🏍️ Новый мэтч!', {
            body: `У вас новый мэтч: ${likedUser.name}, ${likedUser.age} лет`,
            icon: likedUser.images?.[0] || DEFAULT_AVATAR,
            tag: 'new-match'
          });
        }
      }
    } catch (err) {
      console.error('Error in handleLike:', err);
    }
  };

  // Обработчики свайпов в стиле Tinder
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    // Если свайп больше по горизонтали, чем по вертикали - это свайп влево/вправо
    // Игнорируем если свайп в основном вертикальный (скролл)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setDragOffset({ x: deltaX, y: 0 });
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100; // Минимальное расстояние для свайпа
    
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        // Свайп вправо - лайк
        handleLike();
      } else {
        // Свайп влево - пропуск
        handleNext();
      }
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  // Обработчики для мыши (для десктопа)
  const handleMouseDown = (e) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Если свайп больше по горизонтали, чем по вертикали - это свайп влево/вправо
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setDragOffset({ x: deltaX, y: 0 });
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleLike();
      } else {
        handleNext();
      }
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  // Закрываем мэтч при смене вкладки
  useEffect(() => {
    if (activeTab !== 'search') {
      setMatchData(null);
    }
  }, [activeTab]);

  const switchImage = (e) => {
    if (!currentBiker) return;
    
    // Если у пользователя нет изображений, не переключаем
    if (!currentBiker.images || currentBiker.images.length === 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) {
      if (currentImageIndex < currentBiker.images.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      } else {
        setCurrentImageIndex(0);
      }
    } else {
      if (currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      } else {
        setCurrentImageIndex(currentBiker.images.length - 1);
      }
    }
  };

  const openChat = async (chat) => {
    setSelectedChat(chat);
    setActiveTab('chats');
    const updatedChats = chats.map(c => c.id === chat.id ? {...c, unreadCount: 0, isNew: false} : c);
    setChats(updatedChats);
    // Убираем из новых мэтчей
    setNewMatches(prev => prev.map(m => m.id === chat.id || m.name === chat.name ? {...m, isNew: false} : m));
    
    // Mark as read in backend
    if (window.supabaseManager?.markAsRead) {
      await window.supabaseManager.markAsRead(chat.id);
    }
  };

  const deleteChat = (chatId) => {
    setChats(chats.filter(c => c.id !== chatId));
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
    }
  };

  const blockUser = (chatId) => {
    // В будущем здесь будет логика блокировки
    deleteChat(chatId);
  };

  const updateGallery = async (newImages) => {
    try {
        const userId = localStorage.getItem('userId');
        const { error } = await supabase
            .from('users')
            .update({ images: newImages }) 
            .eq('id', userId);
        
        if (error) throw error;
        setUserImages(newImages);
        localStorage.setItem('userImages', JSON.stringify(newImages));
        setUserData(prev => ({ ...prev, images: newImages }));
    } catch (err) {
        console.error('Error updating gallery:', err);
        alert('Не удалось обновить галерею. Попробуйте еще раз.');
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail || !newEmail.includes('@')) {
        alert('Введите корректный email');
        return;
    }
    try {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        alert('На ваш новый email отправлено письмо для подтверждения.');
        setIsEditingEmail(false);
        setNewEmail('');
    } catch (err) {
        console.error(err);
        alert('Ошибка обновления email: ' + err.message);
    }
  };

  const handleImageUpload = async (e, isProfile = false, isGallery = false) => {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
        const userId = localStorage.getItem('userId');
        
        if (isProfile && userId) {
            const file = e.target.files[0];
            const imageUrl = await userService.uploadAvatar(userId, file);
            await supabase.from('users').update({ image: imageUrl }).eq('id', userId);
            setUserData({...userData, image: imageUrl});
            if (!userImages.includes(imageUrl)) {
                await updateGallery([imageUrl, ...userImages]);
            }
        } else if (isGallery && userId) {
            const file = e.target.files[0];
            const imageUrl = await userService.uploadGalleryImage(userId, file);
            await updateGallery([...userImages, imageUrl]);
        } else {
            // Chat images (support multiple)
            const files = Array.from(e.target.files);
            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('images')
                    .getPublicUrl(fileName);

                if (selectedChat && window.supabaseManager) {
                    await window.supabaseManager.sendMessage(selectedChat.id, '', 'image', publicUrl);
                }
            }
        }
    } catch (err) {
        console.error('Error uploading image:', err);
        setError('Ошибка загрузки фото');
    }
  };

  const createEvent = async () => {
    if (newEvent.title && newEvent.date && newEvent.time) {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          alert("Ошибка: Пользователь не найден");
          return;
        }

        const eventData = {
          title: newEvent.title,
          description: newEvent.description,
          city: userData.city,
          date: newEvent.date,
          time: newEvent.time,
          address: newEvent.address,
          link: newEvent.link,
          created_by_id: userId,
          created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('events')
          .insert([eventData]);
          
        if (error) throw error;
        
        setNewEvent({ title: '', description: '', date: '', time: '', address: '', link: '' });
        setShowEventModal(false);
        
        if (window.supabaseManager && window.supabaseManager.loadEvents) {
          window.supabaseManager.loadEvents();
        }
      } catch (err) {
        console.error('Error creating event:', err);
        alert('Ошибка при создании события: ' + err.message);
      }
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
    }
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        alert('Пароль успешно обновлен!');
        setIsEditingPassword(false);
        setNewPassword('');
    } catch (err) {
        console.error(err);
        alert('Ошибка обновления пароля: ' + err.message);
    }
  };

  const clearTestData = async () => {
    if (!confirm('Вы уверены? Это действие удалит все анкеты кроме вашей. Используйте только для тестов.')) return;
    try {
        const currentUserId = localStorage.getItem('userId');
        const { error } = await supabase
            .from('users')
            .delete()
            .neq('id', currentUserId);
            
        if (error) throw error;
        
        alert('Тестовые данные очищены. Перезагрузите страницу.');
        window.location.reload();
    } catch (err) {
        console.error(err);
        alert('Не удалось удалить данные (возможно ограничение прав доступа): ' + err.message);
    }
  };

  const deleteEvent = async (e, eventId) => {
    e.stopPropagation();
    
    // Safety check if eventId is passed correctly
    const idToDelete = typeof eventId === 'object' ? eventId.id : eventId;
    
    if (!idToDelete) {
        console.error('Invalid event ID:', eventId);
        alert('Ошибка: Неверный ID события');
        return;
    }

    if (!confirm('Вы уверены, что хотите удалить это событие?')) return;
    
    try {
      console.log('Deleting event:', idToDelete);
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', idToDelete);
        
      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      // Optimistic update
      setEvents(prev => prev.filter(e => e.id !== idToDelete));
      
      if (window.supabaseManager && window.supabaseManager.loadEvents) {
        window.supabaseManager.loadEvents();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Ошибка при удалении события: ' + err.message);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Удалить сообщение?')) {
      try {
        await window.supabaseManager.deleteMessage(messageId);
        // Remove from local state immediately
        if (selectedChat) {
          const updatedMessages = selectedChat.messages.filter(m => m.id !== messageId);
          const updatedChat = { ...selectedChat, messages: updatedMessages };
          setSelectedChat(updatedChat);
          setChats(prevChats => prevChats.map(c => c.id === selectedChat.id ? updatedChat : c));
        }
      } catch (e) {
        console.error('Error deleting message:', e);
      }
    }
    setContextMenuMessageId(null);
  };

  const handleOpenProfile = async (partnerId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', partnerId)
        .single();
      
      if (error) throw error;
      
       let interests = data.interests;
       if (typeof interests === 'string') {
         try { interests = JSON.parse(interests); } catch (e) {}
       }
       if (!interests || !Array.isArray(interests)) {
          interests = [
            { id: 'style', label: 'Стиль', value: data.temp || 'Спокойный', icon: 'Gauge' },
            { id: 'music', label: 'Музыка', value: data.music || 'Рок', icon: 'Music' },
            { id: 'equip', label: 'Экип', value: data.equip || 'Только шлем', icon: 'Shield' },
            { id: 'goal', label: 'Цель', value: data.goal || 'Только поездки', icon: 'Target' }
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
       
       // Combine all images (avatar + gallery)
       let allImages = [];
       if (data.images && Array.isArray(data.images) && data.images.length > 0) {
           allImages = data.images;
       } else if (data.image) {
           allImages = [data.image];
       } else {
           allImages = [DEFAULT_AVATAR];
       }

       setViewingProfile({ 
         ...data, 
         interests: interestsWithIcons, 
         images: allImages
       });

    } catch (err) {
      console.error("Error fetching profile:", err);
      // alert("Не удалось загрузить профиль");
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;

    try {
      // Send new message
      if (window.supabaseManager) {
        await window.supabaseManager.sendMessage(selectedChat.id, messageInput.trim());
      }
      
      setMessageInput('');
      setShowEmojiPicker(false);
      
      // Прокрутка к новому сообщению
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Ошибка отправки сообщения');
    }
  };


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  // Sync selectedChat with chats updates (real-time)
  useEffect(() => {
    const syncSelectedChat = async () => {
      if (selectedChat && chats.length > 0) {
        const updatedChat = chats.find(c => c.id === selectedChat.id);
        if (updatedChat) {
          const messagesChanged = JSON.stringify(updatedChat.messages) !== JSON.stringify(selectedChat.messages);
          
          if (messagesChanged) {
             setSelectedChat(prev => ({
               ...updatedChat,
               // Preserve local state if needed, but usually we want fresh data
             }));
             
             // If new messages arrived while chat is open, mark them as read
             const hasUnread = updatedChat.messages.some(m => !m.is_read && m.sender === 'other');
             if (hasUnread && window.supabaseManager?.markAsRead) {
                await window.supabaseManager.markAsRead(updatedChat.id);
             }
          }
        }
      }
    };
    syncSelectedChat();
  }, [chats]);


  // Обработка ошибок
  if (error) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-black uppercase italic mb-4 text-red-500">Ошибка</h2>
        <p className="text-zinc-400 mb-6 text-center">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          className="bg-orange-600 px-6 py-3 rounded-xl font-bold uppercase"
        >
          Перезагрузить
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full supports-[height:100dvh]:h-[100dvh] bg-black text-white flex flex-col overflow-hidden font-sans animate-in fade-in duration-500">
      
      {/* Supabase Manager - работает в фоне */}
      {userData && (
        <SupabaseManager 
          userData={userData}
          onUsersLoaded={setBikers}
          onChatsLoaded={setChats}
          onEventsLoaded={setEvents}
        />
      )}
      
      {!selectedChat && !viewingProfile && (
        <header className="h-16 shrink-0 backdrop-blur-xl bg-black/50 border-b border-white/5 flex items-center justify-between px-6 z-40">
          <div className="text-lg font-black tracking-tighter italic uppercase">Мото<span className="text-orange-500">Знакомства</span></div>
          <button onClick={() => {setActiveTab('profile');}} className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center overflow-hidden ${activeTab === 'profile' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5'}`}>
            {userData?.image ? (
              <img src={userData.image} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <User size={20} className={activeTab === 'profile' ? 'text-orange-500' : 'text-zinc-400'} />
            )}
          </button>
        </header>
      )}

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            className="max-w-full max-h-full object-contain rounded-lg"
            alt="Full screen"
          />
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden">
        
        {activeTab === 'search' && (
          <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
            {filteredBikers.length > 0 && currentBiker ? (
              <div className="w-full max-w-md h-full flex flex-col items-center px-4 py-2 space-y-3">
                {/* Glassmorphism контейнер с карточкой */}
                <article 
                  ref={cardRef}
                  className={`w-full rounded-[40px] overflow-hidden backdrop-blur-2xl bg-white/8 border border-white/20 shadow-2xl transition-all duration-300 flex-1 min-h-0 ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  } select-none`}
                  style={{
                    transform: exitDirection 
                        ? `translateX(${exitDirection === 'right' ? 1000 : -1000}px) rotate(${exitDirection === 'right' ? 20 : -20}deg)`
                        : `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.1}deg)`,
                    opacity: exitDirection ? 0 : (isDragging ? 1 - Math.abs(dragOffset.x) / 500 : 1),
                    transition: exitDirection ? 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out' : 'none'
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Внутренний контейнер с прокруткой */}
                  <div 
                    ref={profileScrollRef}
                    className="h-full flex flex-col overflow-y-auto"
                  >
                    {/* Изображение на весь окошко */}
                    <div 
                      className="relative w-full h-full shrink-0"
                      style={{ minHeight: '100%' }}
                      onClick={switchImage}
                    >
                      <img 
                        src={currentBiker.images[currentImageIndex] || currentBiker.images[0] || DEFAULT_AVATAR} 
                        className="absolute inset-0 w-full h-full object-cover z-10" 
                        alt="Biker" 
                        onError={(e) => {
                          e.target.src = DEFAULT_AVATAR;
                        }}
                      />

                      {/* Полоски индикатора изображений */}
                      <div className="absolute top-6 left-6 right-6 flex gap-1.5 z-30 pointer-events-none">
                        {currentBiker.images && currentBiker.images.length > 0 ? currentBiker.images.map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all backdrop-blur-sm ${i === currentImageIndex ? 'bg-orange-500' : 'bg-white/30'}`} />
                        )) : null}
                      </div>

                      {/* Затемнение внизу для читаемости */}
                      <div
                        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
                        style={{ height: '45%', background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)' }}
                      />

                      {/* Имя, возраст и байк внизу */}
                      <div className="absolute bottom-6 left-6 right-6 z-30 pointer-events-none">
                        <h3 className="text-4xl font-black tracking-tight uppercase italic text-white drop-shadow-2xl mb-2">{currentBiker.name}, {currentBiker.age}</h3>
                        <div className="flex items-center gap-2">
                          <Zap size={16} className="text-orange-500 fill-orange-500 drop-shadow-2xl" />
                          <p className="text-orange-500 text-sm font-bold uppercase tracking-widest drop-shadow-2xl">{currentBiker.has_bike ? currentBiker.bike : "Ищу того, кто прокатит"}</p>
                        </div>
                      </div>


                      {/* Индикаторы свайпа влево/вправо */}
                      {isDragging && Math.abs(dragOffset.x) > 50 && (
                        <div className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none ${
                          dragOffset.x > 0 ? 'right-8' : 'left-8'
                        }`}>
                          <div className={`p-4 rounded-2xl backdrop-blur-xl ${
                            dragOffset.x > 0 
                              ? 'bg-green-500/20 border border-green-400/30' 
                              : 'bg-red-500/20 border border-red-400/30'
                          }`}>
                            {dragOffset.x > 0 ? (
                              <Heart size={32} className="text-green-400 fill-green-400" />
                            ) : (
                              <X size={32} className="text-red-400" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Описание (появляется при скролле) */}
                    <div className="bg-black/80 backdrop-blur-3xl border-t border-white/10 shrink-0 transition-all duration-500 ease-in-out">
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xl font-black uppercase italic text-white">О себе</h4>
                        </div>
                        <p className="text-lg text-zinc-200 leading-relaxed font-light italic">"{currentBiker.about || 'Пользователь не указал информацию о себе'}"</p>
                        <div className="grid grid-cols-2 gap-3">
                          {currentBiker.interests && currentBiker.interests.map((item, idx) => (
                            <div key={idx} className="bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                              <div className="text-zinc-300 flex items-center gap-2 mb-1">{item.icon}<span className="text-[9px] uppercase font-bold tracking-tighter">{item.label}</span></div>
                              <span className="text-sm font-semibold text-white/90">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="h-16 transition-all duration-300 ease-in-out" />
                      </div>
                    </div>
                  </div>
                </article>

                {/* Панель действий под окошком */}
                <div className="w-full max-w-md flex items-center justify-center gap-10 shrink-0 py-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(); }} 
                    className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center active:scale-90 shadow-lg hover:bg-white/20 transition-all relative z-50"
                  >
                    <X size={28} className="text-white/90" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLike(); }} 
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-2xl active:scale-90 hover:scale-105 transition-all relative z-50"
                  >
                    <Heart fill="white" size={36} className="text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-600 text-sm italic uppercase tracking-wider mb-2">
                  {filteredBikers.length === 0 ? 'Нет анкет в этом городе' : 'Анкеты закончились'}
                </p>
                <p className="text-zinc-700 text-xs">
                  {filteredBikers.length === 0 
                    ? 'Попробуйте изменить город в настройках' 
                    : 'Зайдите позже, появятся новые'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* КАРТА */}
        {activeTab === 'map' && (
          <div className="h-full overflow-y-auto bg-black animate-in fade-in">
            {/* КАРТА */}
            <div className="relative bg-[#0a0a0a] mx-4 mt-4 rounded-[32px] border border-white/10 overflow-hidden" style={{ height: '40vh', minHeight: '300px' }}>
              {userData && (
                <MapContainer 
                  center={userLocation ? [userLocation.lat, userLocation.lng] : [
                    cities.find(c => c.name === userData.city)?.lat || 55.7558, 
                    cities.find(c => c.name === userData.city)?.lng || 37.6173
                  ]} 
                  zoom={11} 
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution=""
                  />
                  {/* User Marker */}
                   <Marker 
                     position={userLocation ? [userLocation.lat, userLocation.lng] : [
                       cities.find(c => c.name === userData.city)?.lat || 55.7558, 
                       cities.find(c => c.name === userData.city)?.lng || 37.6173
                     ]} 
                     icon={userIcon}
                   >
                      <Popup className="custom-popup">
                         <div className="text-black font-bold">Вы здесь</div>
                      </Popup>
                   </Marker>
                   
                   {/* Bikers Markers */}
                   {bikers.filter(b => b.city === userData?.city).map((b, idx) => {
                      const cityCoords = cities.find(c => c.name === userData.city) || { lat: 55.7558, lng: 37.6173 };
                      // Pseudo-random position based on ID to be consistent across renders
                      const seed = b.id.charCodeAt(0); 
                      const latOffset = ((seed % 100) / 100 - 0.5) * 0.1;
                      const lngOffset = ((seed % 50) / 50 - 0.5) * 0.1;
                      
                      // Определяем иконку по полу
                      const icon = b.gender === 'female' ? femaleIcon : maleIcon;
                      
                      return (
                        <Marker key={b.id} position={[cityCoords.lat + latOffset, cityCoords.lng + lngOffset]} icon={icon}>
                          <Popup className="custom-popup">
                            <div className="w-48 bg-[#1c1c1e] text-white p-0 rounded-xl overflow-hidden shadow-xl border border-white/10 flex flex-col">
                               <div className="h-32 w-full relative shrink-0">
                                  <img src={b.images[0] || DEFAULT_AVATAR} className="w-full h-full object-cover" alt={b.name}/>
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                                  <div className="absolute bottom-2 left-3">
                                     <span className="font-black italic uppercase text-lg leading-none block">{b.name}, {b.age}</span>
                                     <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">{b.has_bike ? b.bike : "Ищу того, кто прокатит"}</span>
                                  </div>
                               </div>
                               <button 
                                 onClick={() => { setCurrentIndex(bikers.indexOf(b)); setActiveTab('search'); }}
                                 className="w-full py-3 text-orange-500 font-bold uppercase text-[10px] tracking-widest hover:bg-white/5 transition-colors"
                               >
                                 Открыть анкету
                               </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                   })}
                   
                   {/* Events Markers - временно отключаем геокодирование */}
                   {/* 
                   {events.filter(e => e.coordinates && e.city === userData?.city).map((event, idx) => {
                      const eventIcon = L.divIcon({
                        html: `
                          <div style="
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                            transform: translateY(-50%);
                            position: relative;
                            z-index: 1000;
                          ">
                            📅
                          </div>
                        `,
                        className: 'event-marker',
                        iconSize: [36, 36],
                        iconAnchor: [18, 36],
                        popupAnchor: [0, -30],
                        shadowSize: [0, 0]
                      });
                      
                      return (
                        <Marker 
                          key={event.id} 
                          position={[event.coordinates.lat, event.coordinates.lng]} 
                          icon={eventIcon}
                        >
                          <Popup className="custom-popup">
                            <div className="w-56 bg-[#1c1c1e] text-white p-0 rounded-xl overflow-hidden shadow-xl border border-white/10">
                              <div className="p-4">
                                <h3 className="font-black text-lg mb-2">{event.title}</h3>
                                <p className="text-sm text-zinc-300 mb-3 line-clamp-2">{event.description}</p>
                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-orange-500" />
                                    <span>{event.date} в {event.time}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-orange-500" />
                                    <span>{event.address}</span>
                                  </div>
                                </div>
                                {event.link && (
                                  <button 
                                    onClick={() => window.open(event.link, '_blank')}
                                    className="w-full mt-3 bg-orange-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors"
                                  >
                                    Подробнее
                                  </button>
                                )}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                   })}
                   */}
                </MapContainer>
              )}
              
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-[24px] flex items-center gap-3 z-[10]">
                <Navigation className="text-orange-500" size={18} />
                <div>
                  <p className="text-xs font-black uppercase italic text-white">Байкеры рядом</p>
                  <p className="text-[10px] text-zinc-500 uppercase">В сети: {bikers.filter(b => b.city === userData?.city).length}</p>
                </div>
              </div>
            </div>

            {/* СЕКЦИЯ СОБЫТИЙ */}
            <div className="px-4 mt-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">События в вашем городе</h3>
                <button 
                  onClick={() => setShowEventModal(true)}
                  className="bg-orange-600 w-8 h-8 rounded-full flex items-center justify-center active:scale-90"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                {events.map(event => {
                  const isMyEvent = event.created_by_id === localStorage.getItem('userId');
                  return (
                    <div key={event.id} className="bg-white/3 border border-white/5 rounded-[24px] p-5 relative group">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-sm uppercase italic flex-1 pr-6">{event.title}</h4>
                        {isMyEvent && (
                          <button 
                            onClick={(e) => deleteEvent(e, event.id)}
                            className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {event.description && (
                      <p className="text-xs text-zinc-400 mb-3 italic">{event.description}</p>
                    )}
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                        {event.date && (
                          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg flex-1 justify-center">
                            <Calendar size={14} className="text-orange-500" />
                            <span>{event.date}</span>
                          </div>
                        )}
                        {event.time && (
                          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg flex-1 justify-center">
                            <Clock size={14} className="text-orange-500" />
                            <span>{event.time}</span>
                          </div>
                        )}
                      </div>
                      {event.address && (
                        <button 
                          onClick={() => {
                            // Определяем, мобильное ли устройство
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            
                            if (isMobile) {
                              // На мобильных открываем Яндекс Навигатор приложение
                              // Используем правильный формат для конечной точки
                              const yandexNavigatorUrl = `yandexnavi://show_point?text=${encodeURIComponent(event.address)}&lat=&lon=`;
                              
                              // Пробуем открыть приложение
                              window.location.href = yandexNavigatorUrl;
                              
                              // Fallback - строим маршрут до точки
                              setTimeout(() => {
                                const routeUrl = `yandexnavi://build_route_on_map?text_to=${encodeURIComponent(event.address)}`;
                                window.location.href = routeUrl;
                              }, 1000);
                              
                              // Если приложение не установлено - открываем веб-версию
                              setTimeout(() => {
                                const webUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(event.address)}`;
                                window.open(webUrl, '_blank');
                              }, 3000);
                            } else {
                              // На компьютере открываем Яндекс Карты с точкой
                              const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(event.address)}`;
                              window.open(yandexMapsUrl, '_blank');
                            }
                          }}className="flex items-center gap-2 text-xs text-zinc-500 px-1 hover:text-orange-500 transition-colors cursor-pointer"
                        >
                          <MapPin size={14} className="shrink-0" />
                          <span className="truncate">{event.address}</span>
                        </button>
                      )}
                    </div>
                    {event.link && (
                      <a 
                        href={event.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs text-orange-500 hover:text-orange-400 font-bold uppercase transition-colors"
                      >
                        <span>Подробнее →</span>
                      </a>
                    )}
                  </div>
                  );
                })}
                {events.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 text-xs italic">
                    Пока нет событий. Создайте первое!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ЧАТЫ + НОВЫЕ МЭТЧИ */}
        {activeTab === 'chats' && !selectedChat && (
          <div className="h-full bg-black overflow-y-auto p-6 animate-in fade-in">
            {/* СЕКЦИЯ НОВЫХ МЭТЧЕЙ */}
            {newMatches.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 ml-1">Новые мэтчи</h3>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1 pt-2">
                {newMatches.map(match => (
                    <button
                      key={match.id}
                      onClick={() => {
                        const existingChat = chats.find(c => c.name === match.name);
                        if (existingChat) {
                          openChat(existingChat);
                        } else {
                          const newChat = { 
                            id: Date.now(), 
                            name: match.name, 
                            image: match.image || match.images?.[0], 
                            lastMessage: "Вы пара!", 
                            messages: [], 
                            online: true, 
                            time: "только что", 
                            unreadCount: 0,
                            isNew: true
                          };
                          setChats([newChat, ...chats]);
                          // Убираем из новых мэтчей, но оставляем в сообщениях
                          setNewMatches(prev => prev.map(m => m.id === match.id || m.name === match.name ? {...m, isNew: false} : m));
                          openChat(newChat);
                        }
                      }}
                      className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                    >
                    <div className={`w-14 h-14 rounded-full ${match.isNew ? 'bg-gradient-to-t from-orange-600 to-yellow-400 ring-2 ring-orange-500' : 'bg-gradient-to-t from-zinc-700 to-zinc-800'} p-0.5`}>
                      <img src={match.image || match.images?.[0]} className="w-full h-full object-cover rounded-full" alt="" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase italic ${match.isNew ? 'text-orange-500' : 'text-zinc-400'}`}>{match.name}</span>
                    </button>
                ))}
              </div>
            </div>
            )}

            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 ml-1">Сообщения</h3>
            {chats.length > 0 ? (
            <div className="space-y-3">
                {chats.map(chat => {
                  const isNewMatch = newMatches.some(m => (m.id === chat.id || m.name === chat.name) && m.isNew);
                  
                  const handleTouchStart = (e) => {
                    const touch = e.targetTouches[0];
                    chat.touchStartX = touch.clientX;
                  };
                  
                  const handleTouchMove = (e) => {
                    const touch = e.targetTouches[0];
                    chat.touchCurrentX = touch.clientX;
                  };
                  
                  const handleTouchEnd = () => {
                    if (!chat.touchStartX || !chat.touchCurrentX) return;
                    const distance = chat.touchStartX - chat.touchCurrentX;
                    const minSwipeDistance = 50;
                    
                    if (distance > minSwipeDistance) {
                      setSwipedChatId(chat.id);
                    } else if (distance < -minSwipeDistance) {
                      setSwipedChatId(null);
                    }
                    
                    chat.touchStartX = null;
                    chat.touchCurrentX = null;
                  };
                  
                  return (
                    <div key={chat.id} className="relative overflow-hidden">
                      <div 
                        className={`flex transition-transform duration-300 ${swipedChatId === chat.id ? '-translate-x-32' : 'translate-x-0'}`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <button 
                          onClick={() => {
                            setSwipedChatId(null);
                            openChat(chat);
                          }} 
                          className={`w-full flex items-center gap-4 p-5 rounded-[24px] border hover:scale-[1.01] active:scale-[0.99] transition-all text-left shrink-0 ${
                            isNewMatch 
                              ? 'bg-orange-600/10 border-orange-500 border-2 shadow-lg shadow-orange-500/20' 
                              : 'bg-white/3 border-white/5'
                          }`}
                        >
                          <div className="relative">
                            <img src={chat.image || DEFAULT_AVATAR} className={`w-14 h-14 rounded-[22px] object-cover ${isNewMatch ? 'ring-2 ring-orange-500' : ''}`} alt="" />
                            {onlineUsers.has(chat.partnerId) && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>}
                            {chat.unreadCount > 0 && <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-600 rounded-full border-4 border-black flex items-center justify-center text-[10px] font-black">{chat.unreadCount}</div>}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm uppercase italic">{chat.name}</span>
                                {isNewMatch && (
                                  <span className="px-2 py-0.5 bg-orange-600 text-[8px] font-black uppercase rounded-full text-white animate-pulse">new</span>
                                )}
                              </div>
                              <span className="text-[9px] text-zinc-600 font-bold uppercase">{chat.time}</span>
                            </div>
                            <p className={`text-xs line-clamp-1 ${chat.unreadCount > 0 ? 'text-white font-bold' : 'text-zinc-500'}`}>{chat.lastMessage}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSwipedChatId(swipedChatId === chat.id ? null : chat.id);
                            }}
                            className="p-2 text-zinc-500"
                          >
                            <ChevronDown size={16} className="rotate-90" />
                          </button>
                        </button>
                        
                        {/* Кнопки действий при свайпе */}
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <button
                            onClick={() => {
                              if (confirm('Удалить чат?')) {
                                deleteChat(chat.id);
                                setSwipedChatId(null);
                              }
                            }}
                            className="h-full px-6 bg-red-600 rounded-[24px] flex items-center justify-center hover:scale-[1.05] active:scale-[0.95] transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Заблокировать пользователя?')) {
                                blockUser(chat.id);
                                setSwipedChatId(null);
                              }
                            }}
                            className="h-full px-6 bg-zinc-800 rounded-[32px] flex items-center justify-center active:scale-95"
                          >
                            <Ban size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircle size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-600 text-sm italic uppercase tracking-wider">Пока нет сообщений</p>
                <p className="text-zinc-700 text-xs mt-2">Начните общение с новыми мэтчами</p>
            </div>
            )}
          </div>
        )}

        {/* ОКНО ЧАТА */}
        {selectedChat && (
          <div className="absolute inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="h-20 shrink-0 border-b border-white/5 flex items-center px-6 gap-4 bg-black/80 backdrop-blur-xl">
              <button onClick={() => { setSelectedChat(null); setMessageInput(''); }} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all"><ChevronLeft size={20}/></button>
              <button 
                className="flex items-center gap-3 text-left active:opacity-70 transition-opacity"
                onClick={() => selectedChat.partnerId && handleOpenProfile(selectedChat.partnerId)}
              >
                  <img src={selectedChat.image || DEFAULT_AVATAR} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
                <div>
                <h4 className="font-bold text-sm uppercase italic">{selectedChat.name || 'Пользователь'}</h4>
                  {selectedChat.partnerId && onlineUsers.has(selectedChat.partnerId) && <p className="text-[9px] text-green-500 font-bold uppercase">В сети</p>}
                </div>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 flex flex-col scrollbar-hide">
              {selectedChat.messages && selectedChat.messages.length > 0 ? (
                <>
              {groupMessagesByDate(selectedChat.messages).map((item, idx) => {
                if (item.type === 'separator') {
                  return (
                    <div key={`sep-${idx}`} className="flex items-center justify-center my-4">
                      <div className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-xs font-medium">
                        {item.date}
                      </div>
                    </div>
                  );
                }
                
                const msg = item;
                return (
                  <div 
                      key={msg.id || idx} 
                      className={`max-w-[85%] relative group ${msg.sender === 'me' ? 'self-end' : 'self-start'}`}
                      onClick={() => {
                          if (msg.sender === 'me') {
                              setContextMenuMessageId(contextMenuMessageId === msg.id ? null : msg.id);
                          }
                      }}
                  >
                      {/* Context Menu for Edit/Delete */}
                      {contextMenuMessageId === msg.id && msg.sender === 'me' && (
                          <div className="absolute bottom-full right-0 mb-2 bg-[#1c1c1e] border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors text-left"
                              >
                                  <Trash2 size={14} /> Удалить
                              </button>
                          </div>
                      )}

                      {msg.type === 'image' ? (
                        <div className="relative">
                            <img 
                              src={msg.image} 
                              alt="Sent" 
                              onClick={() => setSelectedImage(msg.image)}
                              className={`rounded-2xl ${msg.sender === 'me' ? 'rounded-br-none' : 'rounded-bl-none'} max-w-[200px] h-auto cursor-pointer active:opacity-80 transition-opacity`}
                            />
                            <div className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-1`}>
                                <span className="text-[9px] text-white/90 font-medium">
                                    {formatMessageTime(msg.created_at)}
                                </span>
                                {msg.sender === 'me' && (
                                     msg.is_read ? <CheckCheck size={10} className="text-white/90" /> : <Check size={10} className="text-white/90" />
                                 )}
                            </div>
                        </div>
                      ) : (
                        <div className={`px-3 py-2 rounded-2xl text-sm border relative min-w-[80px] ${msg.sender === 'me' ? 'bg-orange-600 border-orange-600 text-white rounded-br-none' : 'bg-[#2c2c2e] border-white/5 text-zinc-200 rounded-bl-none'}`}>
                          <div className="flex flex-wrap gap-x-2 items-end">
                            <span className="leading-relaxed break-words whitespace-pre-wrap">{msg.text || ''}</span>
                            {msg.is_edited && <span className="text-[9px] opacity-60 self-center">(ред.)</span>}
                            <div className={`flex items-center gap-1 select-none ml-auto h-4 ${msg.sender === 'me' ? 'text-white/70' : 'text-zinc-500'}`}>
                               <span className="text-[9px] font-medium">
                                  {formatMessageTime(msg.created_at)}
                               </span>
                               {msg.sender === 'me' && (
                                  msg.is_read ? <CheckCheck size={12} /> : <Check size={12} />
                               )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
              <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-zinc-600 text-sm">Начните общение первым!</p>
                </div>
              )}
            </div>
            
            {/* Индикатор печатания */}
            {isPartnerTyping && (
              <div className="px-6 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-zinc-500 text-xs">Собеседник печатает...</span>
                </div>
              </div>
            )}
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-6 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-6 gap-2">
                  {['😀', '😍', '🔥', '🏍️', '❤️', '👍', '😎', '🤘', '🌟', '💨', '😂', '🎉', 
                    '😜', '😇', '🤔', '🤫', '🤭', '🤗', '🤩', '🥳', '🥺', '🤯', '🤠', '😈',
                    '👻', '💀', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀',
                    '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟',
                    '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛'
                  ].map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      onClick={() => {
                        setMessageInput(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-10 h-10 hover:bg-white/10 rounded-lg flex items-center justify-center text-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-3 bg-black border-t border-white/5 flex gap-2 items-end">
              <input 
                type="file" 
                ref={chatFileInputRef}
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e, false)}
                className="hidden"
              />
              <button
                onClick={() => chatFileInputRef.current?.click()}
                className="bg-white/5 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-zinc-400 active:scale-95 transition-all"
              >
                <Camera size={18} />
              </button>
              <textarea 
                placeholder="Сообщение..." 
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  if (e.target.value.length > 0 && selectedChat && window.supabaseManager) {
                     window.supabaseManager.sendTyping(selectedChat.id);
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-[18px] px-4 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors resize-none min-h-[36px] max-h-32 leading-relaxed" 
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="bg-white/5 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-zinc-400 active:scale-95 transition-all relative"
              >
                <Smile size={18} />
              </button>
              <button 
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                className="bg-orange-600 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ПРОФИЛЬ */}
        {activeTab === 'profile' && !showSettings && (
          <div className="h-full overflow-y-auto p-6 animate-in fade-in flex flex-col items-center pt-10">
            {!userData ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full mt-20">
                  <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
                  <p className="text-zinc-500 text-sm italic">Загрузка профиля...</p>
                </div>
            ) : (
            <>
            <div className="relative mb-8">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-[44px] bg-gradient-to-tr from-orange-600 to-yellow-500 p-1 cursor-pointer hover:opacity-90 transition-opacity active:scale-95"
              >
                <div className="w-full h-full rounded-[42px] bg-zinc-900 flex items-center justify-center overflow-hidden border-4 border-black">
                  {userData?.image ? (
                    <img 
                      src={userData.image} 
                      className="w-full h-full object-cover" 
                      alt="Profile" 
                      loading="lazy"
                    />
                  ) : (
                    <User size={60} className="text-zinc-800" />
                  )}
                </div>
              </button>
              <button onClick={() => setShowSettings(true)} data-edit-profile="true" className="absolute bottom-0 right-0 bg-orange-600 p-3 rounded-2xl border-4 border-black text-white transition-transform active:scale-90"><Edit3 size={18} /></button>
            </div>
            <h2 className="text-2xl font-black uppercase italic mb-2">{userData.name}</h2>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">{userData.city}</p>
            {(userData.bike || !userData.has_bike) && (
              <div className="flex items-center gap-2 mb-12">
                <Zap size={14} className="text-orange-500 fill-orange-500" />
                <p className="text-orange-500 text-xs font-bold uppercase tracking-widest">{userData.has_bike ? userData.bike : "Ищу того, кто прокатит"}</p>
              </div>
            )}
            
            {/* ГАЛЕРЕЯ ФОТО */}
            {userImages.length > 0 && (
              <div className="w-full max-w-md mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 ml-1">Галерея</h3>
                <div className="grid grid-cols-3 gap-3">
                  {userImages.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-white/10 relative group">
                      <img src={img} className="w-full h-full object-cover" alt={`Photo ${idx + 1}`} />
                    </div>
                  ))}
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 transition-colors active:scale-95"
                  >
                    <Plus size={20} className="text-zinc-600" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Скрытый input для галереи */}
            <input 
              type="file" 
              ref={galleryInputRef}
              accept="image/*"
              onChange={(e) => handleImageUpload(e, false, true)}
              className="hidden"
            />
            <div className="w-full max-w-md space-y-3">
              <button onClick={() => setShowSettings(true)} data-edit-profile="true" className="w-full bg-white/[0.03] border border-white/5 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4 text-orange-500"><Edit3 size={20}/><span className="font-bold uppercase tracking-tighter text-sm text-white">Редактирование анкеты</span></div>
                <ChevronLeft size={20} className="rotate-180 text-zinc-700" />
              </button>

              <button onClick={() => setShowAppSettings(true)} className="w-full bg-white/[0.03] border border-white/5 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4 text-zinc-400"><Settings size={20}/><span className="font-bold uppercase tracking-tighter text-sm text-white">Настройки</span></div>
                <ChevronLeft size={20} className="rotate-180 text-zinc-700" />
              </button>

              <button onClick={async () => {
                 await supabase.auth.signOut();
                 localStorage.removeItem('userId');
                 localStorage.removeItem('userImages');
                 window.location.reload();
               }} className="w-full bg-white/[0.02] border border-white/5 p-6 rounded-[32px] flex items-center justify-between">
                 <div className="flex items-center gap-4 text-red-500"><LogOut size={20}/><span className="font-bold uppercase tracking-tighter text-sm text-white">Выйти</span></div>
              </button>
            </div>
            </>
            )}
          </div>
        )}

        {/* НАСТРОЙКИ */}
        {showSettings && (
          <div className="absolute inset-0 bg-black z-[100] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="max-w-md mx-auto space-y-8 pb-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowSettings(false)} className="p-2 bg-white/5 rounded-xl"><ChevronLeft size={24}/></button>
                <h2 className="text-xl font-black uppercase italic">Настройки</h2>
              </div>
              <div className="space-y-6 text-white">
                {/* ЗАГРУЗКА ФОТО ПРОФИЛЯ */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase">Фото профиля</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10">
                      {userData?.image ? (
                        <img src={userData.image} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <User size={32} className="text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold uppercase active:scale-95 transition-all"
                    >
                      Загрузить фото
                    </button>
                  </div>
                </div>
                
                {/* ГАЛЕРЕЯ ФОТО */}
                {(userImages.length > 0 || userData?.image) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase">Галерея фото</label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {userImages.map((img, idx) => {
                        const isMainPhoto = userData?.image === img;
                        return (
                          <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group">
                            <img src={img} className="w-full h-full object-cover" alt={`Photo ${idx + 1}`} />
                            {isMainPhoto && (
                              <div className="absolute top-1 left-1 px-2 py-0.5 bg-orange-600 text-[8px] font-black uppercase rounded">Главное</div>
                            )}
                            <button
                              onClick={async () => {
                                if (window.confirm('Вы точно хотите удалить фотографию?')) {
                                  const newImages = userImages.filter((_, i) => i !== idx);
                                  setUserImages(newImages);
                                  await updateGallery(newImages);
                                  // Если удаляем главное фото, убираем его из userData
                                  if (isMainPhoto) {
                                    setUserData({...userData, image: newImages[0] || null});
                                  }
                                }
                              }}
                              className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                            >
                              <X size={12} className="text-white" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Plus size={16} />
                      Добавить фото
                    </button>
                  </div>
                )}

                <div className="space-y-2"><label className="text-[10px] font-black text-zinc-600 uppercase">Имя</label><input type="text" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500" /></div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase">Возраст</label>
                  <input 
                    type="number" 
                    min="18" 
                    max="100" 
                    value={userData.age || ''} 
                    onChange={e => {
                      const age = parseInt(e.target.value);
                      if (e.target.value === '') {
                        setUserData({...userData, age: null});
                      } else if (age >= 18 && age <= 100) {
                        setUserData({...userData, age});
                      }
                    }} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500"
                    placeholder="18+"
                  />
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black text-zinc-600 uppercase">Город</label>
                  <select value={userData.city} onChange={e => setUserData({...userData, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none appearance-none cursor-pointer">
                    {cities.map(c => <option key={c.name} value={c.name} className="bg-zinc-900">{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase">Пол</label>
                  <select 
                    value={userData.gender || 'male'} 
                    onChange={e => setUserData({...userData, gender: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none appearance-none cursor-pointer focus:border-orange-500"
                  >
                    <option value="male" className="bg-zinc-900">Мужской</option>
                    <option value="female" className="bg-zinc-900">Женский</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase">Байк</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 mb-2">
                       <button 
                         onClick={() => setUserData({...userData, has_bike: true})}
                         className={`flex-1 py-3 rounded-xl border transition-all ${userData.has_bike ? 'bg-orange-500 border-orange-500 text-white font-bold' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                       >
                         Есть байк
                       </button>
                       <button 
                         onClick={() => setUserData({...userData, has_bike: false, bike: ''})}
                         className={`flex-1 py-3 rounded-xl border transition-all ${!userData.has_bike ? 'bg-orange-500 border-orange-500 text-white font-bold' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                       >
                         Нет байка
                       </button>
                    </div>
                    {userData.has_bike && (
                      <input 
                        type="text" 
                        value={userData.bike || ''} 
                        onChange={e => setUserData({...userData, bike: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500 animate-in fade-in slide-in-from-top-2" 
                        placeholder="Yamaha R1" 
                      />
                    )}
                  </div>
                </div>
                {/* ВЕРНУЛ ПОЛЕ О СЕБЕ */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase">О себе</label>
                  <textarea 
                    value={userData.about || ''} 
                    onChange={e => setUserData({...userData, about: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 h-24 outline-none focus:border-orange-500 resize-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Темп</label>
                    <select 
                        value={userData.temp || 'Спокойный'} 
                        onChange={e => setUserData({...userData, temp: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500 appearance-none cursor-pointer"
                    >
                        <option value="Спокойный" className="bg-zinc-900">Спокойный</option>
                        <option value="Динамичный" className="bg-zinc-900">Динамичный</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Музыка</label>
                    <select 
                        value={userData.music || 'Рок'} 
                        onChange={e => setUserData({...userData, music: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500 appearance-none cursor-pointer"
                    >
                        {['Рок', 'Поп', 'Рэп', 'Техно', 'Шансон', 'Джаз', 'Метал', 'Классика'].map(genre => (
                            <option key={genre} value={genre} className="bg-zinc-900">{genre}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Экип</label>
                    <select 
                        value={userData.equip || 'Только шлем'} 
                        onChange={e => setUserData({...userData, equip: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500 appearance-none cursor-pointer"
                    >
                        <option value="Только шлем" className="bg-zinc-900">Только шлем</option>
                        <option value="Полный" className="bg-zinc-900">Полный</option>
                        <option value="Нет экипировки" className="bg-zinc-900">Нет экипировки</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Цель</label>
                    <select 
                        value={userData.goal || 'Только поездки'} 
                        onChange={e => setUserData({...userData, goal: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500 appearance-none cursor-pointer"
                    >
                        <option value="Только поездки" className="bg-zinc-900">Только поездки</option>
                        <option value="Симпатия и общение" className="bg-zinc-900">Симпатия и общение</option>
                    </select>
                  </div>
                </div>
              </div>
              <button 
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('users')
                      .update({
                        name: userData.name || null,
                        age: userData.age || null,
                        city: userData.city,
                        bike: userData.bike,
                        gender: userData.gender,
                        about: userData.about,
                        temp: userData.temp,
                        music: userData.music,
                        equip: userData.equip,
                        goal: userData.goal,
                        interests: [
                            { id: 'style', label: 'Стиль', value: userData.temp || 'Спокойный', icon: 'Gauge' },
                            { id: 'music', label: 'Музыка', value: userData.music || 'Рок', icon: 'Music' },
                            { id: 'equip', label: 'Экип', value: userData.equip || 'Только шлем', icon: 'Shield' },
                            { id: 'goal', label: 'Цель', value: userData.goal || 'Только поездки', icon: 'Target' }
                        ]
                      })
                      .eq('id', userData.id);

                    if (error) throw error;
                    
                    alert('Профиль успешно сохранен!');
                    setShowSettings(false);
                    
                    // Обновляем текущий индекс, если текущий байкер не из нового города
                    if (currentBiker && currentBiker.city !== userData.city) {
                        setCurrentIndex(0);
                    }
                    
                    // Reload users to reflect changes if needed
                    if (window.supabaseManager && window.supabaseManager.loadUsers) {
                        window.supabaseManager.loadUsers();
                    }
                  } catch (err) {
                    console.error('Error saving profile:', err);
                    alert('Ошибка при сохранении профиля: ' + err.message);
                  }
                }} 
                className="w-full bg-orange-600 p-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}

        {/* НОВЫЕ НАСТРОЙКИ ПРИЛОЖЕНИЯ */}
        {showAppSettings && (
          <div className="absolute inset-0 bg-black z-[100] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="max-w-md mx-auto space-y-8 pb-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowAppSettings(false)} className="p-2 bg-white/5 rounded-xl"><ChevronLeft size={24}/></button>
                <h2 className="text-xl font-black uppercase italic">Настройки</h2>
              </div>
              
              <div className="space-y-6 text-white">
                 <div className="p-6 bg-white/5 rounded-[24px] border border-white/10 space-y-4">
                   <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Аккаунт</h3>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-600 uppercase">Email</label>
                     {isEditingEmail ? (
                        <div className="space-y-2">
                            <input 
                               type="email" 
                               value={newEmail} 
                               onChange={(e) => setNewEmail(e.target.value)}
                               placeholder="Новый email"
                               className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm outline-none text-white focus:border-orange-500" 
                            />
                            <div className="flex gap-2">
                                <button onClick={handleEmailUpdate} className="flex-1 bg-orange-600 py-2 rounded-xl text-xs font-bold uppercase">Сохранить</button>
                                <button onClick={() => setIsEditingEmail(false)} className="flex-1 bg-white/10 py-2 rounded-xl text-xs font-bold uppercase">Отмена</button>
                            </div>
                        </div>
                     ) : (
                         <div className="flex gap-2">
                            <input 
                               type="email" 
                               value={userData?.email || ''} 
                               readOnly
                               className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm outline-none text-zinc-400 cursor-not-allowed" 
                            />
                            <button onClick={() => { setIsEditingEmail(true); setNewEmail(''); }} className="px-4 bg-white/10 rounded-xl font-bold uppercase text-xs hover:bg-white/20 transition-colors">Изм.</button>
                         </div>
                     )}
                   </div>
                   {/* СМЕНА ПАРОЛЯ */}
                   <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                     <label className="text-[10px] font-black text-zinc-600 uppercase">Пароль</label>
                     {isEditingPassword ? (
                        <div className="space-y-2">
                            <input 
                               type="password" 
                               value={newPassword} 
                               onChange={(e) => setNewPassword(e.target.value)}
                               placeholder="Новый пароль"
                               className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm outline-none text-white focus:border-orange-500" 
                            />
                            <div className="flex gap-2">
                                <button onClick={handlePasswordUpdate} className="flex-1 bg-orange-600 py-2 rounded-xl text-xs font-bold uppercase">Сохранить</button>
                                <button onClick={() => setIsEditingPassword(false)} className="flex-1 bg-white/10 py-2 rounded-xl text-xs font-bold uppercase">Отмена</button>
                            </div>
                        </div>
                     ) : (
                         <button onClick={() => { setIsEditingPassword(true); setNewPassword(''); }} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-between px-4">
                            <span>Сменить пароль</span>
                            <ChevronLeft size={16} className="rotate-180 text-zinc-600" />
                         </button>
                     )}
                   </div>
                 </div>
                 


                 <button className="w-full bg-red-500/10 border border-red-500/20 p-6 rounded-[24px] flex items-center justify-center gap-2 text-red-500 font-black uppercase tracking-widest active:scale-95 transition-all">
                    <Trash2 size={20} />
                    Удалить аккаунт
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* ЭКРАН МЭТЧА - только в поиске */}
        {matchData && activeTab === 'search' && matchData.images && matchData.images.length > 0 && (
          <div className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in zoom-in">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-orange-500 animate-bounce mb-12 text-center">Это<br/>Мэтч!</h2>
            <div className="flex gap-4 mb-16 relative">
              <img src={userData.image || DEFAULT_AVATAR} className="w-32 h-32 rounded-[32px] border-4 border-white -rotate-12 object-cover" style={{ objectFit: 'cover' }} alt="" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-600 p-4 rounded-full z-10 animate-pulse"><Heart fill="white" size={32}/></div>
              <img src={matchData.images[0] || DEFAULT_AVATAR} className="w-32 h-32 rounded-[32px] border-4 border-white rotate-12 object-cover" style={{ objectFit: 'cover' }} alt="" />
            </div>
            <div className="w-full max-w-xs space-y-4">
              <button onClick={() => { 
                const newChat = { id: Date.now(), name: matchData.name, image: matchData.images[0], lastMessage: "Вы пара!", messages: [], online: true, time: "1 сек", unreadCount: 0, isNew: true };
                setChats([newChat, ...chats]);
                setMatchData(null); 
                setActiveTab('chats');
                openChat(newChat);
              }} className="w-full bg-white text-black p-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-3"><MessageSquare size={20}/> Написать</button>
              <button onClick={() => { setMatchData(null); handleNext(); }} className="w-full bg-white/10 text-white p-5 rounded-[24px] font-black uppercase tracking-widest border border-white/10">Позже</button>
            </div>
          </div>
        )}

        {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ СОБЫТИЯ */}
        {showEventModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowEventModal(false)} />
            <div className="relative w-full max-w-md bg-[#1c1c1e]/95 border border-white/10 p-8 rounded-[32px] shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase italic">Создать событие</h2>
                <button onClick={() => setShowEventModal(false)} className="p-2 bg-white/5 rounded-xl">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-1.5 ml-1 uppercase tracking-widest">Название</label>
                  <input 
                    type="text" 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-orange-500"
                    placeholder="Ночной прохват"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-1.5 ml-1 uppercase tracking-widest">Описание</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 h-24 text-sm outline-none focus:border-orange-500 resize-none"
                    placeholder="Описание события..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <Calendar size={18} className="text-zinc-400 flex-shrink-0" />
                    <input 
                      type="date" 
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="flex-1 bg-transparent text-sm outline-none text-white placeholder-zinc-500"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <Clock size={18} className="text-zinc-400 flex-shrink-0" />
                    <input 
                      type="time" 
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      className="flex-1 bg-transparent text-sm outline-none text-white placeholder-zinc-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <MapPinIcon size={18} className="text-zinc-400 flex-shrink-0" />
                    <AddressAutocomplete
                      value={newEvent.address}
                      onChange={(value) => setNewEvent({...newEvent, address: value})}
                      placeholder="Место встречи"
                    />
                  </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-1.5 ml-1 uppercase tracking-widest">Ссылка на организатора</label>
                  <input 
                    type="url" 
                    value={newEvent.link}
                    onChange={(e) => setNewEvent({...newEvent, link: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-orange-500"
                    placeholder="https://vk.com/event или https://t.me/event"
                  />
                </div>
                <button 
                  onClick={createEvent}
                  className="w-full bg-orange-600 p-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-4"
                >
                  Создать событие
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW PROFILE MODAL */}
        {viewingProfile && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center animate-in fade-in duration-200">
             <div className="w-full max-w-md h-full bg-black relative flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300 sm:rounded-[32px] sm:h-[90vh] sm:border sm:border-white/10">
                <div className="flex items-center gap-4 mb-4 p-4 shrink-0 z-10">
                  <button onClick={() => setViewingProfile(null)} className="p-2 bg-white/5 rounded-xl backdrop-blur-md"><ChevronLeft size={24}/></button>
                  <h2 className="text-xl font-black uppercase italic">Анкета</h2>
                </div>
              
                <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
                  <div className="relative aspect-[3/4] overflow-hidden mb-4">
                    <img 
                      src={viewingProfile.images && viewingProfile.images.length > 0 ? viewingProfile.images[0] : DEFAULT_AVATAR} 
                      className="w-full h-full object-cover" 
                      alt="" 
                    />
                    <div 
                      className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
                      style={{ height: '60%', background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)' }}
                    />
                    <div className="absolute bottom-0 left-0 p-8 w-full z-30">
                      <h2 className="text-4xl font-black uppercase italic leading-none mb-2">{viewingProfile.name}</h2>
                      <div className="flex items-center gap-2 text-zinc-300 font-medium mb-2">
                        <MapPin size={16} className="text-orange-500" />
                        <span className="uppercase tracking-widest text-xs">{viewingProfile.city || 'Не указан'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap size={16} className="text-orange-500 fill-orange-500 drop-shadow-2xl" />
                        <p className="text-orange-500 text-sm font-bold uppercase tracking-widest drop-shadow-2xl">{viewingProfile.has_bike ? viewingProfile.bike : "Ищу того, кто прокатит"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {viewingProfile.interests && viewingProfile.interests.map((item) => (
                      <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-orange-500">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-black text-zinc-500 tracking-wider mb-0.5">{item.label}</div>
                          <div className="font-bold text-sm">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {viewingProfile.about && (
                    <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] mb-4">
                      <div className="text-[10px] uppercase font-black text-zinc-500 tracking-wider mb-3 flex items-center gap-2">
                        <Info size={14} />
                        О себе
                      </div>
                      <p className="text-zinc-300 leading-relaxed font-medium">{viewingProfile.about}</p>
                    </div>
                  )}
                  
                  {viewingProfile.images && viewingProfile.images.length > 1 && (
                     <div className="space-y-4 mb-4">
                        {viewingProfile.images.slice(1).map((img, idx) => (
                           <div key={idx} className="rounded-[32px] overflow-hidden border border-white/10">
                              <img src={img} className="w-full h-full object-cover" alt="" />
                           </div>
                        ))}
                     </div>
                  )}
              </div>
           </div>
          </div>
        )}
      </main>

      <nav className="h-24 shrink-0 flex items-start justify-center px-4 relative z-50">
        <div className="w-full max-w-sm h-16 bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] flex items-center justify-around shadow-2xl">
              <button onClick={() => {
                setActiveTab('search'); 
                setSelectedChat(null); 
                setMatchData(null); 
                setSwipedChatId(null); 
                setShowSettings(false); 
                setShowAppSettings(false); 
                setNewEvent({ title: '', description: '', date: '', time: '', address: '', link: '' });
                setShowEventModal(false);
              }} className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'search' ? 'text-orange-500' : 'text-zinc-600'}`}><Search size={22}/><span className="text-[9px] font-black uppercase">Поиск</span></button>
          <button onClick={() => {
                setActiveTab('map'); 
                setSelectedChat(null); 
                setMatchData(null); 
                setSwipedChatId(null); 
                setShowSettings(false); 
                setShowAppSettings(false); 
                setShowEventModal(false);
              }} className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'map' ? 'text-orange-500' : 'text-zinc-600'}`}><MapPin size={22}/><span className="text-[9px] font-black uppercase">Карта</span></button>
          <button onClick={() => {
                setActiveTab('chats'); 
                setSelectedChat(null); 
                setMatchData(null); 
                setHasNewMatchNotification(false); 
                setSwipedChatId(null); 
                setShowSettings(false); 
                setShowAppSettings(false); 
                setShowEventModal(false);
              }} className={`flex flex-col items-center gap-1 relative transition-colors active:scale-95 ${activeTab === 'chats' ? 'text-orange-500' : 'text-zinc-600'}`}>
              <MessageCircle size={22}/>
              <span className="text-[9px] font-black uppercase">Чаты</span>
              {hasNewMatchNotification && <div className="absolute top-0 right-1 w-2 h-2 bg-orange-600 rounded-full border-2 border-[#1c1c1e]" />}
          </button>
          <button onClick={() => {
                setActiveTab('profile'); 
                setSelectedChat(null); 
                setMatchData(null); 
                setSwipedChatId(null); 
                setShowSettings(false); 
                setShowAppSettings(false); 
                setShowEventModal(false);
              }} className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'profile' ? 'text-orange-500' : 'text-zinc-600'}`}><User size={22}/><span className="text-[9px] font-black uppercase">Профиль</span></button>
      </div>
    </nav>
      
      {/* МОДАЛЬНОЕ ОКНО ПРИВЕТСТВИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowWelcomeModal(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button 
              onClick={() => setShowWelcomeModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
            >
              <X size={20} />
            </button>
            
            <div className="p-8 text-center">
              <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">
                Приветствуем в <span className="text-orange-500">МОТОЗНАКОМСТВА</span>
              </h2>
              
              <p className="text-zinc-300 text-lg leading-relaxed mb-8">
                Добавьте фотографии и заполните профиль, чтобы найти интересных байкеров в вашем городе!
              </p>
              
              <div className="space-y-4 text-left mb-8">
                <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 bg-orange-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-500 font-bold text-sm">1</span>
                  </div>
                  <span className="text-sm">Загрузите свои лучшие фото</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 bg-orange-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-500 font-bold text-sm">2</span>
                  </div>
                  <span className="text-sm">Расскажите о себе и своем байке</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 bg-orange-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-500 font-bold text-sm">3</span>
                  </div>
                  <span className="text-sm">Начните искать единомышленников</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setShowWelcomeModal(false);
                  setActiveTab('profile');
                  setTimeout(() => {
                    // Имитируем клик на кнопку редактирования профиля
                    const editButton = document.querySelector('[data-edit-profile="true"]');
                    if (editButton) {
                      editButton.click();
                    }
                  }, 100);
                }}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(234,88,12,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Заполнить профиль
                <ArrowRight size={20} />
              </button>
              
              <button 
                onClick={() => setShowWelcomeModal(false)}
                className="w-full text-zinc-500 hover:text-zinc-400 text-sm mt-4 transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Стили для скрытия скроллбара */}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

export default MainApp;
