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
  deliveryTime: string;
  refillStatus: string;
  serviceQuality: string;
  badge: 'Most Popular' | 'Recommended' | 'Instant Start' | 'VIP' | 'Premium' | 'Lifetime Refill' | 'High Retention' | 'Non Drop';
}

export interface ServiceCategory {
  id: string;
  name: string;
  services: ServiceDefinition[];
}

// --- Dynamic Generator Helpers ---

const generateFacebookPackages = (categoryName: string, prefixId: string): ServiceDefinition[] => {
  const templates = [
    { suffix: '[Real/Active]', price: 1100, delivery: '0–24 Hours', refill: '30 Days Refill', quality: 'Real Active Users', badge: 'Recommended' },
    { suffix: '[Premium]', price: 1500, delivery: '1–12 Hours', refill: '90 Days Refill', quality: 'High-Tier Premium Profiles', badge: 'Premium' },
    { suffix: '[VIP]', price: 2500, delivery: 'Instant (1-5m)', refill: 'Lifetime Refill', quality: 'Elite VIP Profiles', badge: 'VIP' },
    { suffix: '[Worldwide]', price: 1200, delivery: '0–6 Hours', refill: '30 Days Refill', quality: 'Worldwide Accounts', badge: 'Most Popular' },
    { suffix: '[Lifetime Refill]', price: 1800, delivery: '0–12 Hours', refill: 'Lifetime Guarantee', quality: 'Guaranteed No-Drop', badge: 'Lifetime Refill' },
    { suffix: '[30 Days Refill]', price: 1400, delivery: '1-3 Hours', refill: '30 Days Refill', quality: 'Stable Delivery Profiles', badge: 'Recommended' },
    { suffix: '[Instant Start]', price: 1300, delivery: 'Instant Delivery', refill: '30 Days Refill', quality: 'Lightning Fast Acceleration', badge: 'Instant Start' },
    { suffix: '[Non Drop]', price: 1600, delivery: '2–12 Hours', refill: 'Lifetime Guarantee', quality: 'Stable Fixed Volume', badge: 'Non Drop' }
  ];
  return templates.map((t, idx) => {
    let finalPrice = t.price;
    const nameLower = categoryName.toLowerCase();
    
    if (nameLower.includes('view') || nameLower.includes('play')) {
      finalPrice = Math.round(t.price * 0.08); // 92% cheaper
    } else if (nameLower.includes('like')) {
      finalPrice = Math.round(t.price * 0.18); // 82% cheaper
    } else if (nameLower.includes('comment')) {
      finalPrice = Math.round(t.price * 0.28); // 72% cheaper
    } else if (nameLower.includes('share') || nameLower.includes('save') || nameLower.includes('visit') || nameLower.includes('favorite')) {
      finalPrice = Math.round(t.price * 0.20); // 80% cheaper
    }
    
    if (finalPrice < 10) finalPrice = 10; // Ensure sensible lower limit

    return {
      id: `fb_${prefixId}_p${idx + 1}`,
      name: `${categoryName} ${t.suffix}`,
      pricePer1000: finalPrice,
      description: `Enterprise-grade ${categoryName.toLowerCase()} SMM pipeline. Monitored server allocation with immediate startup window. Safe protocols.`,
      min: 100,
      max: 100000,
      deliveryTime: t.delivery,
      refillStatus: t.refill,
      serviceQuality: t.quality,
      badge: t.badge as any
    };
  });
};

