import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@instando_download_history_v1';

export const DownloadStatus = {
  WAITING: 'WAITING',
  PROCESSING: 'PROCESSING',
  RESOLVING: 'RESOLVING',
  DOWNLOADING: 'DOWNLOADING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

class DownloadDatabase {
  /**
   * Retrieves all persisted downloads, sorted by creation timestamp descending.
   */
  async getDownloads() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to load downloads from storage:', e);
      return [];
    }
  }

  /**
   * Retrieves a single download by its unique ID.
   */
  async getDownloadById(id) {
    const list = await this.getDownloads();
    return list.find(item => item.id === id) || null;
  }

  /**
   * Finds an existing download by normalized URL (to detect duplicates)
   */
  async findByUrl(url) {
    if (!url) return null;
    const list = await this.getDownloads();
    return list.find(item => item.originalUrl === url) || null;
  }

  /**
   * Inserts or updates a download record.
   */
  async saveDownload(item) {
    try {
      const list = await this.getDownloads();
      const existingIndex = list.findIndex(d => d.id === item.id);
      
      const record = {
        id: item.id || `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        originalUrl: item.originalUrl || '',
        mediaType: item.mediaType || 'reel', // reel | post | video | image
        filename: item.filename || '',
        fileUri: item.fileUri || null,
        mediaStoreUri: item.mediaStoreUri || null,
        thumbnailUrl: item.thumbnailUrl || null,
        status: item.status || DownloadStatus.WAITING,
        progress: typeof item.progress === 'number' ? item.progress : 0,
        fileSize: item.fileSize || 0,
        createdAt: item.createdAt || Date.now(),
        completedAt: item.completedAt || null,
        error: item.error || null,
      };

      if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], ...record };
      } else {
        list.unshift(record);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return record;
    } catch (e) {
      console.warn('Failed to save download record:', e);
      return null;
    }
  }

  /**
   * Updates fields for an existing download item.
   */
  async updateDownload(id, updates) {
    try {
      const list = await this.getDownloads();
      const index = list.findIndex(d => d.id === id);
      if (index === -1) return null;

      list[index] = {
        ...list[index],
        ...updates,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list[index];
    } catch (e) {
      console.warn('Failed to update download record:', e);
      return null;
    }
  }

  /**
   * Deletes a download record by ID.
   */
  async deleteDownload(id) {
    try {
      const list = await this.getDownloads();
      const filtered = list.filter(d => d.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.warn('Failed to delete download record:', e);
      return false;
    }
  }

  /**
   * Merges downloads updated by Native Android DownloadManager (from background shares).
   */
  async mergeNativeDownloads(nativeItems) {
    if (!Array.isArray(nativeItems) || nativeItems.length === 0) return this.getDownloads();
    
    try {
      const currentList = await this.getDownloads();
      const map = new Map();

      // Put current JS list in map
      for (const item of currentList) {
        map.set(item.id, item);
      }

      // Merge native items (native has authoritative file / progress updates)
      for (const nItem of nativeItems) {
        if (!nItem || !nItem.id) continue;
        const existing = map.get(nItem.id) || {};
        map.set(nItem.id, {
          ...existing,
          ...nItem,
          // Retain latest timestamps
          createdAt: existing.createdAt || nItem.createdAt || Date.now(),
        });
      }

      const mergedList = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
      return mergedList;
    } catch (e) {
      console.warn('Failed to merge native downloads:', e);
      return this.getDownloads();
    }
  }
}

export default new DownloadDatabase();
