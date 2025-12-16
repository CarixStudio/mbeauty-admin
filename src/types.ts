
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface StatItem {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

export interface AdminUser {
  id: string | number;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Editor' | 'Viewer';
  avatar: string;
  last_active: string;
}

// Order Types
export interface Order {
  id: string;
  customer: string;
  email: string;
  items: number;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
  payment: 'Paid' | 'Pending' | 'Refunded';
  stripe_payment_intent_id?: string;
  shipping_address?: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone: string;
  };
  timeline?: { status: string; date: string }[];
  line_items?: {
    id: number;
    product: string;
    variant: string;
    sku: string;
    price: number;
    quantity: number;
    image: string;
  }[];
}

// Product Types Helpers
export interface KeyIngredient {
  name: string;
  description: string;
  image: string;
}

export interface ProductBenefit {
  title: string;
  description: string;
  image?: string;
}

export interface ProductAttribute {
  key: string;
  value: string;
}

export interface ProductOption {
  id: string;
  name: string; // e.g., "Color"
  values: string[]; // e.g., ["Red", "Blue"]
}

export interface ProductVariant {
  id: string;
  name: string; // "Red / Large"
  sku: string;
  price: number;
  cost_price?: number; // Added from Schema
  stock: number; // Maps to inventory_count
  stripe_price_id?: string;
  updated_at?: string; // For Optimistic Concurrency Control
  options?: Record<string, string>; // { Color: "Red", Size: "L" }
}

export interface ProductImage {
  id: string;
  url: string; // Maps to image_url
  alt: string; // Maps to alt_text
  display_order: number;
  video_url?: string;
  variant_id?: string;
}

export interface ProductHighlight {
  id?: string;
  title: string;
  description: string;
  image: string; // Maps to image_url
  display_order: number;
}

export interface ProductContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'tolstoy';
  heading?: string;
  body?: string; // Maps to body_text
  image_url?: string;
  video_url?: string;
  tolstoy_id?: string;
  display_order: number;
}

export interface RelatedProduct {
  related_product_id: number;
  relation_type: 'upsell' | 'cross-sell' | 'similar';
}

export interface Product {
  id: string; // Changed to string for UUID
  name: string;
  slug: string;
  subtitle?: string;
  category: string; // We will map category_id to this name in the UI
  category_id?: string; // For DB link
  subcategory?: string;
  description?: string;
  long_description?: string; // Rich text HTML
  price: number;
  compare_at_price?: number;
  currency: 'USD' | 'GBP' | 'EUR';
  stock: number; // Calculated sum of variants or specific field
  status: 'Active' | 'Draft' | 'Archived' | 'Low Stock' | 'Out of Stock';
  image: string; // Main image_url
  sku?: string;
  is_featured?: boolean;
  
  // Visuals
  badge_text?: string;
  scent_tag?: string;
  color_hex?: string;
  
  // Specifics
  tags?: string[];
  application_info?: string;
  full_ingredients?: string;
  
  // Nested Data (JSONB fields in DB)
  key_ingredients?: KeyIngredient[];
  benefits?: ProductBenefit[];
  attributes?: ProductAttribute[];
  
  // Variants
  options?: ProductOption[];
  variants?: ProductVariant[];
  components?: { component_product_id: number; variant_id: string; quantity: number }[]; // For bundles
  
  // Media
  images?: ProductImage[];
  hover_image_url?: string;
  swatch_image_url?: string;
  section_background_image_url?: string;
  
  // Content
  highlights_heading?: string;
  highlights?: ProductHighlight[];
  content_blocks?: ProductContentBlock[];
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  
  // Related
  related_products?: RelatedProduct[];
}

export interface Category {
  id: string; // Changed to string for UUID
  name: string;
  slug: string;
  product_count: number;
}

// Customer Types
export interface CustomerAddress {
  id: number;
  first_name: string;
  last_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone: string;
  is_default: boolean;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'Customer' | 'VIP';
  orders: number;
  totalSpent: number;
  joined: string;
  stripe_customer_id?: string;
  addresses?: CustomerAddress[];
}

// Marketing Types
export interface Banner {
  id: string; // Changed to string for UUID
  content: string;
  link_url: string;
  is_active: boolean;
  text_color: string;
  background_color: string;
  display_order: number;
}

export interface Promotion {
  id: string; // Changed to string for UUID
  code: string;
  discount_percentage: number;
  is_active: boolean;
  expires_at: string;
  usage_count: number;
  min_order_value?: number;
  is_single_use?: boolean;
}

export interface Subscriber {
  id: string; // Changed to string for UUID
  email: string;
  subscribed_at: string;
}

// Content Types
export interface Review {
  id: number;
  product_name: string;
  product_image: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  title: string;
  comment: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  helpful_count: number;
  
  // Detailed Fields
  is_verified: boolean;
  is_incentivized: boolean;
  is_recommended: boolean;
  reviewer_skin_type?: string;
  reviewer_skin_concern?: string;
  reviewer_age_range?: string;
  attribute_ratings?: Record<string, number>; // e.g. { "Texture": 5, "Scent": 4 }
  media?: string[]; // Array of image URLs
}

export interface Inquiry {
  id: number;
  date: string;
  name: string;
  email: string;
  reason: string;
  subject: string;
  status: 'Open' | 'Closed' | 'Replied';
  order_number?: string;
  message?: string;
}

// Settings Types
export interface ShippingRate {
  id: number;
  name: string;
  country_code: string;
  min_order_value: number;
  rate: number;
}

export interface UserSession {
  id: string;
  user: string;
  ip_address: string;
  user_agent: string;
  last_activity: string;
  is_valid: boolean;
  created_at: string;
  expires_at: string;
}

// New Features Types
export interface Segment {
  id: number;
  name: string;
  criteria: string; // Mock description of logic
  count: number;
  last_updated: string;
}

export interface AuditLog {
  id: number;
  user: string;
  user_avatar: string;
  action: string;
  target: string;
  ip_address: string;
  timestamp: string;
}

export interface AbandonedCart {
  id: string;
  customer_name: string;
  email: string;
  items_count: number;
  total_value: number;
  abandoned_at: string;
  status: 'Pending' | 'Recovered' | 'Lost';
}

export interface GlobeMarker {
  location: [number, number];
  size: number;
}

// Sentiment Analysis Types
export interface WordCloudItem {
  text: string;
  value: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface SentimentData {
  overallScore: number; // 0 to 100
  trend: { date: string; positive: number; negative: number; neutral: number }[];
  wordCloud: WordCloudItem[];
  recentFeedback: {
    id: number;
    source: 'Review' | 'Ticket';
    text: string;
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    score: number; // 0 to 100
    date: string;
  }[];
}

// Waitlist Type
export interface WaitlistEntry {
  id: number;
  product_name: string;
  variant?: string;
  customer_name: string;
  email: string;
  is_vip: boolean;
  requested_at: string;
  status: 'Pending' | 'Notified';
}

// Heatmap Type
export interface HeatmapPoint {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  intensity: number; // 0-1
}

// Scheduled Actions
export interface ScheduledAction {
  id: number;
  type: 'Price Change' | 'Product Launch' | 'Start Sale' | 'End Sale';
  target_name: string;
  scheduled_date: string;
  status: 'Pending' | 'Completed' | 'Failed';
  details?: string;
}

// Chat AI Types
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'ai';
  text: string;
  created_at: string;
}
