import React, { useState } from 'react';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    city: '',
    bike: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Список городов для выбора
  const cities = [
    "Москва", "Санкт-Петербург", "Екатеринбург", 
    "Казань", "Краснодар", "Новосибирск", 
    "Сочи", "Нижний Новгород", "Ростов-на-Дону"
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    if (isSignUp) {
      if (!formData.name) {
        newErrors.name = 'Имя обязательно';
      }
      if (!formData.city) {
        newErrors.city = 'Выберите город';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Имитация задержки API
    setTimeout(() => {
      // Сохраняем данные пользователя при регистрации
      if (isSignUp && formData.city && formData.name) {
        const userData = {
          name: formData.name,
          age: 25,
          city: formData.city,
          bike: formData.bike || 'Не указан',
          about: 'Новый байкер',
          temp: 'Любой',
          music: 'Любая',
          equip: 'Есть шлем',
          goal: 'Покатушки'
        };
        localStorage.setItem('userData', JSON.stringify(userData));
      }
      
      setIsSubmitting(false);
      onLogin();
    }, 800);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', name: '', city: '', bike: '' });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleToggleSignUp = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-[#1c1c1e]/95 border border-white/10 p-8 rounded-[32px] shadow-2xl backdrop-blur-2xl">
        
        {/* Крестик */}
        <button onClick={handleClose} className="absolute top-5 right-5 text-zinc-600 hover:text-zinc-400 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold mb-2 tracking-tight">{isSignUp ? 'Создать профиль' : 'Вход'}</h2>
          <p className="text-zinc-500 text-[13px]">{isSignUp ? 'Выбери город и начни общение' : 'С возвращением в дорогу'}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 mb-1.5 ml-1 uppercase tracking-[0.1em]">Email</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full bg-white/3 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-4 py-4 text-white outline-none focus:border-orange-500/50 transition-all text-[15px]`} 
              placeholder="rider@example.com" 
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
          </div>

          {isSignUp && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              {/* ИМЯ */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1.5 ml-1 uppercase tracking-[0.1em]">Ваше имя</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full bg-white/3 border ${errors.name ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-4 py-4 text-white outline-none focus:border-orange-500/50 transition-all text-[15px]`} 
                  placeholder="Как к вам обращаться?" 
                />
                {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name}</p>}
              </div>
              {/* ВЫБОР ГОРОДА */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1.5 ml-1 uppercase tracking-[0.1em]">Твой город</label>
                <div className="relative">
                  <select 
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className={`w-full bg-white/3 border ${errors.city ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-4 py-4 text-white outline-none focus:border-orange-500/50 transition-all text-[15px] appearance-none cursor-pointer`}
                  >
                    <option value="" disabled className="bg-zinc-900 text-zinc-500">Выберите город...</option>
                    {cities.map((city) => (
                      <option key={city} value={city} className="bg-zinc-900 text-white">
                        {city}
                      </option>
                    ))}
                  </select>
                  {/* Иконка стрелочки вниз */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
                {errors.city && <p className="text-red-500 text-xs mt-1 ml-1">{errors.city}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1.5 ml-1 uppercase tracking-[0.1em]">Твой байк</label>
                <input 
                  type="text" 
                  value={formData.bike}
                  onChange={(e) => handleChange('bike', e.target.value)}
                  className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none focus:border-orange-500/50 transition-all text-[15px]" 
                  placeholder="Марка и модель" 
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 mb-1.5 ml-1 uppercase tracking-[0.1em]">Пароль</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={`w-full bg-white/3 border ${errors.password ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-4 py-4 text-white outline-none focus:border-orange-500/50 transition-all text-[15px]`} 
              placeholder="••••••••" 
            />
            {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>}
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-[20px] mt-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Загрузка...' : (isSignUp ? 'Завести мотор' : 'Погнали')}
          </button>
        </form>

        {/* Остальные элементы (Разделитель, соцсети) оставляем как были... */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#1c1c1e] px-3 text-zinc-600 font-bold">или</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span className="text-sm font-medium">Google</span>
          </button>
          <button type="button" className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#0077FF] hover:bg-[#0066DD] transition-all">
            <span className="text-xs font-black text-white italic">VK</span>
            <span className="text-sm font-medium text-white">ВКонтакте</span>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button onClick={handleToggleSignUp} className="text-zinc-500 hover:text-white text-[13px] transition-colors">
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Еще нет аккаунта? Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;