import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable } from 'react-native';
import { WelcomeSlide } from './WelcomeSlide';
import { HowItWorks } from './HowItWorks';
import { PermissionsConsent } from './PermissionsConsent';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../../hooks/useOnboarding';

const { width } = Dimensions.get('window');

export const OnboardingScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { setConsentToken, setAnalyticsOptIn, completeOnboarding } = useOnboarding();
  const slides = useMemo(() => [
    <WelcomeSlide key="s1" />, 
    <HowItWorks key="s2" />, 
    <PermissionsConsent key="s3" onConsentSaved={({ consentTokenC1, analyticsOptIn }) => {
      setConsentToken(consentTokenC1);
      setAnalyticsOptIn(analyticsOptIn);
    }} />
  ], []);

  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const go = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(slides.length - 1, index + dir));
    setIndex(next);
    Animated.timing(progress, { toValue: next, duration: 250, useNativeDriver: false }).start();
  };

  const finish = async () => {
    await completeOnboarding();
    nav.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const canBack = index > 0;
  const isLast = index === slides.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        {/* Placeholder for Moti/Reanimated transitions per slide */}
        <View style={styles.slide}>{slides[index]}</View>
      </View>

      <View style={styles.indicator} accessibilityLabel={`Step ${index+1} of ${slides.length}`}>
        {Array.from({ length: slides.length }).map((_, i) => (
          <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
        ))}
      </View>

      <View style={styles.actions}>
        <SecondaryButton title={canBack ? 'Back' : 'Skip'} onPress={() => canBack ? go(-1) : finish()} accessibilityLabel={canBack ? 'Go back' : 'Skip onboarding'} />
        {isLast ? (
          <PrimaryButton title="Get Started" onPress={finish} accessibilityLabel="Finish onboarding" />
        ) : (
          <PrimaryButton title="Next" onPress={() => go(1)} accessibilityLabel="Next slide" />
        )}
      </View>

      {/* className comments for NativeWind/Tailwind-like styling can replace StyleSheet */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 20, paddingBottom: 32 },
  top: { flex: 1, justifyContent: 'center' },
  slide: { width: '100%' },
  indicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#007AFF' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export default OnboardingScreen;
