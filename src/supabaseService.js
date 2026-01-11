import { supabase } from './supabaseClient';

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
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    // Проверяем существование бакета, если нет - создаем (только если есть права)
    // В реальном приложении бакеты создаются администратором заранее
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
       console.error("Error uploading avatar:", error);
       throw error;
    }
    
    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
      
    // Обновляем ссылку на фото в профиле пользователя
    await this.updateUser(userId, { image: publicUrl });
    
    return publicUrl;
  },

  // Загрузка фото в галерею
  async uploadGalleryImage(userId, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/gallery/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('gallery')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
       console.error("Error uploading gallery image:", error);
       throw error;
    }
    
    // Получаем публичный URL
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
