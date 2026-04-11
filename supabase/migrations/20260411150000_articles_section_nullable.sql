-- Legacy `section` column: allow NULL and drop default so imports can leave it unset
-- (Diffuse and other flows use `sections`[] for placement; no implicit "general").

ALTER TABLE public.articles
  ALTER COLUMN section DROP DEFAULT;

ALTER TABLE public.articles
  ALTER COLUMN section DROP NOT NULL;
