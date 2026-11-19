package com.instando;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Data;
import androidx.work.ForegroundInfo;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.TimeUnit;

public class DownloadWorker extends Worker {

    public static final String KEY_DOWNLOAD_ID = "download_id";
    public static final String KEY_URL = "url";
    public static final String KEY_MEDIA_TYPE = "media_type";
    public static final String PREFS_NAME = "instando_native_downloads";
    public static final String PREF_KEY_ITEMS = "download_items_json";

    private final Context context;
    private final NotificationHelper notificationHelper;
    private final OkHttpClient httpClient;

    public DownloadWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
        this.context = context.getApplicationContext();
        this.notificationHelper = new NotificationHelper(this.context);
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .followRedirects(true)
                .build();
    }

    @NonNull
    @Override
    public Result doWork() {
        String downloadId = getInputData().getString(KEY_DOWNLOAD_ID);
        String rawUrl = getInputData().getString(KEY_URL);
        String mediaType = getInputData().getString(KEY_MEDIA_TYPE);

        if (downloadId == null) {
            downloadId = "inst_" + System.currentTimeMillis();
        }

        int notificationId = NotificationHelper.getNotificationIdForDownload(downloadId);

        // Update status to PROCESSING
        saveDownloadRecord(downloadId, rawUrl, mediaType, "PROCESSING", 0, null, null, null, null);
        DownloadManagerModule.broadcastStatusChange(downloadId, "PROCESSING", null, null, null, mediaType, null);

        // Setup Foreground Service notification to ensure persistent execution in background
        try {
            NotificationCompat.Builder notifBuilder = notificationHelper.createProgressNotificationBuilder("Resolving media...", 0);
            ForegroundInfo foregroundInfo;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                foregroundInfo = new ForegroundInfo(
                        notificationId,
                        notifBuilder.build(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                );
            } else {
                foregroundInfo = new ForegroundInfo(notificationId, notifBuilder.build());
            }
            setForegroundAsync(foregroundInfo);
        } catch (Exception e) {
            // Some foreground restrictions may apply; proceed with normal worker execution
        }

        // 1. Resolve media stream using MediaResolver
        saveDownloadRecord(downloadId, rawUrl, mediaType, "RESOLVING", 0, null, null, null, null);
        DownloadManagerModule.broadcastStatusChange(downloadId, "RESOLVING", null, null, null, mediaType, null);

        MediaResolver.MediaResult resolved = MediaResolver.resolve(rawUrl);
        if (resolved.status != MediaResolver.Status.SUCCESS || resolved.downloadUrl == null) {
            String errorMsg = resolved.errorMessage != null ? resolved.errorMessage : "Could not extract downloadable media stream.";
            saveDownloadRecord(downloadId, rawUrl, mediaType, "FAILED", 0, null, null, null, errorMsg);
            DownloadManagerModule.broadcastStatusChange(downloadId, "FAILED", null, null, null, mediaType, errorMsg);
            notificationHelper.showFailureNotification(notificationId, resolved.suggestedFilename, errorMsg);
            return Result.failure(new Data.Builder().putString("error", errorMsg).build());
        }

        // 2. Start streaming download with OkHttp
        saveDownloadRecord(downloadId, rawUrl, resolved.mediaType, "DOWNLOADING", 0, resolved.suggestedFilename, null, resolved.thumbnailUrl, null);
        DownloadManagerModule.broadcastStatusChange(downloadId, "DOWNLOADING", null, resolved.suggestedFilename, resolved.thumbnailUrl, resolved.mediaType, null);

        MediaStoreHelper.MediaSaveTarget saveTarget = null;
        try {
            Request downloadRequest = new Request.Builder()
                    .url(resolved.downloadUrl)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                    .build();

            Response response = httpClient.newCall(downloadRequest).execute();
            if (!response.isSuccessful()) {
                String errorMsg = "HTTP error " + response.code() + " during media download";
                handleFailure(downloadId, rawUrl, resolved, notificationId, errorMsg, saveTarget);
                return Result.failure();
            }

            ResponseBody body = response.body();
            if (body == null) {
                handleFailure(downloadId, rawUrl, resolved, notificationId, "Empty response body received", saveTarget);
                return Result.failure();
            }

            String contentType = body.contentType() != null ? body.contentType().toString() : "";
            // Reject HTML error pages
            if (contentType.toLowerCase().contains("text/html")) {
                handleFailure(downloadId, rawUrl, resolved, notificationId, "Server returned HTML webpage instead of video/image file.", saveTarget);
                return Result.failure();
            }

            boolean isVideo = "video".equalsIgnoreCase(resolved.mediaType) || "reel".equalsIgnoreCase(resolved.mediaType) || resolved.mimeType.contains("video");
            saveTarget = MediaStoreHelper.prepareMediaFile(context, resolved.suggestedFilename, resolved.mimeType, isVideo);

            InputStream inputStream = body.byteStream();
            OutputStream outputStream = saveTarget.outputStream;

            long totalBytes = body.contentLength();
            byte[] buffer = new byte[8192];
            long bytesDownloaded = 0;
            int read;
            int lastProgress = 0;

            while ((read = inputStream.read(buffer)) != -1) {
                if (isStopped()) {
                    MediaStoreHelper.discardPendingMediaFile(context, saveTarget);
                    notificationHelper.dismissNotification(notificationId);
                    return Result.retry();
                }

                outputStream.write(buffer, 0, read);
                bytesDownloaded += read;

                if (totalBytes > 0) {
                    int progress = (int) ((bytesDownloaded * 100) / totalBytes);
                    if (progress != lastProgress) {
                        lastProgress = progress;
                        notificationHelper.updateProgressNotification(notificationId, saveTarget.finalFilename, progress);
                        DownloadManagerModule.broadcastProgress(downloadId, progress, bytesDownloaded, totalBytes, "DOWNLOADING");
                    }
                }
            }

            outputStream.flush();
            outputStream.close();
            inputStream.close();

            // 3. Mark file publication in MediaStore (IS_PENDING = 0)
            MediaStoreHelper.publishMediaFile(context, saveTarget);

            // 4. Dismiss progress notification and show success Toast
            notificationHelper.dismissNotification(notificationId);
            notificationHelper.showSuccessToast();

            String fileUriStr = saveTarget.contentUri != null ? saveTarget.contentUri.toString() : "";
            saveDownloadRecord(downloadId, rawUrl, resolved.mediaType, "COMPLETED", 100, saveTarget.finalFilename, fileUriStr, resolved.thumbnailUrl, null);
            DownloadManagerModule.broadcastStatusChange(downloadId, "COMPLETED", fileUriStr, saveTarget.finalFilename, resolved.thumbnailUrl, resolved.mediaType, null);

            return Result.success();

        } catch (Exception e) {
            handleFailure(downloadId, rawUrl, resolved, notificationId, "Download failed: " + e.getMessage(), saveTarget);
            return Result.failure();
        }
    }

    private void handleFailure(String downloadId, String rawUrl, MediaResolver.MediaResult resolved, int notificationId, String errorMsg, MediaStoreHelper.MediaSaveTarget saveTarget) {
        if (saveTarget != null) {
            MediaStoreHelper.discardPendingMediaFile(context, saveTarget);
        }
        notificationHelper.showFailureNotification(notificationId, resolved != null ? resolved.suggestedFilename : "Media", errorMsg);
        saveDownloadRecord(downloadId, rawUrl, resolved != null ? resolved.mediaType : "reel", "FAILED", 0, resolved != null ? resolved.suggestedFilename : null, null, null, errorMsg);
        DownloadManagerModule.broadcastStatusChange(downloadId, "FAILED", null, resolved != null ? resolved.suggestedFilename : null, null, resolved != null ? resolved.mediaType : "reel", errorMsg);
    }

    /**
     * Persists download record in Native SharedPreferences so it survives app restarts.
     */
    private synchronized void saveDownloadRecord(String id, String url, String mediaType, String status, int progress, String filename, String fileUri, String thumbnailUrl, String error) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(PREF_KEY_ITEMS, "[]");
            JSONArray array = new JSONArray(raw);

            JSONObject item = null;
            int foundIdx = -1;
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                if (id.equals(obj.optString("id"))) {
                    item = obj;
                    foundIdx = i;
                    break;
                }
            }

            if (item == null) {
                item = new JSONObject();
                item.put("id", id);
                item.put("originalUrl", url);
                item.put("createdAt", System.currentTimeMillis());
            }

            item.put("mediaType", mediaType != null ? mediaType : "reel");
            item.put("status", status);
            item.put("progress", progress);
            if (filename != null) item.put("filename", filename);
            if (fileUri != null) item.put("fileUri", fileUri);
            if (thumbnailUrl != null) item.put("thumbnailUrl", thumbnailUrl);
            if (error != null) item.put("error", error);
            if ("COMPLETED".equals(status)) item.put("completedAt", System.currentTimeMillis());

            if (foundIdx >= 0) {
                array.put(foundIdx, item);
            } else {
                // Add to beginning
                JSONArray newArray = new JSONArray();
                newArray.put(item);
                for (int i = 0; i < array.length(); i++) {
                    newArray.put(array.get(i));
                }
                array = newArray;
            }

            prefs.edit().putString(PREF_KEY_ITEMS, array.toString()).apply();
        } catch (Exception ignored) {}
    }
}
