/**
 * HistoryCalendar - Interactive Month Calendar Component
 * 
 * Features:
 * - Day badges (present/absent/late/over-break)
 * - Month navigation
 * - Day selection
 * - Accessible labels
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DayBadge } from '../../hooks/useHistory';

interface HistoryCalendarProps {
  year: number;
  month: number;
  days: Record<string, DayBadge>;
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({
  year,
  month,
  days,
  selectedDate,
  onDateSelect,
  onMonthChange,
}) => {
  const getDaysInMonth = () => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    
    const calendarDays: (number | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }
    
    return calendarDays;
  };

  const getBadgeColor = (badge?: DayBadge): string => {
    if (!badge) return '#F5F5F5';
    
    switch (badge.type) {
      case 'present': return '#4CAF50';
      case 'late': return '#FF9800';
      case 'over-break': return '#FF5722';
      case 'partial': return '#2196F3';
      case 'absent': return '#9E9E9E';
      default: return '#F5F5F5';
    }
  };

  const getBadgeLabel = (badge?: DayBadge): string => {
    if (!badge) return 'No data';
    
    switch (badge.type) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'over-break': return 'Over break';
      case 'partial': return 'Partial';
      case 'absent': return 'Absent';
      default: return 'Unknown';
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const calendarDays = getDaysInMonth();

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Text style={styles.navText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.monthTitle}>
          {MONTHS[month - 1]} {year}
        </Text>
        
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Text style={styles.navText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(day => (
          <Text key={day} style={styles.weekdayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.emptyCell} />;
          }

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const badge = days[dateStr];
          const isSelected = dateStr === selectedDate;
          const badgeColor = getBadgeColor(badge);
          const badgeLabel = getBadgeLabel(badge);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                isSelected && styles.selectedCell,
                { backgroundColor: badgeColor },
              ]}
              onPress={() => onDateSelect(dateStr)}
              accessibilityLabel={`${day} ${badgeLabel}`}
              accessibilityHint="Tap to view day details"
            >
              <Text style={[styles.dayText, isSelected && styles.selectedText]}>
                {day}
              </Text>
              {badge && badge.eventsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeCount}>{badge.eventsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  navText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 1,
    position: 'relative',
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  selectedText: {
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeCount: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});
