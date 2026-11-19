package com.instando;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import java.io.IOException;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MediaResolver {

    public enum Status {
        SUCCESS,
        UNSUPPORTED,
        PRIVATE_OR_RESTRICTED,
        RATE_LIMITED,
        NETWORK_ERROR,
        FAILED
    }

    public static class MediaResult {
        public Status status;
        public String downloadUrl;
        public String mediaType; // "reel", "post", "video", "image"
        public String mimeType;
        public String suggestedFilename;
        public String thumbnailUrl;
        public String errorMessage;
        public boolean isDirect;
    }

    private static final Pattern URL_PATTERN = Pattern.compile("(https?://[^\\s<>\"'{}|\\\\^`]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern IG_PATTERN = Pattern.compile("https?://(?:www\\.)?instagram\\.com/(?:reel|p|tv|share/reel|share/p)/([a-zA-Z0-9_-]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern DIRECT_MEDIA_PATTERN = Pattern.compile("\\.(mp4|m4v|webm|jpg|jpeg|png|webp)(\\?.*)?$", Pattern.CASE_INSENSITIVE);

    private static final OkHttpClient HTTP_CLIENT = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();

    /**
     * Extracts the first URL from shared text (stripping surrounding caption text).
     */
    public static String extractUrl(String text) {
        if (text == null) return null;
        Matcher matcher = URL_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    /**
     * Cleans tracking parameters (e.g. ?igsh=..., utm_source=...)
     */
    public static String normalizeUrl(String url) {
        if (url == null) return null;
        String clean = url.trim();
        if (clean.contains("instagram.com")) {
            int qIndex = clean.indexOf('?');
            if (qIndex != -1) {
                clean = clean.substring(0, qIndex);
            }
            if (clean.endsWith("/")) {
                clean = clean.substring(0, clean.length() - 1);
            }
        }
        return clean;
    }

    /**
     * Resolves an Instagram URL or direct media URL into a downloadable MediaResult.
     */
    public static MediaResult resolve(String rawUrl) {
        MediaResult result = new MediaResult();
        String extracted = extractUrl(rawUrl);
        if (extracted == null) {
            result.status = Status.UNSUPPORTED;
            result.errorMessage = "No valid URL found in the input.";
            return result;
        }

        String normalized = normalizeUrl(extracted);

        // 1. Check if it's already a direct media link
        Matcher directMatcher = DIRECT_MEDIA_PATTERN.matcher(normalized);
        if (directMatcher.find()) {
            String ext = directMatcher.group(1).toLowerCase();
            boolean isVideo = ext.equals("mp4") || ext.equals("m4v") || ext.equals("webm");
            
            result.status = Status.SUCCESS;
            result.downloadUrl = normalized;
            result.mediaType = isVideo ? "video" : "image";
            result.mimeType = isVideo ? "video/mp4" : "image/jpeg";
            result.suggestedFilename = "instando_" + System.currentTimeMillis() + "." + (isVideo ? "mp4" : "jpg");
            result.thumbnailUrl = isVideo ? null : normalized;
            result.isDirect = true;
            return result;
        }

        // 2. Check if it is an Instagram Reel/Post
        Matcher igMatcher = IG_PATTERN.matcher(normalized);
        if (!igMatcher.find()) {
            result.status = Status.UNSUPPORTED;
            result.errorMessage = "Unsupported link. Please share a public Instagram Reel or Post.";
            return result;
        }

        String shortcode = igMatcher.group(1);
        boolean isReel = normalized.contains("/reel");
        result.mediaType = isReel ? "reel" : "post";
        result.isDirect = false;

        // 3. Perform compliant metadata resolution via Instagram public graph metadata
        return resolveInstagramPublicMedia(normalized, shortcode, isReel);
    }

    /**
     * Resolves public Instagram media using compliant Open Graph & Meta tags without login bypass.
     */
    private static MediaResult resolveInstagramPublicMedia(String igUrl, String shortcode, boolean isReel) {
        MediaResult result = new MediaResult();
        result.mediaType = isReel ? "reel" : "post";

        Request request = new Request.Builder()
                .url(igUrl)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.5")
                .build();

        try (Response response = HTTP_CLIENT.newCall(request).execute()) {
            if (response.code() == 429) {
                result.status = Status.RATE_LIMITED;
                result.errorMessage = "Instagram rate limit encountered. Please try again later.";
                return result;
            }

            if (!response.isSuccessful()) {
                result.status = Status.NETWORK_ERROR;
                result.errorMessage = "HTTP " + response.code() + ": Instagram page could not be accessed.";
                return result;
            }

            String html = response.body() != null ? response.body().string() : "";
            if (html.isEmpty()) {
                result.status = Status.FAILED;
                result.errorMessage = "Empty response received from Instagram.";
                return result;
            }

            // Check for login wall or private post indication
            if (html.contains("Login • Instagram") && !html.contains("og:video") && !html.contains("og:image")) {
                result.status = Status.PRIVATE_OR_RESTRICTED;
                result.errorMessage = "This post appears to be private or requires Instagram login. Instando only supports public media.";
                return result;
            }

            // Extract og:video (video stream)
            String videoUrl = extractMetaTag(html, "og:video");
            if (videoUrl == null) {
                videoUrl = extractMetaTag(html, "og:video:secure_url");
            }

            // Extract og:image (thumbnail or photo post)
            String imageUrl = extractMetaTag(html, "og:image");

            if (videoUrl != null && !videoUrl.isEmpty()) {
                result.status = Status.SUCCESS;
                result.downloadUrl = decodeHtml(videoUrl);
                result.mediaType = isReel ? "reel" : "video";
                result.mimeType = "video/mp4";
                result.suggestedFilename = "instando_" + (shortcode != null ? shortcode : System.currentTimeMillis()) + ".mp4";
                result.thumbnailUrl = imageUrl != null ? decodeHtml(imageUrl) : null;
                return result;
            } else if (imageUrl != null && !imageUrl.isEmpty()) {
                result.status = Status.SUCCESS;
                result.downloadUrl = decodeHtml(imageUrl);
                result.mediaType = "image";
                result.mimeType = "image/jpeg";
                result.suggestedFilename = "instando_" + (shortcode != null ? shortcode : System.currentTimeMillis()) + ".jpg";
                result.thumbnailUrl = decodeHtml(imageUrl);
                return result;
            }

            // Fallback: Check JSON-LD video/image content
            Pattern jsonLdVideo = Pattern.compile("\"contentUrl\"\\s*:\\s*\"([^\"]+)\"");
            Matcher mVideo = jsonLdVideo.matcher(html);
            if (mVideo.find()) {
                String streamUrl = mVideo.group(1).replace("\\/", "/");
                result.status = Status.SUCCESS;
                result.downloadUrl = streamUrl;
                result.mediaType = "video";
                result.mimeType = "video/mp4";
                result.suggestedFilename = "instando_" + (shortcode != null ? shortcode : System.currentTimeMillis()) + ".mp4";
                result.thumbnailUrl = imageUrl != null ? decodeHtml(imageUrl) : null;
                return result;
            }

            result.status = Status.UNSUPPORTED;
            result.errorMessage = "Direct media stream could not be extracted from this public post. Instagram may require an active session.";
            return result;

        } catch (IOException e) {
            result.status = Status.NETWORK_ERROR;
            result.errorMessage = "Network error while connecting to Instagram: " + e.getMessage();
            return result;
        } catch (Exception e) {
            result.status = Status.FAILED;
            result.errorMessage = "Failed to resolve media: " + e.getMessage();
            return result;
        }
    }

    private static String extractMetaTag(String html, String property) {
        Pattern pattern = Pattern.compile("<meta\\s+property=[\"']" + Pattern.quote(property) + "[\"']\\s+content=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return matcher.group(1);
        }
        // Try content before property
        Pattern reverse = Pattern.compile("<meta\\s+content=[\"']([^\"']+)[\"']\\s+property=[\"']" + Pattern.quote(property) + "[\"']", Pattern.CASE_INSENSITIVE);
        Matcher reverseMatcher = reverse.matcher(html);
        if (reverseMatcher.find()) {
            return reverseMatcher.group(1);
        }
        return null;
    }

    private static String decodeHtml(String s) {
        if (s == null) return null;
        return s.replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("\\u0026", "&");
    }
}
