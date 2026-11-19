import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function SettingsModal({ visible, onClose, onCheckPermission }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>About Instando</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Share to Download workflow guide */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ Share-to-Download (Zero Click)</Text>
              <Text style={styles.sectionText}>
                1. Open Instagram and choose any Reel or Post.{'\n'}
                2. Tap Share and select Instando.{'\n'}
                3. Download begins instantly in the background!{'\n'}
                4. A notification shows progress and disappears when completed.{'\n'}
                5. Check your phone Gallery.
              </Text>
            </View>

            {/* Storage directory info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📁 Storage Locations</Text>
              <Text style={styles.sectionText}>
                • Videos & Reels: <Text style={styles.highlight}>Movies/Instando/</Text>{'\n'}
                • Images: <Text style={styles.highlight}>Pictures/Instando/</Text>{'\n'}
                All media is indexed into Android MediaStore so it appears immediately in Google Photos and your phone's Gallery app.
              </Text>
            </View>

            {/* Permissions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔔 Notification Permission</Text>
              <Text style={styles.sectionText}>
                Android 13+ requires notification permission to display ongoing download progress bars and completion alerts.
              </Text>
              <TouchableOpacity
                style={styles.permissionBtn}
                onPress={onCheckPermission}
                activeOpacity={0.7}
              >
                <Text style={styles.permissionBtnText}>Request / Verify Permission</Text>
              </TouchableOpacity>
            </View>

            {/* Battery optimization */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔋 Background Execution</Text>
              <Text style={styles.sectionText}>
                Instando utilizes Android WorkManager. Downloads persist reliably even if Instando is removed from recent apps or the phone screen is locked.
              </Text>
            </View>

            {/* Privacy info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔒 Privacy & Security</Text>
              <Text style={styles.sectionText}>
                • No account or login required.{'\n'}
                • No analytics or ads.{'\n'}
                • No remote servers or credential tracking.{'\n'}
                • Personal use utility.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: spacing.borderRadiusXl,
    borderTopRightRadius: spacing.borderRadiusXl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  body: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: colors.inputBg,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  sectionText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  highlight: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  permissionBtn: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: spacing.borderRadiusSm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  permissionBtnText: {
    color: colors.primaryLight,
    fontSize: 12.5,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: spacing.borderRadiusLg,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
