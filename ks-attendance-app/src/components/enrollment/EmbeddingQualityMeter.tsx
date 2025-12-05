/**
 * EmbeddingQualityMeter
 * Visual quality indicator with color states and tips
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { QualityAssessment } from '../../biometric/FacePipeline';

interface EmbeddingQualityMeterProps {
  quality: QualityAssessment | null;
  showDetails?: boolean;
}

export const EmbeddingQualityMeter: React.FC<EmbeddingQualityMeterProps> = ({
  quality,
  showDetails = false,
}) => {
  if (!quality) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>No quality data</Text>
      </View>
    );
  }

  const { score, passesThreshold, factors, tips } = quality;

  // Determine color based on score
  const getColor = (value: number): string => {
    if (value >= 80) return '#34c759'; // Green
    if (value >= 65) return '#FF9500'; // Orange
    return '#ff3b30'; // Red
  };

  const getStatusEmoji = (value: number): string => {
    if (value >= 80) return '✓';
    if (value >= 65) return '⚠';
    return '✗';
  };

  const color = getColor(score);

  return (
    <View style={styles.container}>
      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <View style={[styles.scoreCircle, { borderColor: color }]}>
          <Text style={[styles.scoreValue, { color }]}>{score}</Text>
          <Text style={styles.scoreLabel}>Quality</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${score}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={[styles.statusText, { color }]}>
          {passesThreshold ? 'Good Quality' : 'Improve Quality'}
        </Text>
      </View>

      {/* Quality Factors */}
      {showDetails && (
        <View style={styles.factorsContainer}>
          <Text style={styles.factorsTitle}>Quality Factors:</Text>
          
          <FactorRow
            label="Lighting"
            score={factors.lighting.score}
            status={factors.lighting.status}
          />
          <FactorRow
            label="Sharpness"
            score={factors.sharpness.score}
            status={factors.sharpness.status}
          />
          <FactorRow
            label="Face Angle"
            score={factors.pose.score}
            status={factors.pose.status}
          />
          <FactorRow
            label="Clarity"
            score={factors.occlusion.score}
            status={factors.occlusion.status}
          />
        </View>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips:</Text>
          {tips.map((tip, index) => (
            <Text key={index} style={styles.tipText}>
              • {tip}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * FactorRow Component
 */
interface FactorRowProps {
  label: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
}

const FactorRow: React.FC<FactorRowProps> = ({ label, score, status }) => {
  const getColor = (s: string): string => {
    if (s === 'good') return '#34c759';
    if (s === 'warning') return '#FF9500';
    return '#ff3b30';
  };

  const getIcon = (s: string): string => {
    if (s === 'good') return '✓';
    if (s === 'warning') return '⚠';
    return '✗';
  };

  const color = getColor(status);
  const icon = getIcon(status);

  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorLabel}>{label}</Text>
      <View style={styles.factorValueContainer}>
        <View style={styles.factorBar}>
          <View
            style={[
              styles.factorBarFill,
              {
                width: `${score}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={[styles.factorIcon, { color }]}>{icon}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 3,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  
  // Score Display
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  // Progress Bar
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Factors
  factorsContainer: {
    marginBottom: 16,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  factorLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  factorValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  factorBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  
  // Tips
  tipsContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
});
