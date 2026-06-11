
export enum Platform {
  FACEBOOK = 'Facebook',
  TIKTOK = 'TikTok',
  INSTAGRAM = 'Instagram',
  YOUTUBE = 'YouTube'
}

export enum OrderStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  CONFIRMED = 'Confirmed',
  APPROVED = 'Approved',
  COMPLETED = 'Completed',
  PARTIAL = 'Partial',
  REFUNDED = 'Refunded'
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  balance: number;
  apiKey: string;
  referralCode: string;
  referredBy?: string;
  referralEarnings: number;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  platform: Platform;
  service: string;
  link: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  createdAt: string;
  progress: number;
  autoRefill: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  receipt?: string; // Base64 encoded image or placeholder
}

export interface Ticket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  status: 'Open' | 'Closed';
  createdAt: string;
  lastUpdate: string;
}

export interface AffiliateStats {
  clicks: number;
  registrations: number;
  earnings: number;
}

export interface SocialHistoryPoint {
  date: string;
  followers: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  clicks: number;
}

export interface SocialAccount {
  id: string;
  userId: string;
  platform: Platform;
  handle: string;
  avatarUrl?: string;
  connectedAt: string;
  followers: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  clicks: number;
  historyJson: string; // JSON string of SocialHistoryPoint[]
}
