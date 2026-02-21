-- ============================================
-- Fix: Diffuse AI must never appear as notification actor
-- ============================================
-- Diffuse AI is an author/byline, not a real user. Notifications should always
-- show the actual human user who performed the action (publish, edit, archive).
-- If the actor resolves to Diffuse AI, skip creating the notification.
-- ============================================

-- Helper: returns true if name matches Diffuse AI pattern (author/byline, not actor)
CREATE OR REPLACE FUNCTION is_diffuse_ai_actor(name_val TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF name_val IS NULL OR name_val = '' THEN
    RETURN false;
  END IF;
  RETURN lower(trim(name_val)) LIKE '%powered by diffuse%'
     OR lower(trim(name_val)) LIKE '%diffuse.ai%'
     OR lower(trim(name_val)) LIKE '%diffuse ai%';
END;
$$;

-- ============================================
-- 1. Trigger: Article published
-- ============================================
CREATE OR REPLACE FUNCTION notify_article_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_name_val TEXT;
  actor_id UUID;
BEGIN
  IF NEW.status != 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.status IS NOT NULL AND OLD.status = 'published') THEN
    RETURN NEW;  -- Already published, not a publish event
  END IF;

  -- Actor: the user who performed the publish (updated_by or author_id/created_by on INSERT)
  actor_id := NEW.updated_by;
  IF actor_id IS NULL THEN
    actor_id := NEW.author_id;  -- Fallback for INSERT as published
  END IF;

  SELECT full_name INTO actor_name_val FROM user_profiles WHERE id = actor_id;

  IF actor_name_val IS NULL AND actor_id IS NOT NULL THEN
    actor_name_val := 'Unknown';
  ELSIF actor_name_val IS NULL THEN
    actor_name_val := 'System';
  END IF;

  -- Diffuse AI is an author, not an actor - never notify as if Diffuse AI performed the action
  IF is_diffuse_ai_actor(actor_name_val) THEN
    RETURN NEW;
  END IF;

  PERFORM notify_admins(
    'article_published',
    'Article "' || COALESCE(NEW.title, 'Untitled') || '" was published by ' || actor_name_val,
    'article',
    NEW.id,
    actor_name_val
  );
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. Trigger: Article edited
-- ============================================
CREATE OR REPLACE FUNCTION notify_article_edited()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_name_val TEXT;
  is_real_edit BOOLEAN := false;
BEGIN
  IF NEW.status != 'published' THEN
    RETURN NEW;
  END IF;
  IF OLD.status != 'published' THEN
    RETURN NEW;
  END IF;

  IF OLD.title IS DISTINCT FROM NEW.title
     OR OLD.slug IS DISTINCT FROM NEW.slug
     OR OLD.subtitle IS DISTINCT FROM NEW.subtitle
     OR OLD.excerpt IS DISTINCT FROM NEW.excerpt
     OR OLD.content IS DISTINCT FROM NEW.content
     OR OLD.content_blocks IS DISTINCT FROM NEW.content_blocks
     OR OLD.image_url IS DISTINCT FROM NEW.image_url
     OR OLD.section IS DISTINCT FROM NEW.section
     OR OLD.sections IS DISTINCT FROM NEW.sections
     OR OLD.category IS DISTINCT FROM NEW.category
     OR OLD.tags IS DISTINCT FROM NEW.tags
     OR OLD.author_name IS DISTINCT FROM NEW.author_name
     OR OLD.meta_title IS DISTINCT FROM NEW.meta_title
     OR OLD.meta_description IS DISTINCT FROM NEW.meta_description
     OR OLD.is_featured IS DISTINCT FROM NEW.is_featured
     OR OLD.is_breaking IS DISTINCT FROM NEW.is_breaking
  THEN
    is_real_edit := true;
  END IF;

  IF NOT is_real_edit THEN
    RETURN NEW;
  END IF;

  -- Actor must be the real user who edited (updated_by), never author_name
  SELECT full_name INTO actor_name_val FROM user_profiles WHERE id = NEW.updated_by;

  IF actor_name_val IS NULL THEN
    actor_name_val := 'Unknown';
  END IF;

  -- Diffuse AI is an author/byline - never create notifications attributing edits to it
  IF is_diffuse_ai_actor(actor_name_val) THEN
    RETURN NEW;
  END IF;

  PERFORM notify_admins(
    'article_edited',
    'Article "' || COALESCE(NEW.title, 'Untitled') || '" was edited by ' || actor_name_val,
    'article',
    NEW.id,
    actor_name_val
  );
  RETURN NEW;
END;
$$;
