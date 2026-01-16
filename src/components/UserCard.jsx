import { memo } from 'react';
import { Heart, X, Zap } from 'lucide-react';

const UserCard = ({ 
  user, 
  onLike, 
  onDislike, 
  onImageClick, 
  setCurrentImageIndex, 
  currentImageIndex,
  getProfileImage 
}) => {
  return (
    <div className="relative w-full h-full">
      {/* Изображения */}
      <div className="relative h-3/4 bg-black overflow-hidden">
        {user.images && user.images.length > 0 ? (
          <img 
            src={user.images[currentImageIndex]} 
            alt={user.name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => onImageClick(user.images, currentImageIndex)}
            loading="lazy"
          />
        ) : (
          <img 
            src={getProfileImage(user)} 
            alt={user.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        
        {/* Полоски и индикатор изображений */}
        {user.images && user.images.length > 0 && (
          <div className="absolute top-6 left-6 right-6 flex gap-1.5 z-30 pointer-events-none">
            {user.images.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all ${i === currentImageIndex ? 'bg-orange-500' : 'bg-white/30'}`} 
              />
            ))}
          </div>
        )}
        
        {/* Затемнение внизу для читаемости */}
        <div 
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" 
          style={{ 
            height: '45%', 
            background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)' 
          }} 
        />
      </div>

      {/* Информация о пользователе */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <h2 className="text-white text-2xl font-black mb-1">{user.name}</h2>
            <p className="text-white/90 text-sm mb-2">{user.age} лет</p>
            <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-4">{user.city}</p>
            {user.bike && user.has_bike && (
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-orange-500 fill-orange-500" />
                <p className="text-orange-500 text-xs font-bold uppercase tracking-widest">{user.bike}</p>
              </div>
            )}
          </div>
          
          {/* Кнопки действий */}
          <div className="flex gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onDislike(); }}
              className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center active:scale-90 shadow-lg hover:bg-white/20 transition-all relative z-50"
            >
              <X size={28} className="text-white/90" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-2xl active:scale-90 hover:scale-105 transition-all relative z-50"
            >
              <Heart fill="white" size={36} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(UserCard);
