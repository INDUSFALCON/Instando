package com.instando;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;

public class NotificationHelper {
    public static final String CHANNEL_ID = "instando_downloads";
    public static final String CHANNEL_NAME = "Instando Downloads";
    private static final int NOTIFICATION_BASE_ID = 2000;

    private final Context context;
    private final NotificationManager notificationManager;
    private long lastProgressUpdateTime = 0;

    public NotificationHelper(Context context) {
        this.context = context.getApplicationContext();
        this.notificationManager = (NotificationManager) this.context.getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Progress and status notifications for Instando media downloads");
            channel.enableVibration(false);
            channel.setShowBadge(false);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    public NotificationCompat.Builder createProgressNotificationBuilder(String filename, int progress) {
        String title = "Instando: Downloading media";
        String contentText = (filename != null && !filename.isEmpty()) ? filename : "Downloading...";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentTitle(title)
                .setContentText(contentText + " (" + progress + "%)")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (progress >= 0 && progress <= 100) {
            builder.setProgress(100, progress, false);
        } else {
            builder.setProgress(100, 0, true);
        }

        return builder;
    }

    public void updateProgressNotification(int notificationId, String filename, int progress) {
        long now = System.currentTimeMillis();
        // Throttle updates to at most once every 350ms to prevent notification spam
        if (now - lastProgressUpdateTime < 350 && progress < 100 && progress > 0) {
            return;
        }
        lastProgressUpdateTime = now;

        if (notificationManager != null) {
            try {
                notificationManager.notify(notificationId, createProgressNotificationBuilder(filename, progress).build());
            } catch (Exception e) {
                // Ignore if notifications restricted
            }
        }
    }

    public void dismissNotification(int notificationId) {
        if (notificationManager != null) {
            try {
                notificationManager.cancel(notificationId);
            } catch (Exception ignored) {}
        }
    }

    public void showSuccessToast() {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Toast.makeText(context, "Downloaded successfully!", Toast.LENGTH_SHORT).show();
            } catch (Exception ignored) {}
        });
    }

    public void showToast(final String message) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
            } catch (Exception ignored) {}
        });
    }

    public void showFailureNotification(int notificationId, String filename, String errorMessage) {
        dismissNotification(notificationId);
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_error)
                .setContentTitle("Instando: Download Failed")
                .setContentText(errorMessage != null ? errorMessage : "Could not download media")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(errorMessage != null ? errorMessage : "Could not download media"))
                .setOngoing(false)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        if (notificationManager != null) {
            try {
                notificationManager.notify(notificationId, builder.build());
            } catch (Exception ignored) {}
        }
    }

    public static int getNotificationIdForDownload(String downloadId) {
        if (downloadId == null) return NOTIFICATION_BASE_ID;
        return NOTIFICATION_BASE_ID + Math.abs(downloadId.hashCode() % 5000);
    }
}
