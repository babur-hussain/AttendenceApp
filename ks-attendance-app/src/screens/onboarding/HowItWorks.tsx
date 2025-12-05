import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardCard } from '../../components/OnboardCard';

export const HowItWorks: React.FC = () => {
  return (
    <OnboardCard
      title="How it works"
      subtitle="Your day, simplified"
    >
      <View style={styles.row}>
        <View style={styles.bullet} />
        <Text style={styles.text}>Clock-in with a quick selfie and tap.</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.bullet} />
        <Text style={styles.text}>Start/End breaks in seconds, transparently.</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.bullet} />
        <Text style={styles.text}>Privacy-first: we store face embeddings, not raw images.</Text>
      </View>
      {/* TODO: Add small animations with Reanimated/Moti for each row */}
    </OnboardCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 10 },
  text: { fontSize: 16, color: '#374151', flex: 1 },
});

export default HowItWorks;
