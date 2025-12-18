-- PART 2: STORAGE POLICIES
-- Run this after Part 1

CREATE POLICY "Public Access Videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Authenticated Upload Videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Authenticated Delete Videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos');

CREATE POLICY "Public Access Audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-files');

CREATE POLICY "Authenticated Upload Audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Authenticated Delete Audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'audio-files');

CREATE POLICY "Public Access Thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated Upload Thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated Delete Thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Public Access Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated Upload Images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated Delete Images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');
