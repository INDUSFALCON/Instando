/**
 * Modular Media Resolver (JavaScript layer)
 * Resolves Instagram posts/reels and direct media URLs to downloadable media streams.
 */

import { validateUrl } from '../utils/urlValidator';

export const ResolutionStatus = {
  SUCCESS: 'SUCCESS',
  UNSUPPORTED: 'UNSUPPORTED',
  PRIVATE: 'PRIVATE',
  NOT_FOUND: 'NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

class MediaResolver {
  /**
   * Resolves a URL to downloadable media items.
   * Supports direct media URLs (MP4, JPG, PNG) and modular Instagram extraction.
   */
  async resolve(rawUrl) {
    const validation = validateUrl(rawUrl);
    if (!validation.isValid) {
      return {
        status: ResolutionStatus.UNSUPPORTED,
        error: validation.error || 'Invalid or unsupported link.',
        mediaItems: [],
      };
    }

    // Direct media link handling
    if (validation.isDirectMedia) {
      const isVideo = validation.mediaType === 'video';
      const ext = isVideo ? 'mp4' : 'jpg';
      const filename = `instando_direct_${Date.now()}.${ext}`;

      return {
        status: ResolutionStatus.SUCCESS,
        mediaType: validation.mediaType,
        mediaItems: [
          {
            downloadUrl: validation.url,
            mediaType: validation.mediaType,
            mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
            filename,
            thumbnailUrl: isVideo ? null : validation.url,
          },
        ],
        metadata: {
          originalUrl: validation.url,
          source: 'direct',
        },
      };
    }

    // Instagram URL resolution
    // Note: The primary resolution engine runs in native Android (MediaResolver.java),
    // which operates even when React Native is closed.
    // This JS method delegates or performs fallback resolution.
    return {
      status: ResolutionStatus.SUCCESS,
      mediaType: validation.mediaType || 'reel',
      mediaItems: [
        {
          downloadUrl: null, // Will be resolved by Native MediaResolver
          mediaType: validation.mediaType,
          mimeType: validation.mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
          filename: `instando_${validation.shortcode || Date.now()}.${validation.mediaType === 'image' ? 'jpg' : 'mp4'}`,
          thumbnailUrl: null,
          shortcode: validation.shortcode,
        },
      ],
      metadata: {
        shortcode: validation.shortcode,
        originalUrl: validation.url,
        source: 'instagram',
      },
    };
  }
}

export default new MediaResolver();
