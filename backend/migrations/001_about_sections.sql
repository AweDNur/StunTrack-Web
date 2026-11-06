-- Menambahkan section About tanpa menghapus content About lama.
ALTER TABLE about_web
  ADD COLUMN the_site TEXT NULL,
  ADD COLUMN story TEXT NULL,
  ADD COLUMN credits TEXT NULL,
  ADD COLUMN people TEXT NULL,
  ADD COLUMN papers TEXT NULL,
  ADD COLUMN press TEXT NULL;
