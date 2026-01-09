import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, MapPin, MessageCircle, User, X, Gauge, Music, Shield, Target, Edit3, Settings, LogOut, ChevronLeft, ChevronDown, MessageSquare, Send, Camera, Navigation, Zap, Trash2, Ban, Image as ImageIcon, Plus, Calendar, Clock, MapPin as MapPinIcon } from 'lucide-react';

const MainApp = () => {
  // --- СОСТОЯНИЯ ПРИЛОЖЕНИЯ ---
  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState('search');
  const [showSettings, setShowSettings] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [hasNewMatchNotification, setHasNewMatchNotification] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const [swipedChatId, setSwipedChatId] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const touchStartYRef = useRef(null);
  const [events, setEvents] = useState([
    { id: 1, title: "Ночной прохват по МКАД", description: "Сбор в 22:00", date: "2024-12-25", time: "22:00", address: "МКАД, съезд 10" },
    { id: 2, title: "Встреча байкеров", description: "Еженедельная встреча", date: "2024-12-28", time: "19:00", address: "Парк Горького" }
  ]);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', address: '' });
  const fileInputRef = useRef(null);
  const chatFileInputRef = useRef(null);

  // Данные пользователя
  const [userData, setUserData] = useState({
    name: "Алексей",
    age: 28,
    city: "Москва",
    about: "Ищу компанию для прохватов на выходных.",
    temp: "Динамичный",
    music: "Rock",
    equip: "Full Leather",
    goal: "Покатушки",
    image: "https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=800"
  });
  const [cardExpanded, setCardExpanded] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const cities = ["Москва", "Санкт-Петербург", "Сочи", "Краснодар"];

  // База данных байкеров
  const [bikers] = useState([
    {
      id: 1,
      name: "Анна",
      age: 24,
      city: "Москва",
      bike: "Ducati Monster",
      about: "Люблю скорость и итальянский дизайн. Ищу компанию для поездок на гору.",
      images: [
        "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800",
        "https://images.unsplash.com/photo-1558981403-c5f91cbba527?w=800",
        "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?w=800"
      ],
      interests: [
        { icon: <Gauge size={14} />, label: "Темп", value: "Бодрый" },
        { icon: <Music size={14} />, label: "Музыка", value: "Techno" },
        { icon: <Shield size={14} />, label: "Экип", value: "Full Leather" },
        { icon: <Target size={14} />, label: "Цель", value: "Покатушки" }
      ],
      coords: { x: 45, y: 30 }
    },
    {
      id: 2,
      name: "Анастасия",
      age: 22,
      city: "Москва",
      bike: "Ищу пилота 🏍️",
      about: "Своего байка нет, но очень хочу вкатиться в тему.",
      images: ["https://images.unsplash.com/photo-1525253086316-d0c936c814f8?w=800"],
      interests: [
        { icon: <Gauge size={14} />, label: "Темп", value: "Любой" },
        { icon: <Music size={14} />, label: "Музыка", value: "Pop" },
        { icon: <Shield size={14} />, label: "Экип", value: "Есть шлем" },
        { icon: <Target size={14} />, label: "Цель", value: "Стать двойкой" }
      ],
      coords: { x: 60, y: 55 }
    }
  ]);

  const filteredBikers = bikers.filter(b => b.city === userData.city);
  const currentBiker = filteredBikers[currentIndex];

  const [chats, setChats] = useState([
    {
      id: 1,
      name: "Анна",
      lastMessage: "Когда выезжаем?",
      time: "14:20",
      image: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800",
      online: true,
      unreadCount: 1,
      messages: [
        { id: 1, text: "Привет! Классный байк", sender: "them" },
        { id: 2, text: "Спасибо, твой Монстр тоже огонь!", sender: "me" }
      ]
    }
  ]);

  const [newMatches, setNewMatches] = useState([
    { id: 101, name: "Ольга", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200", isNew: true },
    { id: 102, name: "Мария", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200", isNew: true }
  ]);
  const [userImages, setUserImages] = useState([userData.image]);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Загрузка данных пользователя из localStorage
  useEffect(() => {
    const savedUserData = localStorage.getItem('userData');
    const savedUserImages = localStorage.getItem('userImages');
    if (savedUserData) {
      try {
        const data = JSON.parse(savedUserData);
        setUserData(data);
        if (data.image) {
          setUserImages([data.image]);
        }
      } catch (e) {
        console.error('Ошибка загрузки данных пользователя:', e);
      }
    }
    if (savedUserImages) {
      try {
        const images = JSON.parse(savedUserImages);
        if (images.length > 0) {
          setUserImages(images);
        }
      } catch (e) {
        console.error('Ошибка загрузки галереи:', e);
      }
    }
  }, []);
  
  // Обновление индекса при изменении города
  useEffect(() => {
    if (filteredBikers.length > 0 && currentIndex >= filteredBikers.length) {
      setCurrentIndex(0);
    }
  }, [userData.city, filteredBikers.length, currentIndex]);

  // Сохранение данных пользователя в localStorage
  useEffect(() => {
    localStorage.setItem('userData', JSON.stringify(userData));
  }, [userData]);

  // Сохранение галереи фото в localStorage
  useEffect(() => {
    if (userImages.length > 0) {
      localStorage.setItem('userImages', JSON.stringify(userImages));
    }
  }, [userImages]);

  const handleNext = () => {
    if (filteredBikers.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % filteredBikers.length);
      setCurrentImageIndex(0);
    }
  };

  const handleLike = () => {
    if (Math.random() > 0.5) {
        setMatchData(currentBiker);
        setHasNewMatchNotification(true);
        setNewMatches(prev => [{...currentBiker, isNew: true}, ...prev]);
    } else {
        handleNext();
    }
  };

  // Закрываем мэтч при смене вкладки
  useEffect(() => {
    if (activeTab !== 'search') {
      setMatchData(null);
    }
  }, [activeTab]);

  const switchImage = (e) => {
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
      }
    }
  };

  const openChat = (chat) => {
    setSelectedChat(chat);
    setActiveTab('chats');
    const updatedChats = chats.map(c => c.id === chat.id ? {...c, unreadCount: 0, isNew: false} : c);
    setChats(updatedChats);
    // Убираем из новых мэтчей
    setNewMatches(prev => prev.map(m => m.id === chat.id || m.name === chat.name ? {...m, isNew: false} : m));
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

  const handleImageUpload = (e, isProfile = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isProfile) {
          const imageUrl = reader.result;
          // Если это первое фото или главное фото не установлено, делаем его главным
          if (!userData.image || userImages.length === 0) {
            setUserData({...userData, image: imageUrl});
          }
          // Добавляем в галерею
          setUserImages([imageUrl, ...userImages]);
        } else {
          // Загрузка фото в чат
          if (!selectedChat) return;
          const imageMessage = {
            id: Date.now(),
            text: '',
            sender: 'me',
            image: reader.result,
            type: 'image'
          };
          const updatedChat = {
            ...selectedChat,
            messages: [...selectedChat.messages, imageMessage],
            lastMessage: 'Фото',
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          };
          setSelectedChat(updatedChat);
          setChats(chats.map(c => c.id === selectedChat.id ? updatedChat : c));
        }
      };
      reader.readAsDataURL(file);
    }
    // Сброс input для возможности загрузки того же файла снова
    if (isProfile) {
      fileInputRef.current.value = '';
    } else {
      chatFileInputRef.current.value = '';
    }
  };

  const createEvent = () => {
    if (newEvent.title && newEvent.date && newEvent.time) {
      setEvents([...events, { id: Date.now(), ...newEvent }]);
      setNewEvent({ title: '', description: '', date: '', time: '', address: '' });
      setShowEventModal(false);
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;
    
    const newMessage = {
      id: Date.now(),
      text: messageInput.trim(),
      sender: 'me'
    };

    const updatedChat = {
      ...selectedChat,
      messages: [...selectedChat.messages, newMessage],
      lastMessage: messageInput.trim(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };

    setSelectedChat(updatedChat);
    setChats(chats.map(c => c.id === selectedChat.id ? updatedChat : c));
    setMessageInput('');
  };

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isSplashing) {
    return (
      <div className="fixed inset-0 bg-black z-[1000] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center animate-in fade-in duration-1000">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-4">
                МОТО<span className="text-orange-500">ЗНАКОМСТВА</span>
            </h1>
            <div className="w-32 h-0.5 bg-zinc-800 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-orange-600 animate-out slide-out-to-right duration-[2000ms] ease-in-out" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden font-sans animate-in fade-in duration-500">
      
      {!selectedChat && (
        <header className="h-16 shrink-0 backdrop-blur-xl bg-black/50 border-b border-white/5 flex items-center justify-between px-6 z-40">
          <div className="text-lg font-black tracking-tighter italic uppercase">Мото<span className="text-orange-500">Знакомства</span></div>
          <button onClick={() => {setActiveTab('profile');}} className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center ${activeTab === 'profile' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5'}`}>
            <User size={20} className={activeTab === 'profile' ? 'text-orange-500' : 'text-zinc-400'} />
          </button>
        </header>
      )}

      <main className="flex-1 relative overflow-hidden">
        
        {activeTab === 'search' && (
          <div className="h-full flex flex-col items-center justify-center relative">
            {filteredBikers.length > 0 ? (
              <div className={`w-full h-full max-w-md flex flex-col items-center relative ${cardExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                {/* Карточка с изображением (окно) */}
                <article className="w-full mx-4 mt-6 rounded-3xl overflow-hidden bg-black/20 shadow-lg">
                  <div 
                    className={`relative w-full ${cardExpanded ? 'h-[60vh] shrink-0' : 'h-[66vh]'} cursor-pointer transition-all duration-300 pointer-events-auto`}
                    onClick={switchImage}
                    onTouchStart={(e) => {
                      if (cardExpanded) return;
                      touchStartYRef.current = e.touches[0].clientY;
                    }}
                    onTouchMove={(e) => {
                      if (cardExpanded || touchStartYRef.current == null) return;
                      const currentY = e.touches[0].clientY;
                      if (touchStartYRef.current - currentY > 40) {
                        setCardExpanded(true);
                        touchStartYRef.current = null;
                      }
                    }}
                    onTouchEnd={() => { touchStartYRef.current = null; }}
                    onWheel={(e) => {
                      if (cardExpanded) return;
                      if (e.deltaY < -40) setCardExpanded(true);
                    }}
                  >
                    <img 
                      src={currentBiker.images[currentImageIndex]} 
                      className="absolute inset-0 w-full h-full object-cover z-10" 
                      alt="Biker" 
                    />

                    {/* Полоски */}
                    <div className="absolute top-4 left-6 right-6 flex gap-1.5 z-30 pointer-events-none">
                      {currentBiker.images.map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i === currentImageIndex ? 'bg-orange-500' : 'bg-white/20'}`} />
                      ))}
                    </div>

                    {/* Затемнение внизу для читаемости (усиленное и точно поверх картинки) */}
                    <div
                      className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
                      style={{ height: '40%', background: 'linear-gradient(0deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)' }}
                    />

                    {/* Имя, возраст и байк внизу внутри картинки */}
                    <div className="absolute bottom-6 left-6 right-6 z-30 pointer-events-none">
                      <h3 className="text-4xl font-black tracking-tight uppercase italic text-white drop-shadow-2xl mb-2">{currentBiker.name}, {currentBiker.age}</h3>
                      <div className="flex items-center gap-2">
                        <Zap size={16} className="text-orange-500 fill-orange-500 drop-shadow-2xl" />
                        <p className="text-orange-500 text-sm font-bold uppercase tracking-widest drop-shadow-2xl">{currentBiker.bike}</p>
                      </div>
                    </div>

                    {/* Индикатор свайпа вверх (оставляем поверх картинки) */}
                    {!cardExpanded && (
                      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce pointer-events-none z-20">
                        <ChevronDown size={20} className="text-white/60" />
                      </div>
                    )}
                  </div>
                </article>

                {/* Иконки/чипы сразу под карточкой */}
                <div className="w-full px-6 -mt-6 mb-4 z-30 pointer-events-auto">
                  <div className="mx-auto max-w-sm flex items-center justify-center gap-3 text-zinc-400 text-xs uppercase">
                    {currentBiker.interests.slice(0,3).map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-2xl px-3 py-2">
                        <div className="text-zinc-300">{it.icon}</div>
                        <div className="text-[11px] font-bold tracking-tight text-zinc-200">{it.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Фиксированная панель действий внизу экрана */}
                <div className="fixed left-0 right-0 bottom-28 flex justify-center z-50 pointer-events-none">
                  <div className="pointer-events-auto mx-4 w-full max-w-md flex items-center justify-center gap-10">
                    <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center active:scale-90 shadow-lg"><X size={28} className="text-white/80" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-2xl active:scale-90"><Heart fill="white" size={36} className="text-white" /></button>
                    <></>
                  </div>
                </div>

              {/* РАСКРЫВАЮЩАЯСЯ ИНФОРМАЦИЯ ПРИ СВАЙПЕ ВВЕРХ */}
              <div 
                className={`bg-[#0a0a0a] transition-all duration-300 ${cardExpanded ? 'flex-1' : 'h-0 overflow-hidden'}`}
                onTouchStart={(e) => {
                  // start tracking for swipe down to close when expanded
                  if (!cardExpanded) return;
                  touchStartYRef.current = e.touches[0].clientY;
                }}
                onTouchMove={(e) => {
                  if (touchStartYRef.current == null) return;
                  const currentY = e.touches[0].clientY;
                  const diff = touchStartYRef.current - currentY;
                  // if swiped down enough while expanded -> collapse
                  if (cardExpanded && diff < -40) {
                    setCardExpanded(false);
                    touchStartYRef.current = null;
                  }
                }}
                onTouchEnd={() => { touchStartYRef.current = null; }}
              >
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black uppercase italic">О себе</h4>
                    <button 
                      onClick={() => setCardExpanded(false)}
                      className="p-2 bg-white/5 rounded-xl active:scale-90"
                    >
                      <ChevronDown size={20} className="rotate-180" />
                    </button>
                  </div>
                  <p className="text-lg text-zinc-200 leading-relaxed font-light italic">"{currentBiker.about}"</p>
                  <div className="grid grid-cols-2 gap-3">
                    {currentBiker.interests.map((item, idx) => (
                      <div key={idx} className="bg-white/3 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                        <div className="text-zinc-500 flex items-center gap-2 mb-1">{item.icon}<span className="text-[9px] uppercase font-bold tracking-tighter">{item.label}</span></div>
                        <span className="text-sm font-semibold text-white/90">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-20" />
                </div>
              </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-600 text-sm italic uppercase tracking-wider mb-2">Нет анкет в этом городе</p>
                <p className="text-zinc-700 text-xs">Попробуйте изменить город в настройках</p>
              </div>
            )}
          </div>
        )}

        {/* КАРТА */}
        {activeTab === 'map' && (
          <div className="h-full overflow-y-auto bg-black animate-in fade-in">
            {/* КАРТА */}
            <div className="relative bg-[#0a0a0a] mx-4 mt-4 rounded-[32px] border border-white/10 overflow-hidden" style={{ height: '40vh', minHeight: '300px' }}>
            <div className="absolute inset-0 overflow-hidden opacity-20">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>
            {bikers.map(b => (
                <button 
                  key={b.id} 
                  onClick={() => { setCurrentIndex(bikers.indexOf(b)); setActiveTab('search'); }}
                  className="absolute p-1 bg-orange-600 rounded-full border-2 border-white animate-bounce z-10"
                style={{ left: `${b.coords.x}%`, top: `${b.coords.y}%` }}
                >
                  <img src={b.images[0]} className="w-10 h-10 rounded-full object-cover" alt="" />
                </button>
              ))}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-[0_0_20px_rgba(59,130,246,0.5)] z-10" />
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-[24px] flex items-center gap-3">
                <Navigation className="text-orange-500" size={18} />
                <div>
                  <p className="text-xs font-black uppercase italic text-white">Байкеры рядом</p>
                  <p className="text-[10px] text-zinc-500 uppercase">В сети: {bikers.length}</p>
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
                {events.map(event => (
                  <div key={event.id} className="bg-white/3 border border-white/5 rounded-[24px] p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-sm uppercase italic flex-1">{event.title}</h4>
                    </div>
                    {event.description && (
                      <p className="text-xs text-zinc-400 mb-3 italic">{event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500 uppercase">
                      {event.date && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{event.date}</span>
                        </div>
                      )}
                      {event.time && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{event.time}</span>
                        </div>
                      )}
                      {event.address && (
                        <div className="flex items-center gap-1">
                          <MapPinIcon size={12} />
                          <span>{event.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
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
                    <div className={`w-16 h-16 rounded-2xl p-0.5 ${match.isNew ? 'bg-gradient-to-t from-orange-600 to-yellow-400 ring-2 ring-orange-500' : 'bg-gradient-to-t from-zinc-700 to-zinc-800'}`}>
                      <img src={match.image || match.images?.[0]} className="w-full h-full object-cover rounded-[14px] border-2 border-black" alt="" />
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
                          className={`w-full flex items-center gap-4 p-5 rounded-[32px] border active:scale-95 transition-all text-left shrink-0 ${
                            isNewMatch 
                              ? 'bg-orange-600/10 border-orange-500 border-2 shadow-lg shadow-orange-500/20' 
                              : 'bg-white/3 border-white/5'
                          }`}
                        >
                          <div className="relative">
                            <img src={chat.image} className={`w-14 h-14 rounded-[22px] object-cover ${isNewMatch ? 'ring-2 ring-orange-500' : ''}`} alt="" />
                            {chat.online && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>}
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
                            className="h-full px-6 bg-red-600 rounded-[32px] flex items-center justify-center active:scale-95"
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
              <div className="flex items-center gap-3">
                <img src={selectedChat.image} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
                <div>
                <h4 className="font-bold text-sm uppercase italic">{selectedChat.name}</h4>
                  {selectedChat.online && <p className="text-[9px] text-green-500 font-bold uppercase">В сети</p>}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col italic font-medium scrollbar-hide">
              {selectedChat.messages.length > 0 ? (
                <>
              {selectedChat.messages.map(msg => (
                    <div key={msg.id} className={`max-w-[85%] ${msg.sender === 'me' ? 'self-end' : 'self-start'}`}>
                      {msg.type === 'image' ? (
                        <img 
                          src={msg.image} 
                          alt="Sent" 
                          className={`rounded-[24px] ${msg.sender === 'me' ? 'rounded-tr-none' : 'rounded-tl-none'} max-w-full h-auto`}
                        />
                      ) : (
                        <div className={`p-4 rounded-[24px] text-sm ${msg.sender === 'me' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white/5 text-zinc-200 rounded-tl-none border border-white/5'}`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-zinc-600 text-sm italic">Начните общение первым!</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-black border-t border-white/5 flex gap-3">
              <input 
                type="file" 
                ref={chatFileInputRef}
                accept="image/*"
                onChange={(e) => handleImageUpload(e, false)}
                className="hidden"
              />
              <button
                onClick={() => chatFileInputRef.current?.click()}
                className="bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all"
              >
                <Camera size={20} />
              </button>
              <input 
                type="text" 
                placeholder="Сообщение..." 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleMessageKeyPress}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-orange-500/50 transition-colors" 
              />
              <button 
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                className="bg-orange-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ПРОФИЛЬ */}
        {activeTab === 'profile' && !showSettings && (
          <div className="h-full overflow-y-auto p-6 animate-in fade-in flex flex-col items-center pt-10">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-[44px] bg-gradient-to-tr from-orange-600 to-yellow-500 p-1">
                <div className="w-full h-full rounded-[42px] bg-zinc-900 flex items-center justify-center overflow-hidden border-4 border-black">
                  {userData.image ? (
                    <img src={userData.image} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <User size={60} className="text-zinc-800" />
                  )}
                </div>
              </div>
              <button onClick={() => setShowSettings(true)} className="absolute bottom-0 right-0 bg-orange-600 p-3 rounded-2xl border-4 border-black text-white transition-transform active:scale-90"><Edit3 size={18} /></button>
            </div>
            <h2 className="text-2xl font-black uppercase italic mb-2">{userData.name}</h2>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-[0.2em] mb-12">{userData.city}</p>
            
            {/* ГАЛЕРЕЯ ФОТО */}
            {userImages.length > 0 && (
              <div className="w-full max-w-md mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 ml-1">Галерея</h3>
                <div className="grid grid-cols-3 gap-3">
                  {userImages.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-white/10">
                      <img src={img} className="w-full h-full object-cover" alt={`Photo ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="w-full max-w-md space-y-3">
              <button onClick={() => setShowSettings(true)} className="w-full bg-white/[0.03] border border-white/5 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4 text-orange-500"><Settings size={20}/><span className="font-bold uppercase tracking-tighter text-sm text-white">Настройки анкеты</span></div>
                <ChevronLeft size={20} className="rotate-180 text-zinc-700" />
              </button>
              <button onClick={() => {setIsSplashing(true); setTimeout(() => window.location.reload(), 300);}} className="w-full bg-white/[0.02] border border-white/5 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4 text-red-500"><LogOut size={20}/><span className="font-bold uppercase tracking-tighter text-sm text-white">Выйти</span></div>
              </button>
            </div>
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
                      {userData.image ? (
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase">Галерея фото</label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {userImages.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group">
                        <img src={img} className="w-full h-full object-cover" alt={`Photo ${idx + 1}`} />
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 px-2 py-0.5 bg-orange-600 text-[8px] font-black uppercase rounded">Главное</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    Добавить фото
                  </button>
                </div>

                <div className="space-y-2"><label className="text-[10px] font-black text-zinc-600 uppercase">Имя</label><input type="text" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-zinc-600 uppercase">Возраст</label><input type="number" min="18" max="100" value={userData.age || ''} onChange={e => setUserData({...userData, age: parseInt(e.target.value) || 18})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-orange-500 uppercase">Город</label>
                  <select value={userData.city} onChange={e => setUserData({...userData, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none appearance-none cursor-pointer">
                    {cities.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                  </select>
                </div>
                {/* ВЕРНУЛ ПОЛЕ О СЕБЕ */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase">О себе</label>
                  <textarea 
                    value={userData.about} 
                    onChange={e => setUserData({...userData, about: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 h-24 outline-none focus:border-orange-500 resize-none italic text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Темп</label>
                    <input type="text" value={userData.temp} onChange={e => setUserData({...userData, temp: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500" placeholder="Динамичный" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Музыка</label>
                    <input type="text" value={userData.music} onChange={e => setUserData({...userData, music: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500" placeholder="Rock" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Экип</label>
                    <input type="text" value={userData.equip} onChange={e => setUserData({...userData, equip: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500" placeholder="Full Leather" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase">Цель</label>
                    <input type="text" value={userData.goal} onChange={e => setUserData({...userData, goal: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500" placeholder="Покатушки" />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSettings(false);
                  // Обновляем текущий индекс, если текущий байкер не из нового города
                  if (currentBiker && currentBiker.city !== userData.city) {
                    setCurrentIndex(0);
                  }
                }} 
                className="w-full bg-orange-600 p-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}

        {/* ЭКРАН МЭТЧА - только в поиске */}
        {matchData && activeTab === 'search' && (
          <div className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in zoom-in">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-orange-500 animate-bounce mb-12 text-center">Это<br/>Мэтч!</h2>
            <div className="flex gap-4 mb-16 relative">
              <img src={userData.image} className="w-32 h-32 rounded-[32px] border-4 border-white -rotate-12" alt="" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-600 p-4 rounded-full z-10 animate-pulse"><Heart fill="white" size={32}/></div>
              <img src={matchData.images[0]} className="w-32 h-32 rounded-[32px] border-4 border-white rotate-12" alt="" />
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 mb-1.5 ml-1 uppercase tracking-widest">Дата</label>
                    <input 
                      type="date" 
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 mb-1.5 ml-1 uppercase tracking-widest">Время</label>
                    <input 
                      type="time" 
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-1.5 ml-1 uppercase tracking-widest">Адрес</label>
                  <input 
                    type="text" 
                    value={newEvent.address}
                    onChange={(e) => setNewEvent({...newEvent, address: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-orange-500"
                    placeholder="Место встречи"
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
      </main>

      <nav className="h-24 shrink-0 flex items-start justify-center px-4 relative z-30">
        <div className="w-full max-w-sm h-16 bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] flex items-center justify-around shadow-2xl">
              <button onClick={() => {setActiveTab('search'); setSelectedChat(null); setMatchData(null); setSwipedChatId(null); setShowSettings(false); setCardExpanded(false);}} className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'search' ? 'text-orange-500' : 'text-zinc-600'}`}><Search size={22}/><span className="text-[9px] font-black uppercase">Поиск</span></button>
          <button onClick={() => {setActiveTab('map'); setSelectedChat(null); setSwipedChatId(null); setShowSettings(false); setCardExpanded(false);}} className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'map' ? 'text-orange-500' : 'text-zinc-600'}`}><MapPin size={22}/><span className="text-[9px] font-black uppercase">Карта</span></button>
          <button onClick={() => {setActiveTab('chats'); setSelectedChat(null); setHasNewMatchNotification(false); setSwipedChatId(null); setShowSettings(false); setCardExpanded(false);}} className={`flex flex-col items-center gap-1 relative transition-colors active:scale-95 ${activeTab === 'chats' ? 'text-orange-500' : 'text-zinc-600'}`}>
              <MessageCircle size={22}/>
              <span className="text-[9px] font-black uppercase">Чаты</span>
              {hasNewMatchNotification && <div className="absolute top-0 right-1 w-2 h-2 bg-orange-600 rounded-full border-2 border-[#1c1c1e]" />}
          </button>
          <button onClick={() => {setActiveTab('profile'); setSwipedChatId(null); setCardExpanded(false);}} className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'profile' ? 'text-orange-500' : 'text-zinc-600'}`}><User size={22}/><span className="text-[9px] font-black uppercase">Профиль</span></button>
        </div>
      </nav>
      {/* Стили для скрытия скроллбара */}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default MainApp;