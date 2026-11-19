package com.instando;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Invisible native Share Receiver Activity.
 * Intercepts ACTION_SEND intents directly from Instagram or other apps,
 * schedules background work via Android WorkManager, displays a quick toast,
 * and immediately finishes without ever launching the React Native UI.
 */
public class ShareReceiverActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            handleIncomingIntent(getIntent());
        } catch (Exception e) {
            Toast.makeText(this, "Instando: " + (e.getMessage() != null ? e.getMessage() : "Error processing share link"), Toast.LENGTH_SHORT).show();
        } finally {
            // Must finish immediately to return user seamlessly to Instagram
            finish();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        try {
            handleIncomingIntent(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Instando: " + (e.getMessage() != null ? e.getMessage() : "Error processing share link"), Toast.LENGTH_SHORT).show();
        } finally {
            finish();
        }
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null && type.startsWith("text/")) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText == null || sharedText.trim().isEmpty()) {
                // Check if text was passed in ClipData
                if (intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                    CharSequence clipText = intent.getClipData().getItemAt(0).getText();
                    if (clipText != null) {
                        sharedText = clipText.toString();
                    }
                }
            }

            if (sharedText == null || sharedText.trim().isEmpty()) {
                Toast.makeText(this, "Instando: No link received.", Toast.LENGTH_SHORT).show();
                return;
            }

            // Extract valid web URL from text (removes surrounding caption, user tags, etc.)
            String extractedUrl = MediaResolver.extractUrl(sharedText);
            if (extractedUrl == null) {
                Toast.makeText(this, "Instando: No valid web link found in shared content.", Toast.LENGTH_SHORT).show();
                return;
            }

            // Normalize URL (stripping tracking query parameters like ?igsh=...)
            String normalizedUrl = MediaResolver.normalizeUrl(extractedUrl);

            // Check if already active/downloading to prevent accidental duplicates
            if (isDuplicateActive(normalizedUrl)) {
                Toast.makeText(this, "Instando: This download is already in progress.", Toast.LENGTH_SHORT).show();
                return;
            }

            // Generate unique download ID
            String downloadId = "inst_share_" + System.currentTimeMillis() + "_" + Math.abs(normalizedUrl.hashCode() % 10000);
            String mediaType = normalizedUrl.contains("/reel") ? "reel" : "post";

            // Enqueue native background download worker via WorkManager
            DownloadManagerModule.enqueueNativeDownload(
                    getApplicationContext(),
                    downloadId,
                    normalizedUrl,
                    mediaType
            );

            // Immediate user feedback: brief Toast
            Toast.makeText(this, "Instando: Download started...", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * Checks if this URL is currently in progress in native SharedPreferences.
     */
    private boolean isDuplicateActive(String url) {
        try {
            SharedPreferences prefs = getSharedPreferences(DownloadWorker.PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(DownloadWorker.PREF_KEY_ITEMS, "[]");
            JSONArray array = new JSONArray(raw);

            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                String origUrl = obj.optString("originalUrl");
                String status = obj.optString("status");
                if (url.equalsIgnoreCase(origUrl)) {
                    if ("PROCESSING".equals(status) || "RESOLVING".equals(status) || "DOWNLOADING".equals(status) || "WAITING".equals(status)) {
                        return true;
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }
}