const generateInstagramPackages = (categoryName: string, prefixId: string): ServiceDefinition[] => {
  const templates = [
    { suffix: '[Real/Active]', price: 1200, delivery: '0–12 Hours', refill: '30 Days Refill', quality: 'Verified Real Audience', badge: 'Most Popular' },
    { suffix: '[Premium]', price: 1600, delivery: '0–4 Hours', refill: '60 Days Refill', quality: 'SaaS Premium Quality', badge: 'Premium' },
    { suffix: '[VIP]', price: 2400, delivery: 'Instant (1m)', refill: 'Lifetime Refill', quality: 'Gold Certified VIPs', badge: 'VIP' },
    { suffix: '[Worldwide]', price: 1150, delivery: '1–6 Hours', refill: '15 Days Refill', quality: 'Global Audience Profiles', badge: 'Most Popular' },
    { suffix: '[Lifetime Refill]', price: 1900, delivery: '0–24 Hours', refill: 'Lifetime Guarantee', quality: 'Permanent Non-Drop', badge: 'Lifetime Refill' },
    { suffix: '[30 Days Refill]', price: 1300, delivery: '0–3 Hours', refill: '30 Days Refill', quality: 'Stable Growth Metrics', badge: 'Recommended' },
    { suffix: '[Instant Start]', price: 1250, delivery: 'Instant Launch', refill: '30 Days Refill', quality: 'Extreme Execution Speed', badge: 'Instant Start' },
    { suffix: '[High Retention]', price: 1500, delivery: '0–8 Hours', refill: '45 Days Refill', quality: 'Audiences with High Retention', badge: 'High Retention' },
    { suffix: '[Non Drop]', price: 1800, delivery: '2–12 Hours', refill: 'Lifetime Guarantee', quality: 'Organic Persistent Volumes', badge: 'Non Drop' }
  ];
  return templates.map((t, idx) => {
    let finalPrice = t.price;
    const nameLower = categoryName.toLowerCase();
    
    if (nameLower.includes('view') || nameLower.includes('play')) {
      finalPrice = Math.round(t.price * 0.08); // 92% cheaper
    } else if (nameLower.includes('like')) {
      finalPrice = Math.round(t.price * 0.18); // 82% cheaper
    } else if (nameLower.includes('comment')) {
      finalPrice = Math.round(t.price * 0.28); // 72% cheaper
    } else if (nameLower.includes('share') || nameLower.includes('save') || nameLower.includes('visit') || nameLower.includes('favorite')) {
      finalPrice = Math.round(t.price * 0.20); // 80% cheaper
    }
    
    if (finalPrice < 10) finalPrice = 10;

    return {
      id: `ig_${prefixId}_p${idx + 1}`,
      name: `${categoryName} ${t.suffix}`,
      pricePer1000: finalPrice,
      description: `Premium algorithms targeting active ${categoryName.toLowerCase()} streams. Organic feed delivery and secure transaction flow.`,
      min: 100,
      max: 100000,
      deliveryTime: t.delivery,
      refillStatus: t.refill,
      serviceQuality: t.quality,
      badge: t.badge as any
    };
  });
};

