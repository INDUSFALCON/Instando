import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { formatBytes, formatDate, formatStatus } from '../utils/formatters';

export default function DownloadItem({ item, onOpen, onShare, onDelete }) {
  if (!item) return null;

  const {
    id,
    filename,
    mediaType,
    status,
    fileSize,
    createdAt,
    thumbnailUrl,
    fileUri,
  } = item;

  const statusInfo = formatStatus(status);
  const isCompleted = status === 'COMPLETED';

  const handleDelete = () => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to delete "${filename || 'this item'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(id, fileUri) },
      ]
    );
  };

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
      <View style={styles.contentRow}>
        {/* Media Thumbnail */}
        <TouchableOpacity
          style={styles.thumbnailWrapper}
          onPress={() => isCompleted && onOpen(fileUri, mediaType)}
          disabled={!isCompleted}
          activeOpacity={0.8}
        >
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={styles.fallbackThumbnail}>
              <Text style={styles.fallbackEmoji}>
                {mediaType === 'image' ? '🖼️' : '🎬'}
              </Text>
            </View>
          )}
          {isCompleted && (
            <View style={styles.playOverlay}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCol}>
          <View style={styles.headerRow}>
            <View style={[styles.typeBadge, { backgroundColor: getBadgeColor(mediaType) }]}>
              <Text style={styles.typeText}>{(mediaType || 'MEDIA').toUpperCase()}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(createdAt)}</Text>
          </View>

          <Text style={styles.filename} numberOfLines={1} ellipsizeMode="middle">
            {filename || 'Media file'}
          </Text>

          <View style={styles.metaRow}>
            {fileSize > 0 && (
              <Text style={styles.metaText}>{formatBytes(fileSize)}</Text>
            )}
            <View style={[styles.statusTag, { borderColor: statusInfo.color }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons Row */}
      {isCompleted && (
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onOpen(fileUri, mediaType)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>👁</Text>
            <Text style={styles.actionText}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onShare(fileUri, mediaType)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>↗</Text>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionIcon, styles.deleteText]}>🗑</Text>
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
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
    marginBottom: spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: spacing.borderRadiusMd,
    overflow: 'hidden',
    backgroundColor: colors.inputBg,
    position: 'relative',
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
    backgroundColor: colors.cardBackgroundElevated,
  },
  fallbackEmoji: {
    fontSize: 26,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 8,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  filename: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    marginRight: spacing.md,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionIcon: {
    fontSize: 13,
    marginRight: 5,
    color: colors.textSecondary,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {},
  deleteText: {
    color: colors.error,
  },
});
