import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { OnboardCard } from '../../components/OnboardCard';

export const WelcomeSlide: React.FC = () => {
  return (
    <OnboardCard
      title="Welcome to Kapoor & Sons Attendance"
      subtitle="Fast, secure check-ins with privacy by design"
    >
      {/* TODO: Replace with branded illustration / Lottie */}
      <View style={styles.hero} accessibilityLabel="Brand illustration" />
      <Text style={styles.text}>
        Clock in, manage breaks, and stay compliant effortlessly.
      </Text>
    </OnboardCard>
  );
};

const styles = StyleSheet.create({
  hero: {
    height: 140,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    // className: 'h-36 bg-gray-200 rounded-xl mb-3'
  },
  text: {
    fontSize: 16,
    color: '#374151',
  },
});

export default WelcomeSlide;
