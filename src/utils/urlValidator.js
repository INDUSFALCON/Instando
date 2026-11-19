/**
 * URL Validator & Instagram URL Normalizer
 */

// Regex to extract URLs from text
const URL_REGEX = /(https?:\/\/[^\s<>"'{}|\\^`]+)/i;

// Regex for Instagram post, reel, tv, or direct link
const INSTAGRAM_URL_REGEX = /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv|share\/reel|share\/p)\/([a-zA-Z0-9_-]+)/i;
const DIRECT_MEDIA_REGEX = /\.(mp4|m4v|webm|jpg|jpeg|png|webp)(\?.*)?$/i;

/**
 * Extracts the first URL from shared text (which may contain captions, hashtags, etc.)
 */
export function extractUrlFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(URL_REGEX);
  return match ? match[1].trim() : null;
}

/**
 * Normalizes an Instagram URL by stripping tracking parameters (igsh, utm_*, etc.)
 */
export function normalizeInstagramUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const cleanUrl = url.trim();
    const parsed = new URL(cleanUrl);
    
    // Check if it's Instagram or direct media
    if (parsed.hostname.includes('instagram.com')) {
      // Remove common query tracking parameters
      const paramsToRemove = ['igsh', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'share_id', 'taken-at'];
      paramsToRemove.forEach(p => parsed.searchParams.delete(p));
      
      // Clean path: remove trailing slashes except root
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      
      return `${parsed.origin}${pathname}${parsed.search ? '?' + parsed.searchParams.toString() : ''}`;
    }
    
    return cleanUrl;
  } catch (e) {
    // Fallback regex cleanup if URL constructor fails
    return url.split('?')[0];
  }
}

/**
 * Validates whether the given URL is a supported Instagram URL or direct media URL
 */
export function validateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      error: 'Please enter or paste a valid URL',
    };
  }

  const extracted = extractUrlFromText(rawUrl);
  if (!extracted) {
    return {
      isValid: false,
      error: 'No valid web link found in the text',
    };
  }

  const normalized = normalizeInstagramUrl(extracted);
  
  // Check for Instagram post/reel/tv
  const igMatch = normalized.match(INSTAGRAM_URL_REGEX);
  if (igMatch) {
    const shortcode = igMatch[1];
    let mediaType = 'reel';
    if (normalized.includes('/p/')) {
      mediaType = 'post';
    } else if (normalized.includes('/tv/')) {
      mediaType = 'tv';
    }

    return {
      isValid: true,
      url: normalized,
      shortcode,
      mediaType,
      isDirectMedia: false,
    };
  }

  // Check for direct media URL
  const isDirect = DIRECT_MEDIA_REGEX.test(normalized);
  if (isDirect) {
    const isVideo = /\.(mp4|m4v|webm)(\?.*)?$/i.test(normalized);
    return {
      isValid: true,
      url: normalized,
      shortcode: null,
      mediaType: isVideo ? 'video' : 'image',
      isDirectMedia: true,
    };
  }

  // Check general instagram link
  if (normalized.includes('instagram.com')) {
    return {
      isValid: true,
      url: normalized,
      shortcode: null,
      mediaType: 'general_instagram',
      isDirectMedia: false,
    };
  }

  return {
    isValid: false,
    error: 'Unsupported link. Please provide a public Instagram Reel, Post, or direct media URL.',
  };
}
