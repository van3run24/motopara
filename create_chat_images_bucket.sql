-- Создание bucket для изображений в чатах
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images', 
  'chat-images', 
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Политики доступа для bucket chat-images

-- Политика для загрузки изображений в чаты
CREATE POLICY "Users can upload chat images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-images' AND 
  auth.role() = 'authenticated' AND
  SPLIT_PART(name, '/', 1) = auth.uid()::text
);

-- Политика для просмотра изображений в чатах
CREATE POLICY "Chat images are publicly viewable" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-images'
);

-- Политика для обновления изображений в чатах
CREATE POLICY "Users can update own chat images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat-images' AND 
  auth.role() = 'authenticated' AND
  SPLIT_PART(name, '/', 1) = auth.uid()::text
);

-- Политика для удаления изображений в чатах
CREATE POLICY "Users can delete own chat images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-images' AND 
  auth.role() = 'authenticated' AND
  SPLIT_PART(name, '/', 1) = auth.uid()::text
);
