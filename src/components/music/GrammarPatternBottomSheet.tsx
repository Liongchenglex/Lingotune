/**
 * GrammarPatternBottomSheet
 *
 * Shows grammar patterns detected in a line.
 * Displays pattern type and explanation (basic for now, will enhance in Phase 2B).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { GrammarPattern } from '../../hooks/useAnalysis';

interface GrammarPatternBottomSheetProps {
  visible: boolean;
  patterns: GrammarPattern[];
  onClose: () => void;
}

export const GrammarPatternBottomSheet: React.FC<GrammarPatternBottomSheetProps> = ({
  visible,
  patterns,
  onClose,
}) => {
  if (patterns.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Drag indicator */}
            <View style={styles.dragIndicator} />

            {/* Title */}
            <Text style={styles.title}>Grammar Patterns</Text>
            <Text style={styles.subtitle}>
              {patterns.length} {patterns.length === 1 ? 'pattern' : 'patterns'} detected
            </Text>

            {/* Patterns List */}
            <View style={styles.patternsContainer}>
              {patterns.map((pattern, index) => (
                <View key={index} style={styles.patternCard}>
                  <View style={styles.patternHeader}>
                    <Text style={styles.patternSurface}>{pattern.example}</Text>
                    <Text style={styles.patternLevel}>{pattern.level}</Text>
                  </View>

                  <Text style={styles.patternExplanation}>{pattern.explanation}</Text>
                </View>
              ))}
            </View>

            {/* Info notice */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                More detailed lessons on these patterns coming in Phase 2B
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 300,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  patternsContainer: {
    gap: 12,
  },
  patternCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternSurface: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  patternLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'capitalize',
  },
  patternExplanation: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
