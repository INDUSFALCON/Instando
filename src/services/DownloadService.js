import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import DownloadDatabase, { DownloadStatus } from '../database/DownloadDatabase';
import { validateUrl } from '../utils/urlValidator';

const { DownloadManagerModule } = NativeModules;
const eventEmitter = DownloadManagerModule ? new NativeEventEmitter(DownloadManagerModule) : null;

class DownloadService {
  constructor() {
    this.listeners = new Set();
    this.setupNativeListeners();
  }

  /**
   * Listens to real-time events emitted by native Android DownloadWorker / DownloadManagerModule
   */
  setupNativeListeners() {
    if (!eventEmitter) return;

    // Listen to download progress
    eventEmitter.addListener('onDownloadProgress', (event) => {
      // event: { id, progress, bytesDownloaded, totalBytes, status }
      this.handleProgressUpdate(event);
    });

    // Listen to status changes
    eventEmitter.addListener('onDownloadStatusChanged', (event) => {
      // event: { id, status, error, fileUri, filename, mediaType }
      this.handleStatusUpdate(event);
    });

    // Listen to new download queued (e.g. from background share receiver while app is foregrounded)
    eventEmitter.addListener('onDownloadQueued', (event) => {
      this.handleQueuedUpdate(event);
    });
  }

  /**
   * Request Android 13+ POST_NOTIFICATIONS permission
   */
  async requestNotificationPermission() {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'Instando requires notification permission to show background download progress and completion alerts.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Notification permission error:', err);
        return false;
      }
    }
    return true;
  }

  async handleProgressUpdate(event) {
    if (!event || !event.id) return;
    await DownloadDatabase.updateDownload(event.id, {
      progress: event.progress,
      status: event.status || DownloadStatus.DOWNLOADING,
      fileSize: event.totalBytes || 0,
    });
    this.notifyListeners({ type: 'PROGRESS', data: event });
  }

  async handleStatusUpdate(event) {
    if (!event || !event.id) return;
    const updates = {
      status: event.status,
      error: event.error || null,
      fileUri: event.fileUri || null,
      filename: event.filename || null,
      thumbnailUrl: event.thumbnailUrl || null,
      completedAt: event.status === DownloadStatus.COMPLETED ? Date.now() : null,
    };
    await DownloadDatabase.updateDownload(event.id, updates);
    this.notifyListeners({ type: 'STATUS_CHANGE', data: event });
  }

  async handleQueuedUpdate(event) {
    if (!event || !event.id) return;
    await DownloadDatabase.saveDownload({
      id: event.id,
      originalUrl: event.url,
      status: DownloadStatus.WAITING,
      mediaType: event.mediaType || 'reel',
      filename: event.filename || '',
      createdAt: Date.now(),
      progress: 0,
    });
    this.notifyListeners({ type: 'QUEUED', data: event });
  }

  /**
   * Enqueues a download job to the Native Android Download Engine
   */
  async enqueueDownload(rawUrl) {
    const validation = validateUrl(rawUrl);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid URL');
    }

    // Check for running duplicate download
    const existing = await DownloadDatabase.findByUrl(validation.url);
    if (existing && (existing.status === DownloadStatus.DOWNLOADING || existing.status === DownloadStatus.WAITING || existing.status === DownloadStatus.PROCESSING)) {
      return {
        isDuplicate: true,
        downloadId: existing.id,
        item: existing,
        message: 'This download is already in progress.',
      };
    }

    const downloadId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Save to local database initially
    const localRecord = await DownloadDatabase.saveDownload({
      id: downloadId,
      originalUrl: validation.url,
      mediaType: validation.mediaType || 'reel',
      status: DownloadStatus.WAITING,
      progress: 0,
      createdAt: Date.now(),
    });

    // Submit to native DownloadManager module
    if (DownloadManagerModule && DownloadManagerModule.enqueueDownload) {
      try {
        const result = await DownloadManagerModule.enqueueDownload(downloadId, validation.url, validation.mediaType);
        return {
          isDuplicate: false,
          downloadId,
          item: localRecord,
          nativeResult: result,
        };
      } catch (nativeErr) {
        await DownloadDatabase.updateDownload(downloadId, {
          status: DownloadStatus.FAILED,
          error: nativeErr.message || 'Failed to schedule native download worker',
        });
        throw nativeErr;
      }
    } else {
      // Fallback for development if native module not yet linked
      console.warn('Native DownloadManagerModule not available. Simulation mode.');
      return {
        isDuplicate: false,
        downloadId,
        item: localRecord,
      };
    }
  }

  /**
   * Synchronizes history with native storage (background downloads done while app was killed)
   */
  async syncHistory() {
    try {
      if (DownloadManagerModule && DownloadManagerModule.getAllDownloads) {
        const nativeList = await DownloadManagerModule.getAllDownloads();
        if (Array.isArray(nativeList)) {
          return await DownloadDatabase.mergeNativeDownloads(nativeList);
        }
      }
    } catch (e) {
      console.warn('Error syncing with native downloads:', e);
    }
    return await DownloadDatabase.getDownloads();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.warn('Listener error in DownloadService:', e);
      }
    });
  }
}

export default new DownloadService();
