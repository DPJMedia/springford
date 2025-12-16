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
  is_admin: boolean;
  is_super_admin: boolean;
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
  is_featured: boolean;
  is_breaking: boolean;
  breaking_news_duration: number; // Hours to stay as breaking news
  breaking_news_set_at: string | null; // When marked as breaking news
  allow_comments: boolean;
  updated_by: string | null;
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
    };
  };
}
