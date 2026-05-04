
import React from 'react';
import { Platform } from './types';

export const COLORS = {
  primary: '#800080',
  facebook: '#1877F2',
  instagram: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  tiktok: '#000000',
  youtube: '#FF0000'
};

export interface ServiceDefinition {
  id: string;
  name: string;
  pricePer1000: number;
  description: string;
  min: number;
  max: number;
  hasRefill?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  services: ServiceDefinition[];
}

export const PLATFORM_CATEGORIES: Record<Platform, ServiceCategory[]> = {
  [Platform.FACEBOOK]: [
    {
      id: 'fb_f',
      name: 'Facebook Followers',
      services: [
        { id: 'fb_f1', name: 'Profile Followers [Real/Active]', pricePer1000: 1100, description: 'High-quality followers for personal profiles. No password required.', min: 50, max: 500000 },
        { id: 'fb_f2', name: 'Page Followers & Likes [Premium]', pricePer1000: 1500, description: 'Increase your page authority with stable followers.', min: 100, max: 250000, hasRefill: true }
      ]
    },
    {
      id: 'fb_e',
      name: 'Facebook Engagement',
      services: [
        { id: 'fb_l1', name: 'Post Likes [Instant Delivery]', pricePer1000: 200, description: 'Fast likes for any public post or photo.', min: 50, max: 100000 },
        { id: 'fb_v1', name: 'Video Views [High Retention]', pricePer1000: 80, description: 'Boost your video reach and viral potential.', min: 100, max: 1000000 }
      ]
    }
  ],
  [Platform.INSTAGRAM]: [
    {
      id: 'ig_f',
      name: 'Instagram Followers',
      services: [
        { id: 'ig_f1', name: 'Followers [HQ - Guaranteed]', pricePer1000: 1100, description: 'High quality accounts with 90-day refill.', min: 50, max: 500000, hasRefill: true },
        { id: 'ig_f2', name: 'Followers [Real & Targeted]', pricePer1000: 2800, description: 'Premium active accounts for the best engagement.', min: 50, max: 100000, hasRefill: true }
      ]
    },
    {
      id: 'ig_e',
      name: 'Instagram Engagement',
      services: [
        { id: 'ig_l1', name: 'Likes [Impression + Reach]', pricePer1000: 150, description: 'Boosts your post to the explore page.', min: 50, max: 50000 },
        { id: 'ig_v1', name: 'Reels Views [Viral Package]', pricePer1000: 60, description: 'Ultra fast views to trigger the IG algorithm.', min: 100, max: 5000000 }
      ]
    }
  ],
  [Platform.TIKTOK]: [
    {
      id: 'tk_f',
      name: 'TikTok Growth',
      services: [
        { id: 'tk_f1', name: 'Followers [Global - No Drop]', pricePer1000: 1200, description: 'Fast and stable followers for your profile.', min: 100, max: 200000, hasRefill: true },
        { id: 'tk_l1', name: 'Likes [Active Accounts]', pricePer1000: 300, description: 'Heart likes from real users.', min: 50, max: 100000 }
      ]
    },
    {
      id: 'tk_v',
      name: 'TikTok Engagement',
      services: [
        { id: 'tk_v1', name: 'Views [100M+ Monthly Speed]', pricePer1000: 40, description: 'The fastest views on the market.', min: 1000, max: 100000000 }
      ]
    }
  ],
  [Platform.YOUTUBE]: [
    {
      id: 'yt_s',
      name: 'YouTube Channel',
      services: [
        { id: 'yt_s1', name: 'Subscribers [Monetization Safe]', pricePer1000: 4500, description: 'Organic-style subscribers to help you monetize.', min: 50, max: 20000, hasRefill: true },
        { id: 'yt_v1', name: 'Views [Non-Drop Watch Time]', pricePer1000: 1800, description: 'Help fulfill 4000h watch time requirement.', min: 1000, max: 1000000, hasRefill: true }
      ]
    }
  ]
};

export const PLATFORM_LOGOS: Record<Platform, React.ReactNode> = {
  [Platform.FACEBOOK]: (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ),
  [Platform.INSTAGRAM]: (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.063-2.633-.333-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.063-1.366.333-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058-1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ),
  [Platform.TIKTOK]: (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01V15.5c0 1.54-.42 3.05-1.23 4.38-1.56 2.56-4.44 3.98-7.39 3.52-2.73-.44-5.04-2.58-5.83-5.22-.84-2.82.16-5.99 2.5-7.76 1.13-.86 2.49-1.32 3.91-1.33 1.12.01 2.22.3 3.22.84l-.01 3.95c-1.14-.6-2.48-.75-3.67-.39-1.47.45-2.59 1.76-2.76 3.28-.18 1.62.67 3.22 2.12 3.95 1.44.73 3.29.54 4.54-.46.74-.59 1.18-1.49 1.18-2.44V.02z"/></svg>
  ),
  [Platform.YOUTUBE]: (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ),
};
