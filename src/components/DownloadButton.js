import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function DownloadButton({ onPress, loading, disabled, title = 'Download' }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
            <Text style={styles.buttonText}>Processing...</Text>
          </>
        ) : (
          <>
            <Text style={styles.downloadIcon}>↓</Text>
            <Text style={styles.buttonText}>{title}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: spacing.borderRadiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: colors.cardBackgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginRight: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  spinner: {
    marginRight: spacing.sm,
  },
});
