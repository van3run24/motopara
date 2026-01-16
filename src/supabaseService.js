import { supabase } from './supabaseClient';

// Функция для сжатия изображений
export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Вычисляем новые размеры с сохранением пропорций
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Рисуем сжатое изображение
      ctx.drawImage(img, 0, 0, width, height);
      
      // Конвертируем в blob с указанным качеством
      canvas.toBlob(
        (blob) => {
          // Создаем новый File из blob
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Функции для работы с пользователями
export const userService = {
  // Получение всех пользователей
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    return data;
  },

  // Получение пользователя по ID
  async getUserById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Создание нового пользователя
  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Обновление пользователя
  async updateUser(userId, userData) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Загрузка аватара в Supabase Storage
  async uploadAvatar(userId, file) {
    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2) + ' MB');
    
    // Сжимаем изображение перед загрузкой
    const compressedFile = await compressImage(file, 800, 800, 0.8);
    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2) + ' MB');
    
    const fileExt = 'jpg'; // Всегда сохраняем как JPG после сжатия
    const fileName = `${userId}/avatar.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, compressedFile, {
        cacheControl: '86400', // 24 часа кэширования
        upsert: true
      });
    
    if (error) {
       console.error("Error uploading avatar:", error);
       throw error;
    }
    
    // Получаем публичный URL без временной метки для кэширования
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // Обновляем ссылку на фото в профиле пользователя
    await this.updateUser(userId, { image: publicUrl });
    
    return publicUrl;
  },

  // Загрузка фото в галерею
  async uploadGalleryImage(userId, file) {
    console.log('Original gallery file size:', (file.size / 1024 / 1024).toFixed(2) + ' MB');
    
    // Сжимаем изображение перед загрузкой (для галереи используем чуть меньшее качество)
    const compressedFile = await compressImage(file, 1200, 1200, 0.7);
    console.log('Compressed gallery file size:', (compressedFile.size / 1024 / 1024).toFixed(2) + ' MB');
    
    const fileExt = 'jpg'; // Всегда сохраняем как JPG после сжатия
    const fileName = `${userId}/gallery/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('gallery')
      .upload(fileName, compressedFile, {
        cacheControl: '86400', // 24 часа кэширования
        upsert: false
      });
    
    if (uploadError) {
       console.error("Error uploading gallery image:", uploadError);
       throw uploadError;
    }
    
    // Получаем публичный URL без временной метки для кэширования
    const { data: { publicUrl } } = supabase.storage
      .from('gallery')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }
};

// Функции для работы с чатами
export const chatService = {
  // Создание нового чата
  async createChat(participant1Id, participant2Id) {
    const { data, error } = await supabase
      .from('chats')
      .insert([{
        participant_1_id: participant1Id,
        participant_2_id: participant2Id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Получение чатов пользователя
  async getUserChats(userId) {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        participant_1:participant_1_id(name, image),
        participant_2:participant_2_id(name, image)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Отправка сообщения
  async sendMessage(chatId, messageData) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        ...messageData,
        chat_id: chatId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Получение сообщений чата
  async getChatMessages(chatId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Подписка на новые сообщения в реальном времени
  subscribeToMessages(chatId, callback) {
    return supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        }, 
        callback
      )
      .subscribe();
  }
};

// Функции для работы с событиями
export const eventService = {
  // Создание события
  async createEvent(eventData) {
    // Сначала создаем групповой чат для события
    const { data: groupChat, error: chatError } = await supabase
      .from('group_chats')
      .insert([{
        event_id: null, // временно null, обновим после создания события
        name: eventData.title,
        created_by_id: eventData.created_by_id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (chatError) throw chatError;
    
    // Добавляем создателя в участники чата
    await supabase
      .from('group_chat_participants')
      .insert([{
        group_chat_id: groupChat.id,
        user_id: eventData.created_by_id,
        joined_at: new Date().toISOString()
      }]);
    
    // Создаем событие с привязкой к групповому чату
    const { data, error } = await supabase
      .from('events')
      .insert([{
        ...eventData,
        group_chat_id: groupChat.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Обновляем event_id в групповом чате
    await supabase
      .from('group_chats')
      .update({ event_id: data.id })
      .eq('id', groupChat.id);
    
    return data;
  },

  // Получение событий города
  async getCityEvents(city) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        group_chats:group_chat_id(
          id,
          name,
          created_by_id,
          group_chat_participants(
            user_id,
            joined_at
          )
        )
      `)
      .eq('city', city)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Получение всех событий
  async getAllEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        group_chats:group_chat_id(
          id,
          name,
          created_by_id,
          group_chat_participants(
            user_id,
            joined_at
          )
        )
      `)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};

// Функции для работы с групповыми чатами
export const groupChatService = {
  // Присоединение к групповому чату
  async joinGroupChat(groupChatId, userId) {
    const { data, error } = await supabase
      .from('group_chat_participants')
      .insert([{
        group_chat_id: groupChatId,
        user_id: userId,
        joined_at: new Date().toISOString()
      }])
      .select(`
        *,
        user:users(
          id,
          name,
          image
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Выход из группового чата
  async leaveGroupChat(groupChatId, userId) {
    const { error } = await supabase
      .from('group_chat_participants')
      .delete()
      .eq('group_chat_id', groupChatId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  },

  // Получение участников группового чата
  async getGroupChatParticipants(groupChatId) {
    const { data, error } = await supabase
      .from('group_chat_participants')
      .select(`
        *,
        user:users(
          id,
          name,
          image
        )
      `)
      .eq('group_chat_id', groupChatId)
      .order('joined_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Проверка, состоит ли пользователь в групповом чате
  async isUserInGroupChat(groupChatId, userId) {
    const { data, error } = await supabase
      .from('group_chat_participants')
      .select('*')
      .eq('group_chat_id', groupChatId)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data;
  },

  // Получение сообщений группового чата
  async getGroupChatMessages(groupChatId) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(
          id,
          name,
          image
        )
      `)
      .eq('group_chat_id', groupChatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Отправка сообщения в групповой чат
  async sendGroupMessage(groupChatId, messageData) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        ...messageData,
        chat_id: null, // Для групповых чатов используем group_chat_id
        group_chat_id: groupChatId,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        sender:users(
          id,
          name,
          image
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Подписка на сообщения группового чата в реальном времени
  subscribeToGroupMessages(groupChatId, callback) {
    return supabase
      .channel(`group_messages:${groupChatId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `group_chat_id=eq.${groupChatId}`
        }, 
        callback
      )
      .subscribe();
  },

  // Получение информации о групповом чате
  async getGroupChat(groupChatId) {
    const { data, error } = await supabase
      .from('group_chats')
      .select(`
        *,
        event:events(
          id,
          title,
          description,
          date,
          time,
          address
        ),
        group_chat_participants(
          user_id,
          joined_at,
          user:users(
            id,
            name,
            image
          )
        )
      `)
      .eq('id', groupChatId)
      .single();
    
    if (error) throw error;
    return data;
  }
};