const generateTikTokPackages = (categoryName: string, prefixId: string): ServiceDefinition[] => {
  const templates = [
    { suffix: '[Real/Active]', price: 1300, delivery: '0–24 Hours', refill: '45 Days Refill', quality: 'Organic FYP Interactions', badge: 'Recommended' },
    { suffix: '[Premium]', price: 1700, delivery: '2–12 Hours', refill: '90 Days Refill', quality: 'Premium HQ Accounts', badge: 'Premium' },
    { suffix: '[VIP]', price: 2600, delivery: 'Instant Delivery', refill: 'Lifetime Guarantee', quality: 'VIP Creator Stream Users', badge: 'VIP' },
    { suffix: '[Lifetime Refill]', price: 2000, delivery: '1–24 Hours', refill: 'Lifetime Guarantee', quality: 'Permanent Social Base', badge: 'Lifetime Refill' },
    { suffix: '[Instant Start]', price: 1400, delivery: 'Instant (2m)', refill: '30 Days Refill', quality: 'Lightning Delivery Speed', badge: 'Instant Start' },
    { suffix: '[High Retention]', price: 1600, delivery: '1–12 Hours', refill: '45 Days Refill', quality: 'Sustained View Channels', badge: 'High Retention' },
    { suffix: '[Non Drop]', price: 1900, delivery: '2–24 Hours', refill: 'Lifetime Guarantee', quality: 'Zero Leak Volumes', badge: 'Non Drop' }
  ];
  return templates.map((t, idx) => {
    let finalPrice = t.price;
    const nameLower = categoryName.toLowerCase();
    
    if (nameLower.includes('view') || nameLower.includes('play')) {
      finalPrice = Math.round(t.price * 0.08); // 92% cheaper
    } else if (nameLower.includes('like')) {
      finalPrice = Math.round(t.price * 0.18); // 82% cheaper
    } else if (nameLower.includes('comment')) {
      finalPrice = Math.round(t.price * 0.28); // 72% cheaper
    } else if (nameLower.includes('share') || nameLower.includes('save') || nameLower.includes('visit') || nameLower.includes('favorite')) {
      finalPrice = Math.round(t.price * 0.20); // 80% cheaper
    }
    
    if (finalPrice < 10) finalPrice = 10;

    return {
      id: `tk_${prefixId}_p${idx + 1}`,
      name: `${categoryName} ${t.suffix}`,
      pricePer1000: finalPrice,
      description: `High retention ${categoryName.toLowerCase()} optimization for viral expansion. Bypasses standard algorithmic delays immediately.`,
      min: 100,
      max: 1000000,
      deliveryTime: t.delivery,
      refillStatus: t.refill,
      serviceQuality: t.quality,
      badge: t.badge as any
    };
  });
};

const generateYouTubePackages = (categoryName: string, prefixId: string): ServiceDefinition[] => {
  const templates = [
    { suffix: '[Real]', price: 4500, delivery: '1–5 Days', refill: '90 Days Refill', quality: 'Monetization-Approved Real Users', badge: 'Recommended' },
    { suffix: '[Premium]', price: 5500, delivery: '1–3 Days', refill: 'Lifetime Guarantee', quality: 'Monetization Partner Channels', badge: 'Premium' },
    { suffix: '[VIP]', price: 8000, delivery: 'Instant Kickoff', refill: 'Lifetime Guarantee', quality: 'VIP Verified Channels', badge: 'VIP' },
    { suffix: '[Lifetime Refill]', price: 6500, delivery: '1–4 Days', refill: 'Lifetime Guarantee', quality: 'Solid Stable Subscriptions', badge: 'Lifetime Refill' },
    { suffix: '[30 Days Refill]', price: 5000, delivery: '1–2 Days', refill: '30 Days Refill', quality: 'Standard Social Profiles', badge: 'Recommended' },
    { suffix: '[Instant Start]', price: 4800, delivery: 'Instant Start', refill: '45 Days Refill', quality: 'High-Velocity Partners', badge: 'Instant Start' }
  ];
  return templates.map((t, idx) => {
    let finalPrice = t.price;
    const nameLower = categoryName.toLowerCase();
    
    if (nameLower.includes('view') || nameLower.includes('play')) {
      finalPrice = Math.round(t.price * 0.08); // 92% cheaper
    } else if (nameLower.includes('like')) {
      finalPrice = Math.round(t.price * 0.18); // 82% cheaper
    } else if (nameLower.includes('comment')) {
      finalPrice = Math.round(t.price * 0.28); // 72% cheaper
    } else if (nameLower.includes('share') || nameLower.includes('save') || nameLower.includes('visit') || nameLower.includes('favorite')) {
      finalPrice = Math.round(t.price * 0.20); // 80% cheaper
    } else if (nameLower.includes('sub')) {
      finalPrice = Math.round(t.price * 0.40); // Subscribers also cheaper!
    }
    
    if (finalPrice < 10) finalPrice = 10;

    return {
      id: `yt_${prefixId}_p${idx + 1}`,
      name: `${categoryName} ${t.suffix}`,
      pricePer1000: finalPrice,
      description: `Safe monetization metrics for your YouTube channel. Full retention parameters configured automatically. Secure routing.`,
      min: 100,
      max: 1000000,
      deliveryTime: t.delivery,
      refillStatus: t.refill,
      serviceQuality: t.quality,
      badge: t.badge as any
    };
  });
};

