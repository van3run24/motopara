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
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
       console.error("Error uploading avatar:", error);
       throw error;
    }
    
    // Получаем публичный URL с временной меткой для предотвращения кэширования
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    const timestampedUrl = `${publicUrl}?t=${Date.now()}`;
      
    // Обновляем ссылку на фото в профиле пользователя
    await this.updateUser(userId, { image: timestampedUrl });
    
    return timestampedUrl;
  },

  // Загрузка фото в галерею
  async uploadGalleryImage(userId, file) {
    console.log('Original gallery file size:', (file.size / 1024 / 1024).toFixed(2) + ' MB');
    
    // Сжимаем изображение перед загрузкой (для галереи используем чуть меньшее качество)
    const compressedFile = await compressImage(file, 1200, 1200, 0.7);
    console.log('Compressed gallery file size:', (compressedFile.size / 1024 / 1024).toFixed(2) + ' MB');
    
    const fileExt = 'jpg'; // Всегда сохраняем как JPG после сжатия
    const fileName = `${userId}/gallery/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('gallery')
      .upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
       console.error("Error uploading gallery image:", error);
       throw error;
    }
    
    // Получаем публичный URL с временной меткой для предотвращения кэширования
    const { data: { publicUrl } } = supabase.storage
      .from('gallery')
      .getPublicUrl(fileName);
    
    const timestampedUrl = `${publicUrl}?t=${Date.now()}`;
    
    return timestampedUrl;
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
    const { data, error } = await supabase
      .from('events')
      .insert([{
        ...eventData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Получение событий города
  async getCityEvents(city) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('city', city)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Получение всех событий
  async getAllEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};
