import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { extractUrlFromText } from '../utils/urlValidator';

export default function UrlInput({ value, onChangeText, onPaste, onClear, disabled }) {
  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        // Extract clean URL if clipboard text contains captions
        const extracted = extractUrlFromText(text) || text.trim();
        if (onPaste) {
          onPaste(extracted);
        } else {
          onChangeText(extracted);
        }
      }
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Paste Instagram Reel or Post link..."
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!disabled}
          multiline={false}
        />

        <View style={styles.actionsRow}>
          {value.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={onClear}
              disabled={disabled}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.pasteButton}
            onPress={handlePaste}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.pasteText}>Paste</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: spacing.borderRadiusLg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14.5,
    paddingVertical: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardBackgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  clearText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  pasteButton: {
    backgroundColor: colors.primaryMuted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: spacing.borderRadiusSm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pasteText: {
    color: colors.primaryLight,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
