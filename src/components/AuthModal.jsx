import React, { useState } from 'react';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { cities } from '../data/cities';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    city: 'Москва',
    gender: 'male'
  });

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleVkLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'vk',
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        
        if (data.session) {
          localStorage.setItem('userId', data.user.id);
          onLogin();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              city: formData.city,
              gender: formData.gender
            },
          },
        });

        if (error) throw error;

        if (data.session) {
           localStorage.setItem('userId', data.user.id);
           onLogin();
        } else if (data.user) {
           alert('Регистрация успешна! Пожалуйста, проверьте почту для подтверждения.');
           setIsLogin(true);
        }
      }
    } catch (err) {
      let errorMessage = err.message || 'Произошла ошибка';
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Неверный email или пароль';
      } else if (errorMessage.includes('User not found')) {
        errorMessage = 'Пользователь не найден';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-2">
              {isLogin ? 'С возвращением' : 'Создать аккаунт'}
            </h2>
            <p className="text-zinc-400 text-sm">
              {isLogin ? 'Войди, чтобы продолжить путь' : 'Присоединяйся к сообществу'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-500 ml-3">Имя</label>
                  <input
                    type="text"
                    required
                    placeholder="Как тебя зовут?"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-zinc-500 ml-3">Город</label>
                      <select
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        {cities.map(city => (
                            <option key={city.name} value={city.name} className="bg-zinc-900">{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-zinc-500 ml-3">Пол</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="male" className="bg-zinc-900">Парень</option>
                        <option value="female" className="bg-zinc-900">Девушка</option>
                      </select>
                    </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-zinc-500 ml-3">Email</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-zinc-500 ml-3">Пароль</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white font-bold py-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(234,88,12,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
            
            <div className="relative flex items-center gap-4 py-2">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-xs text-zinc-500 uppercase font-bold">Или</span>
                <div className="h-px bg-white/10 flex-1" />
            </div>
            
            <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
               <svg className="w-5 h-5" viewBox="0 0 24 24">
                 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
               Google
            </button>
            <button
              type="button"
              onClick={handleVkLogin}
              disabled={loading}
              className="flex-1 bg-[#0077FF] text-white hover:bg-[#0077FF]/90 font-bold py-3 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M13.162 18.994c.609 0 1.016-.067 1.239-.142.12-.04.24-.092.36-.16.27-.156.406-.361.406-1.116 0-.895.033-1.353.136-1.492.083-.113.23-.207.575-.207.135 0 .28.016.435.05.679.148 1.487.89 1.94 1.58.463.704.53 1.05.53 1.05s.315.437.765.437h2.25s1.23.08 1.485-1.05c.03-.135 0-.75-1.095-2.43-.885-1.35-2.025-2.385-2.19-2.61-.435-.6.105-1.92 1.83-4.2 1.35-1.785 2.145-2.88 2.22-3.09.12-.33-.06-.6-.06-.6l-2.64-.015c-.24 0-.495.06-.66.27-.105.135-.66 1.71-1.575 3.255-1.89 3.195-2.61 3.39-2.925 3.195-.735-.465-.54-2.025-.54-3.09 0-3.375.525-4.785-1.02-4.785-.51 0-.885.08-1.29.21-.63.21-1.125.645-1.125.645s-.885.045-1.23.015c-.405-.03-.795.195-.795.195s2.46.225 2.715 1.545c.09.465.06 2.085-.24 2.895-.195.54-.66 1.05-1.59.39-2.31-1.635-3.87-4.635-3.87-4.635s-.285-.705-.81-.705l-2.52.015s-.375.015-.525.18c-.135.15-.015.465-.015.465s1.965 4.59 4.185 8.715c2.025 3.765 4.305 3.51 4.305 3.51z"/>
               </svg>
               VK
            </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
              <span className="text-orange-500 font-bold hover:underline">
                {isLogin ? 'Создать' : 'Войти'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
