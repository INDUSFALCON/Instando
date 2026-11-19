import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { formatStatus, formatBytes } from '../utils/formatters';

export default function DownloadProgress({ item }) {
  if (!item) return null;

  const {
    filename,
    mediaType,
    status,
    progress = 0,
    fileSize,
    error,
    thumbnailUrl,
  } = item;

  const statusInfo = formatStatus(status);
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  const getBadgeColor = (type) => {
    switch (type) {
      case 'reel':
        return colors.badgeReel;
      case 'image':
      case 'post':
        return colors.badgeImage;
      default:
        return colors.badgeVideo;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* Thumbnail or Media Type Icon */}
        <View style={styles.thumbnailContainer}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.fallbackThumbnail, { backgroundColor: colors.cardBackgroundElevated }]}>
              <Text style={styles.fallbackIcon}>
                {mediaType === 'image' ? '🖼️' : '🎬'}
              </Text>
            </View>
          )}
        </View>

        {/* Media Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.badgeRow}>
            <View style={[styles.mediaBadge, { backgroundColor: getBadgeColor(mediaType) }]}>
              <Text style={styles.mediaBadgeText}>{(mediaType || 'MEDIA').toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: statusInfo.color }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <Text style={styles.filename} numberOfLines={1} ellipsizeMode="middle">
            {filename || 'Fetching media details...'}
          </Text>

          {fileSize > 0 && (
            <Text style={styles.fileSizeText}>
              {formatBytes(fileSize)}
            </Text>
          )}
        </View>
      </View>

      {/* Progress Bar & Percentage */}
      {status !== 'FAILED' && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressPercentText}>{Math.round(normalizedProgress)}%</Text>
            {status === 'DOWNLOADING' && (
              <Text style={styles.downloadingText}>Downloading to Gallery...</Text>
            )}
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${normalizedProgress}%`,
                  backgroundColor: status === 'COMPLETED' ? colors.success : colors.progressBarFill,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.borderRadiusLg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 54,
    height: 54,
    borderRadius: spacing.borderRadiusMd,
    overflow: 'hidden',
    backgroundColor: colors.inputBg,
    marginRight: spacing.md,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fallbackThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackIcon: {
    fontSize: 24,
  },
  detailsContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mediaBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filename: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  fileSizeText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  progressSection: {
    marginTop: spacing.md,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressPercentText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  downloadingText: {
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.progressBarBg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: spacing.borderRadiusSm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  errorIcon: {
    marginRight: spacing.sm,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
