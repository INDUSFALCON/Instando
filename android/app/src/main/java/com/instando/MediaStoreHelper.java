package com.instando;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MediaStoreHelper {

    public static class MediaSaveTarget {
        public Uri contentUri;
        public OutputStream outputStream;
        public String relativePath;
        public String finalFilename;
        public boolean isScopedStorage;
        public File legacyFile;
    }

    /**
     * Prepares an OutputStream in Scoped Storage (MediaStore) for saving downloaded media.
     * Sets IS_PENDING = 1 while downloading.
     */
    public static MediaSaveTarget prepareMediaFile(Context context, String filename, String mimeType, boolean isVideo) throws Exception {
        ContentResolver resolver = context.getContentResolver();
        MediaSaveTarget target = new MediaSaveTarget();
        target.finalFilename = makeUniqueFilename(filename);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            target.isScopedStorage = true;
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, target.finalFilename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType != null ? mimeType : (isVideo ? "video/mp4" : "image/jpeg"));
            
            String directory = isVideo ? (Environment.DIRECTORY_MOVIES + "/Instando") : (Environment.DIRECTORY_PICTURES + "/Instando");
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, directory);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            target.relativePath = directory;

            Uri collectionUri = isVideo ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                    : MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);

            Uri uri = resolver.insert(collectionUri, values);
            if (uri == null) {
                throw new Exception("Unable to create MediaStore entry for " + target.finalFilename);
            }

            target.contentUri = uri;
            target.outputStream = resolver.openOutputStream(uri);
            if (target.outputStream == null) {
                throw new Exception("Unable to open output stream for MediaStore Uri " + uri);
            }
        } else {
            // Legacy storage for Android 9 and lower
            target.isScopedStorage = false;
            File publicDir = Environment.getExternalStoragePublicDirectory(
                    isVideo ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES
            );
            File instandoDir = new File(publicDir, "Instando");
            if (!instandoDir.exists()) {
                instandoDir.mkdirs();
            }

            File targetFile = new File(instandoDir, target.finalFilename);
            target.legacyFile = targetFile;
            target.outputStream = new FileOutputStream(targetFile);
            target.contentUri = Uri.fromFile(targetFile);
        }

        return target;
    }

    /**
     * Publishes the file in MediaStore by releasing IS_PENDING = 0.
     */
    public static void publishMediaFile(Context context, MediaSaveTarget target) {
        if (target == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && target.contentUri != null) {
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                context.getContentResolver().update(target.contentUri, values, null, null);
            } catch (Exception e) {
                // Ignore if update fails
            }
        } else if (target.legacyFile != null) {
            // Trigger media scanner on legacy devices
            try {
                Intent mediaScanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                mediaScanIntent.setData(Uri.fromFile(target.legacyFile));
                context.sendBroadcast(mediaScanIntent);
            } catch (Exception ignored) {}
        }
    }

    /**
     * Cleans up pending/partial file on download failure.
     */
    public static void discardPendingMediaFile(Context context, MediaSaveTarget target) {
        if (target == null) return;
        try {
            if (target.outputStream != null) {
                target.outputStream.close();
            }
        } catch (Exception ignored) {}

        try {
            if (target.isScopedStorage && target.contentUri != null) {
                context.getContentResolver().delete(target.contentUri, null, null);
            } else if (target.legacyFile != null && target.legacyFile.exists()) {
                target.legacyFile.delete();
            }
        } catch (Exception ignored) {}
    }

    /**
     * Generates a collision-safe unique filename.
     */
    private static String makeUniqueFilename(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "instando_" + System.currentTimeMillis() + ".mp4";
        }
        String clean = name.replaceAll("[\\\\/:*?\"<>|]", "_");
        int dot = clean.lastIndexOf('.');
        if (dot > 0) {
            String base = clean.substring(0, dot);
            String ext = clean.substring(dot);
            return base + "_" + System.currentTimeMillis() % 100000 + ext;
        }
        return clean + "_" + System.currentTimeMillis() % 100000;
    }

    /**
     * Launches an Intent to view the downloaded file.
     */
    public static boolean openFile(Context context, String fileUriStr, String mimeType) {
        try {
            Uri uri = Uri.parse(fileUriStr);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mimeType != null ? mimeType : "*/*");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Launches a share sheet Intent for the downloaded file.
     */
    public static boolean shareFile(Context context, String fileUriStr, String mimeType) {
        try {
            Uri uri = Uri.parse(fileUriStr);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mimeType != null ? mimeType : "*/*");
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(intent, "Share media via");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(chooser);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Deletes the media file from device storage or MediaStore.
     */
    public static boolean deleteFile(Context context, String fileUriStr) {
        if (fileUriStr == null) return false;
        try {
            Uri uri = Uri.parse(fileUriStr);
            if ("content".equalsIgnoreCase(uri.getScheme())) {
                int deleted = context.getContentResolver().delete(uri, null, null);
                return deleted > 0;
            } else if ("file".equalsIgnoreCase(uri.getScheme())) {
                File file = new File(uri.getPath());
                return file.exists() && file.delete();
            }
        } catch (Exception ignored) {}
        return false;
    }
}