// --- Platform Categories Mapping ---

export const PLATFORM_CATEGORIES: Record<Platform, ServiceCategory[]> = {
  [Platform.FACEBOOK]: [
    { id: 'fb_f', name: 'Followers', services: generateFacebookPackages('Profile Followers', 'f') },
    { id: 'fb_pl', name: 'Page Likes', services: generateFacebookPackages('Page Likes', 'pl') },
    { id: 'fb_l', name: 'Post Likes', services: generateFacebookPackages('Post Likes', 'l') },
    { id: 'fb_s', name: 'Post Shares', services: generateFacebookPackages('Post Shares', 's') },
    { id: 'fb_c', name: 'Comments', services: generateFacebookPackages('Comments', 'c') },
    { id: 'fb_v', name: 'Video Views', services: generateFacebookPackages('Video Views', 'v') },
    { id: 'fb_sv', name: 'Story Views', services: generateFacebookPackages('Story Views', 'sv') }
  ],
  [Platform.INSTAGRAM]: [
    { id: 'ig_f', name: 'Followers', services: generateInstagramPackages('Followers', 'f') },
    { id: 'ig_l', name: 'Likes', services: generateInstagramPackages('Likes', 'l') },
    { id: 'ig_rv', name: 'Reels Views', services: generateInstagramPackages('Reels Views', 'rv') },
    { id: 'ig_sv', name: 'Story Views', services: generateInstagramPackages('Story Views', 'sv') },
    { id: 'ig_c', name: 'Comments', services: generateInstagramPackages('Comments', 'c') },
    { id: 'ig_sa', name: 'Saves', services: generateInstagramPackages('Saves', 'sa') },
    { id: 'ig_pv', name: 'Profile Visits', services: generateInstagramPackages('Profile Visits', 'pv') }
  ],
  [Platform.TIKTOK]: [
    { id: 'tk_f', name: 'Followers', services: generateTikTokPackages('Followers', 'f') },
    { id: 'tk_l', name: 'Likes', services: generateTikTokPackages('Likes', 'l') },
    { id: 'tk_v', name: 'Video Views', services: generateTikTokPackages('Video Views', 'v') },
    { id: 'tk_s', name: 'Shares', services: generateTikTokPackages('Shares', 's') },
    { id: 'tk_c', name: 'Comments', services: generateTikTokPackages('Comments', 'c') },
    { id: 'tk_fa', name: 'Favorites', services: generateTikTokPackages('Favorites', 'fa') },
    { id: 'tk_lv', name: 'Live Views', services: generateTikTokPackages('Live Views', 'lv') }
  ],
  [Platform.YOUTUBE]: [
    { id: 'yt_sub', name: 'Subscribers', services: generateYouTubePackages('Subscribers', 'sub') },
    { id: 'yt_v', name: 'Video Views', services: generateYouTubePackages('Video Views', 'v') },
    { id: 'yt_sv', name: 'Shorts Views', services: generateYouTubePackages('Shorts Views', 'sv') },
    { id: 'yt_l', name: 'Likes', services: generateYouTubePackages('Likes', 'l') },
    { id: 'yt_c', name: 'Comments', services: generateYouTubePackages('Comments', 'c') },
    { id: 'yt_wh', name: 'Watch Hours', services: generateYouTubePackages('Watch Hours', 'wh') }
  ]
};

// --- Platform Available Quantities mapping ---
export const PLATFORM_QUANTITIES: Record<Platform, number[]> = {
  [Platform.FACEBOOK]: [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
  [Platform.INSTAGRAM]: [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
  [Platform.TIKTOK]: [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 500000, 1000000],
  [Platform.YOUTUBE]: [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 500000, 1000000]
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
