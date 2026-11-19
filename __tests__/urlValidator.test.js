import { extractUrlFromText, normalizeInstagramUrl, validateUrl } from '../src/utils/urlValidator';

describe('urlValidator', () => {
  test('extracts Instagram Reel URL from shared Instagram caption text', () => {
    const sharedText = 'Check out this awesome reel! https://www.instagram.com/reel/C7xK89sP123/?igsh=MWx123== #funny';
    const extracted = extractUrlFromText(sharedText);
    expect(extracted).toBe('https://www.instagram.com/reel/C7xK89sP123/?igsh=MWx123==');
  });

  test('normalizes Instagram URL by stripping tracking queries and trailing slashes', () => {
    const raw = 'https://www.instagram.com/reel/C7xK89sP123/?igsh=MWx123==&utm_source=ig_web_copy_link/';
    const normalized = normalizeInstagramUrl(raw);
    expect(normalized).toBe('https://www.instagram.com/reel/C7xK89sP123');
  });

  test('validates and identifies public Instagram Reel', () => {
    const url = 'https://www.instagram.com/reel/C7xK89sP123';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.mediaType).toBe('reel');
    expect(result.shortcode).toBe('C7xK89sP123');
    expect(result.isDirectMedia).toBe(false);
  });

  test('validates and identifies public Instagram Post', () => {
    const url = 'https://www.instagram.com/p/B456xyz/';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.mediaType).toBe('post');
    expect(result.shortcode).toBe('B456xyz');
  });

  test('validates direct MP4 video URL', () => {
    const url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.isDirectMedia).toBe(true);
    expect(result.mediaType).toBe('video');
  });

  test('validates direct image URL', () => {
    const url = 'https://example.com/photos/sample.jpg';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.isDirectMedia).toBe(true);
    expect(result.mediaType).toBe('image');
  });

  test('rejects non-web text or invalid URLs', () => {
    const text = 'Just some random text without links';
    const result = validateUrl(text);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
