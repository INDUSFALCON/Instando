import { NativeModules, Alert, Platform } from 'react-native';

const { DownloadManagerModule } = NativeModules;

class StorageService {
  /**
   * Opens the downloaded media file in the default system viewer/player
   */
  async openFile(fileUri, mimeType = 'video/*') {
    if (!fileUri) {
      Alert.alert('File not found', 'Cannot open media because the file path is missing.');
      return false;
    }

    try {
      if (DownloadManagerModule && DownloadManagerModule.openFile) {
        return await DownloadManagerModule.openFile(fileUri, mimeType);
      }
      return false;
    } catch (e) {
      console.warn('Error opening file:', e);
      Alert.alert('Cannot Open', e.message || 'No app available to open this file.');
      return false;
    }
  }

  /**
   * Shares the downloaded media file with other apps via Android ACTION_SEND
   */
  async shareFile(fileUri, mimeType = 'video/*') {
    if (!fileUri) {
      Alert.alert('File not found', 'Cannot share media because the file path is missing.');
      return false;
    }

    try {
      if (DownloadManagerModule && DownloadManagerModule.shareFile) {
        return await DownloadManagerModule.shareFile(fileUri, mimeType);
      }
      return false;
    } catch (e) {
      console.warn('Error sharing file:', e);
      Alert.alert('Cannot Share', e.message || 'Failed to share this file.');
      return false;
    }
  }

  /**
   * Deletes the media file from device storage/MediaStore
   */
  async deleteFile(fileUri) {
    if (!fileUri) return true;

    try {
      if (DownloadManagerModule && DownloadManagerModule.deleteFile) {
        return await DownloadManagerModule.deleteFile(fileUri);
      }
      return true;
    } catch (e) {
      console.warn('Error deleting file:', e);
      return false;
    }
  }
}

export default new StorageService();
