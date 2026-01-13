-- Исправление старых значений по умолчанию в базе данных
UPDATE users SET 
  temp = CASE 
    WHEN temp = 'Спорт' THEN 'Спокойный'
    WHEN temp IN ('Aggressive', 'Sport') THEN 'Агрессивный'
    WHEN temp IN ('Calm', 'Slow') THEN 'Спокойный'
    ELSE temp
  END,
  music = CASE 
    WHEN music = 'Rock' THEN 'Рок'
    WHEN music IN ('Pop', 'Hip-Hop', 'Jazz', 'Classical') THEN 
      CASE music
        WHEN 'Pop' THEN 'Поп'
        WHEN 'Hip-Hop' THEN 'Хип-хоп'
        WHEN 'Jazz' THEN 'Джаз'
        WHEN 'Classical' THEN 'Классика'
      END
    ELSE music
  END,
  equip = CASE 
    WHEN equip = 'Full' THEN 'Полный'
    WHEN equip IN ('Helmet only', 'Minimal') THEN 'Только шлем'
    ELSE equip
  END,
  goal = CASE 
    WHEN goal = 'Катка' THEN 'Только поездки'
    WHEN goal IN ('Dating', 'Friends', 'Racing') THEN
      CASE goal
        WHEN 'Dating' THEN 'Симпатия и общение'
        WHEN 'Friends' THEN 'Дружба'
        WHEN 'Racing' THEN 'Гонки'
      END
    ELSE goal
  END
WHERE temp IN ('Спорт', 'Aggressive', 'Sport', 'Calm', 'Slow') 
   OR music IN ('Rock', 'Pop', 'Hip-Hop', 'Jazz', 'Classical')
   OR equip IN ('Full', 'Helmet only', 'Minimal')
   OR goal = 'Катка';
