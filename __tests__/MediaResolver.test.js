import MediaResolver, { ResolutionStatus } from '../src/services/MediaResolver';

describe('MediaResolver', () => {
  test('resolves direct MP4 video link with video/mp4 MIME and suggested filename', async () => {
    const directUrl = 'https://example.com/videos/test_reel.mp4';
    const result = await MediaResolver.resolve(directUrl);

    expect(result.status).toBe(ResolutionStatus.SUCCESS);
    expect(result.mediaType).toBe('video');
    expect(result.mediaItems.length).toBe(1);
    expect(result.mediaItems[0].mimeType).toBe('video/mp4');
    expect(result.mediaItems[0].downloadUrl).toBe(directUrl);
    expect(result.mediaItems[0].filename).toContain('.mp4');
  });

  test('resolves direct image JPG link with image/jpeg MIME', async () => {
    const directImg = 'https://example.com/images/picture.jpg';
    const result = await MediaResolver.resolve(directImg);

    expect(result.status).toBe(ResolutionStatus.SUCCESS);
    expect(result.mediaType).toBe('image');
    expect(result.mediaItems.length).toBe(1);
    expect(result.mediaItems[0].mimeType).toBe('image/jpeg');
    expect(result.mediaItems[0].downloadUrl).toBe(directImg);
  });

  test('returns unsupported status for invalid non-URL string', async () => {
    const invalid = 'not a valid url';
    const result = await MediaResolver.resolve(invalid);

    expect(result.status).toBe(ResolutionStatus.UNSUPPORTED);
    expect(result.error).toBeDefined();
    expect(result.mediaItems.length).toBe(0);
  });
});
