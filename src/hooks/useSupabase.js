import { useState, useEffect, useCallback } from 'react';
import { userService, chatService, eventService } from '../supabaseService';

export const useSupabase = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeChats, setRealtimeChats] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // Инициализация пользователя
  const initializeUser = async (userData) => {
    try {
      setLoading(true);
      // Проверяем есть ли пользователь в Supabase
      const existingUsers = await userService.getAllUsers();
      const existingUser = existingUsers.find(u => u.email === userData.email);
      
      if (!existingUser) {
        // Создаем нового пользователя
        const newUser = await userService.createUser(userData);
        localStorage.setItem('userId', newUser.id);
        return newUser;
      } else {
        // Обновляем существующего пользователя
        const updatedUser = await userService.updateUser(existingUser.id, userData);
        localStorage.setItem('userId', updatedUser.id);
        return updatedUser;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error initializing user:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Получение пользователей для поиска
  const getUsersForSearch = async (currentUserId, city, gender) => {
    try {
      const allUsers = await userService.getAllUsers();
      return allUsers.filter(user => 
        user.id !== currentUserId &&
        user.city === city &&
        user.gender !== gender
      );
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  // Загрузка аватара
  const uploadAvatar = async (userId, file) => {
    try {
      setLoading(true);
      const avatarUrl = await userService.uploadAvatar(userId, file);
      return avatarUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Загрузка фото в галерею
  const uploadGalleryImage = async (userId, file) => {
    try {
      setLoading(true);
      const imageUrl = await userService.uploadGalleryImage(userId, file);
      return imageUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Создание чата
  const createChat = async (participant1Id, participant2Id) => {
    try {
      const chat = await chatService.createChat(participant1Id, participant2Id);
      return chat;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Отправка сообщения
  const sendMessage = async (chatId, messageData) => {
    try {
      const message = await chatService.sendMessage(chatId, messageData);
      return message;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Получение чатов пользователя
  const getUserChats = async (userId) => {
    try {
      const chats = await chatService.getUserChats(userId);
      return chats;
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  // Создание события
  const createEvent = async (eventData) => {
    try {
      const event = await eventService.createEvent(eventData);
      return event;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Получение событий города
  const getCityEvents = async (city) => {
    try {
      const events = await eventService.getCityEvents(city);
      return events;
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  // Подписка на сообщения
  const subscribeToMessages = useCallback((chatId, callback) => {
    const subscription = chatService.subscribeToMessages(chatId, callback);
    setSubscriptions(prev => [...prev, subscription]);
    return subscription;
  }, []);

  // Отписка от всех подписок
  const unsubscribeAll = useCallback(() => {
    subscriptions.forEach(subscription => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    setSubscriptions([]);
  }, [subscriptions]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, [unsubscribeAll]);

  // Очистка ошибок
  const clearError = () => setError(null);

  return {
    loading,
    error,
    clearError,
    realtimeChats,
    initializeUser,
    getUsersForSearch,
    uploadAvatar,
    uploadGalleryImage,
    createChat,
    sendMessage,
    getUserChats,
    createEvent,
    getCityEvents,
    subscribeToMessages,
    unsubscribeAll
  };
};
