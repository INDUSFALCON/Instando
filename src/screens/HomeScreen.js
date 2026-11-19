import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import UrlInput from '../components/UrlInput';
import DownloadButton from '../components/DownloadButton';
import DownloadProgress from '../components/DownloadProgress';
import DownloadItem from '../components/DownloadItem';
import SettingsModal from '../components/SettingsModal';
import DownloadService from '../services/DownloadService';
import DownloadDatabase, { DownloadStatus } from '../database/DownloadDatabase';
import StorageService from '../services/StorageService';
import { validateUrl } from '../utils/urlValidator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function HomeScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDownload, setActiveDownload] = useState(null);
  const [recentDownloads, setRecentDownloads] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'downloads' | 'settings'
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Load download history and sync with native downloads
  const loadHistory = useCallback(async () => {
    try {
      const list = await DownloadService.syncHistory();
      setRecentDownloads(list);

      // Check if there is an in-progress download
      const inProgress = list.find(
        (d) =>
          d.status === DownloadStatus.WAITING ||
          d.status === DownloadStatus.PROCESSING ||
          d.status === DownloadStatus.RESOLVING ||
          d.status === DownloadStatus.DOWNLOADING
      );
      if (inProgress) {
        setActiveDownload(inProgress);
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
  }, []);

  useEffect(() => {
    loadHistory();

    // Request notification permission on first launch
    DownloadService.requestNotificationPermission();

    // Subscribe to download updates
    const unsubscribe = DownloadService.subscribe((event) => {
      loadHistory();
      if (event.type === 'PROGRESS' || event.type === 'STATUS_CHANGE') {
        if (event.data && event.data.id) {
          DownloadDatabase.getDownloadById(event.data.id).then((item) => {
            if (item) {
              setActiveDownload(item);
              if (item.status === DownloadStatus.COMPLETED || item.status === DownloadStatus.FAILED) {
                setLoading(false);
              }
            }
          });
        }
      }
    });

    return () => unsubscribe();
  }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  // Handle URL Paste or Edit
  const handleUrlChange = (text) => {
    setUrl(text);
  };

  const handleClearUrl = () => {
    setUrl('');
  };

  // Trigger Manual Download
  const handleStartDownload = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Empty URL', 'Please paste or enter an Instagram link.');
      return;
    }

    const validation = validateUrl(trimmed);
    if (!validation.isValid) {
      Alert.alert('Invalid Link', validation.error || 'Please provide a valid Instagram link.');
      return;
    }

    setLoading(true);
    try {
      const res = await DownloadService.enqueueDownload(trimmed);
      if (res.isDuplicate) {
        Alert.alert('Download In Progress', res.message);
        setActiveDownload(res.item);
        setLoading(false);
        return;
      }

      setActiveDownload(res.item);
      setUrl(''); // Clear input after successful enqueue
      await loadHistory();
    } catch (err) {
      Alert.alert('Download Error', err.message || 'Failed to start download.');
      setLoading(false);
    }
  };

  // File Operations: Open, Share, Delete
  const handleOpenFile = async (fileUri, mediaType) => {
    const mime = mediaType === 'image' ? 'image/*' : 'video/*';
    await StorageService.openFile(fileUri, mime);
  };

  const handleShareFile = async (fileUri, mediaType) => {
    const mime = mediaType === 'image' ? 'image/*' : 'video/*';
    await StorageService.shareFile(fileUri, mime);
  };

  const handleDeleteFile = async (id, fileUri) => {
    await StorageService.deleteFile(fileUri);
    await DownloadDatabase.deleteDownload(id);
    if (activeDownload && activeDownload.id === id) {
      setActiveDownload(null);
    }
    await loadHistory();
  };

  // Tab navigation content
  const renderHomeContent = () => (
    <>
      {/* Download Section Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Download Media</Text>
        <Text style={styles.sectionSubtitle}>
          Download Instagram Reels, Posts, and Videos directly to Gallery
        </Text>

        <UrlInput
          value={url}
          onChangeText={handleUrlChange}
          onPaste={handleUrlChange}
          onClear={handleClearUrl}
          disabled={loading}
        />

        <DownloadButton
          onPress={handleStartDownload}
          loading={loading}
          disabled={!url.trim()}
          title="Download Now"
        />
      </View>

      {/* Active Download Progress Card */}
      {activeDownload && (
        <View style={styles.activeSection}>
          <Text style={styles.subSectionHeader}>Current Status</Text>
          <DownloadProgress item={activeDownload} />
        </View>
      )}

      {/* Recent Downloads Section */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeaderRow}>
          <Text style={styles.subSectionHeader}>Recent Downloads</Text>
          {recentDownloads.length > 0 && (
            <TouchableOpacity onPress={() => setActiveTab('downloads')}>
              <Text style={styles.viewAllText}>View All ({recentDownloads.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentDownloads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyTitle}>No downloads yet</Text>
            <Text style={styles.emptySubtitle}>
              Paste a link above or share any Reel from Instagram to Instando
            </Text>
          </View>
        ) : (
          recentDownloads.slice(0, 5).map((item) => (
            <DownloadItem
              key={item.id}
              item={item}
              onOpen={handleOpenFile}
              onShare={handleShareFile}
              onDelete={handleDeleteFile}
            />
          ))
        )}
      </View>
    </>
  );

  const renderDownloadsContent = () => (
    <View style={styles.recentSection}>
      <Text style={styles.subSectionHeader}>All Downloads ({recentDownloads.length})</Text>
      {recentDownloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>No downloads saved</Text>
          <Text style={styles.emptySubtitle}>Completed downloads will appear here.</Text>
        </View>
      ) : (
        recentDownloads.map((item) => (
          <DownloadItem
            key={item.id}
            item={item}
            onOpen={handleOpenFile}
            onShare={handleShareFile}
            onDelete={handleDeleteFile}
          />
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Header onOpenSettings={() => setSettingsVisible(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
            colors={[colors.primaryLight]}
          />
        }
      >
        {activeTab === 'home' && renderHomeContent()}
        {activeTab === 'downloads' && renderDownloadsContent()}
      </ScrollView>

      {/* Minimal Bottom Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'home' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'downloads' && styles.navItemActive]}
          onPress={() => setActiveTab('downloads')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'downloads' && styles.navIconActive]}>📥</Text>
          <Text style={[styles.navLabel, activeTab === 'downloads' && styles.navLabelActive]}>Downloads</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setSettingsVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Settings & Info Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onCheckPermission={DownloadService.requestNotificationPermission}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.borderRadiusXl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: spacing.sm,
  },
  activeSection: {
    marginBottom: spacing.xl,
  },
  recentSection: {
    marginBottom: spacing.xl,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subSectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  emptyContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.borderRadiusLg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 240,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: spacing.borderRadiusMd,
  },
  navItemActive: {
    backgroundColor: colors.primaryMuted,
  },
  navIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
