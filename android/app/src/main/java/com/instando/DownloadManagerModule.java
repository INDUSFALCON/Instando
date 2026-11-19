package com.instando;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Iterator;

public class DownloadManagerModule extends ReactContextBaseJavaModule {
    public static final String NAME = "DownloadManagerModule";
    private static ReactApplicationContext reactContextStatic;

    public DownloadManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContextStatic = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    /**
     * Enqueues a persistent background download using Android WorkManager.
     */
    @ReactMethod
    public void enqueueDownload(String downloadId, String url, String mediaType, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            enqueueNativeDownload(context, downloadId, url, mediaType);
            
            WritableMap map = Arguments.createMap();
            map.putString("id", downloadId);
            map.putString("status", "ENQUEUED");
            promise.resolve(map);
        } catch (Exception e) {
            promise.reject("ENQUEUE_ERROR", e.getMessage());
        }
    }

    /**
     * Static helper used by both ShareReceiverActivity and DownloadManagerModule.
     */
    public static void enqueueNativeDownload(Context context, String downloadId, String url, String mediaType) {
        Data inputData = new Data.Builder()
                .putString(DownloadWorker.KEY_DOWNLOAD_ID, downloadId)
                .putString(DownloadWorker.KEY_URL, url)
                .putString(DownloadWorker.KEY_MEDIA_TYPE, mediaType)
                .build();

        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(DownloadWorker.class)
                .setInputData(inputData)
                .addTag("instando_download")
                .addTag(downloadId)
                .build();

        // Unique work per URL to prevent duplicate running downloads
        String uniqueWorkName = "dl_" + Math.abs(url.hashCode());
        WorkManager.getInstance(context).enqueueUniqueWork(
                uniqueWorkName,
                ExistingWorkPolicy.KEEP,
                workRequest
        );

        broadcastDownloadQueued(downloadId, url, mediaType);
    }

    /**
     * Retrieves all persisted native downloads from SharedPreferences.
     */
    @ReactMethod
    public void getAllDownloads(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(DownloadWorker.PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(DownloadWorker.PREF_KEY_ITEMS, "[]");
            JSONArray array = new JSONArray(raw);

            WritableArray writableArray = Arguments.createArray();
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                WritableMap map = jsonToWritableMap(obj);
                writableArray.pushMap(map);
            }

            promise.resolve(writableArray);
        } catch (Exception e) {
            promise.reject("FETCH_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openFile(String fileUri, String mimeType, Promise promise) {
        try {
            boolean success = MediaStoreHelper.openFile(getReactApplicationContext(), fileUri, mimeType);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("OPEN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void shareFile(String fileUri, String mimeType, Promise promise) {
        try {
            boolean success = MediaStoreHelper.shareFile(getReactApplicationContext(), fileUri, mimeType);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("SHARE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void deleteFile(String fileUri, Promise promise) {
        try {
            boolean success = MediaStoreHelper.deleteFile(getReactApplicationContext(), fileUri);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("DELETE_ERROR", e.getMessage());
        }
    }

    // React Native NativeEventEmitter required methods
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(double count) {}

    // Event broadcasting to JavaScript
    public static void broadcastProgress(String id, int progress, long bytesDownloaded, long totalBytes, String status) {
        if (reactContextStatic == null || !reactContextStatic.hasActiveReactInstance()) return;
        try {
            WritableMap params = Arguments.createMap();
            params.putString("id", id);
            params.putInt("progress", progress);
            params.putDouble("bytesDownloaded", bytesDownloaded);
            params.putDouble("totalBytes", totalBytes);
            params.putString("status", status);

            reactContextStatic.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onDownloadProgress", params);
        } catch (Exception ignored) {}
    }

    public static void broadcastStatusChange(String id, String status, @Nullable String fileUri, @Nullable String filename, @Nullable String thumbnailUrl, @Nullable String mediaType, @Nullable String error) {
        if (reactContextStatic == null || !reactContextStatic.hasActiveReactInstance()) return;
        try {
            WritableMap params = Arguments.createMap();
            params.putString("id", id);
            params.putString("status", status);
            if (fileUri != null) params.putString("fileUri", fileUri);
            if (filename != null) params.putString("filename", filename);
            if (thumbnailUrl != null) params.putString("thumbnailUrl", thumbnailUrl);
            if (mediaType != null) params.putString("mediaType", mediaType);
            if (error != null) params.putString("error", error);

            reactContextStatic.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onDownloadStatusChanged", params);
        } catch (Exception ignored) {}
    }

    public static void broadcastDownloadQueued(String id, String url, String mediaType) {
        if (reactContextStatic == null || !reactContextStatic.hasActiveReactInstance()) return;
        try {
            WritableMap params = Arguments.createMap();
            params.putString("id", id);
            params.putString("url", url);
            params.putString("mediaType", mediaType);

            reactContextStatic.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onDownloadQueued", params);
        } catch (Exception ignored) {}
    }

    private static WritableMap jsonToWritableMap(JSONObject jsonObject) {
        WritableMap map = Arguments.createMap();
        Iterator<String> iterator = jsonObject.keys();
        while (iterator.hasNext()) {
            String key = iterator.next();
            Object value = jsonObject.opt(key);
            if (value instanceof Boolean) {
                map.putBoolean(key, (Boolean) value);
            } else if (value instanceof Integer) {
                map.putInt(key, (Integer) value);
            } else if (value instanceof Long || value instanceof Double) {
                map.putDouble(key, ((Number) value).doubleValue());
            } else if (value instanceof String) {
                map.putString(key, (String) value);
            } else if (value == JSONObject.NULL) {
                map.putNull(key);
            }
        }
        return map;
    }
}
