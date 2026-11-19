import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function Header({ onOpenSettings }) {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {/* Stylized Instando Brand Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner} />
            <View style={styles.iconDot} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.appName}>Instando</Text>
          <Text style={styles.subtitle}>Instagram Media Downloader</Text>
        </View>
      </View>

      {/* Settings / Info Button */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={onOpenSettings}
        activeOpacity={0.7}
        accessibilityLabel="Settings and Information"
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconOuter: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: colors.accent,
  },
  iconDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.accent,
    position: 'absolute',
    top: 2,
    right: 2,
  },
  textContainer: {
    justifyContent: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 18,
    color: colors.textSecondary,
  },
});
