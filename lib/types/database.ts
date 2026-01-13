export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type ArticleSection = 'hero' | 'world' | 'local' | 'sports' | 'business' | 'politics' | 'technology' | 'entertainment' | 'opinion' | 'general';

export interface ContentBlock {
  id: string;
  type: "text" | "image";
  content?: string;
  url?: string;
  caption?: string;
  credit?: string;
  order: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  account_number: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  newsletter_subscribed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string; // Legacy content (still supported)
  content_blocks: ContentBlock[]; // New: Block-based content
  image_url: string | null;
  image_caption: string | null;
  image_credit: string | null;
  use_featured_image: boolean; // New: Toggle for featured image
  status: ArticleStatus;
  published_at: string | null;
  scheduled_for: string | null;
  section: ArticleSection; // Legacy (still supported)
  sections: string[]; // New: Multiple sections
  category: string | null;
  tags: string[] | null;
  author_id: string | null;
  author_name: string | null;
  meta_title: string | null;
  meta_description: string | null;
  view_count: number;
  share_count: number;
  is_featured: boolean;
  is_breaking: boolean;
  breaking_news_duration: number; // Hours to stay as breaking news
  breaking_news_set_at: string | null; // When marked as breaking news
  allow_comments: boolean;
  updated_by: string | null;
}

export interface Ad {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string;
  ad_slot: string; // Legacy field, kept for backwards compatibility
  start_date: string; // ISO datetime string
  end_date: string; // ISO datetime string
  is_active: boolean;
  runtime_seconds: number | null; // Duration in seconds for rotation
  display_order: number; // Order in rotation sequence
  fill_section: boolean; // Whether to fill section with image (object-cover) or keep true size (object-contain)
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AdSlotAssignment {
  id: string;
  ad_id: string;
  ad_slot: string;
  fill_section: boolean; // Per-slot fill setting
  created_at: string;
}

export interface AdSetting {
  id: string;
  ad_slot: string;
  use_fallback: boolean;
  fallback_ad_code: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface DiffuseConnection {
  id: string;
  springford_user_id: string;
  diffuse_user_id: string;
  diffuse_email: string | null;
  springford_email: string | null;
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

export interface DiffuseImportedArticle {
  id: string;
  article_id: string;
  diffuse_output_id: string;
  diffuse_project_id: string;
  imported_by: string;
  imported_at: string;
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      articles: {
        Row: Article;
        Insert: Omit<Article, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Article, 'id' | 'created_at' | 'updated_at'>>;
      };
      ads: {
        Row: Ad;
        Insert: Omit<Ad, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Ad, 'id' | 'created_at' | 'updated_at'>>;
      };
      ad_settings: {
        Row: AdSetting;
        Insert: Omit<AdSetting, 'id' | 'updated_at'>;
        Update: Partial<Omit<AdSetting, 'id' | 'updated_at'>>;
      };
    };
  };
}
