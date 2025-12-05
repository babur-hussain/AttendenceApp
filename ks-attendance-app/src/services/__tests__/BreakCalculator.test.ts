/**
 * BreakCalculator.test.ts - Unit Tests
 */

import { BreakCalculator } from '../BreakCalculator';
import { QueuedEvent } from '../AttendanceService';

describe('BreakCalculator', () => {
  const createMockEvent = (eventType: 'BREAK_START' | 'BREAK_END', timestamp: Date): QueuedEvent => ({
    id: `mock-${Date.now()}`,
    eventId: `event-${Date.now()}`,
    rawToon: 'encrypted',
    status: 'queued',
    attempts: 0,
    createdAt: timestamp.toISOString(),
    employeeId: 'EMP001',
    eventType,
    deviceId: 'MOBILE_001',
  });

  describe('calculateDailyBreaks', () => {
    it('should calculate break duration', () => {
      const start = new Date('2024-01-01T12:00:00Z');
      const end = new Date('2024-01-01T13:00:00Z');

      const events = [
        createMockEvent('BREAK_START', start),
        createMockEvent('BREAK_END', end),
      ];

      const summary = BreakCalculator.calculateDailyBreaks(events);

      expect(summary.breakSessions).toHaveLength(1);
      expect(summary.breakSessions[0].durationMinutes).toBe(60);
      expect(summary.totalBreakMinutes).toBe(60);
    });

    it('should detect over-break', () => {
      const start = new Date('2024-01-01T12:00:00Z');
      const end = new Date('2024-01-01T13:20:00Z'); // 80 minutes (over by 10)

      const events = [
        createMockEvent('BREAK_START', start),
        createMockEvent('BREAK_END', end),
      ];

      const summary = BreakCalculator.calculateDailyBreaks(events);

      expect(summary.breakSessions[0].isOverBreak).toBe(true);
      expect(summary.breakSessions[0].overByMinutes).toBe(10);
      expect(summary.overBreakMinutes).toBe(10);
    });

    it('should respect grace period', () => {
      const start = new Date('2024-01-01T12:00:00Z');
      const end = new Date('2024-01-01T13:08:00Z'); // 68 minutes (within grace)

      const events = [
        createMockEvent('BREAK_START', start),
        createMockEvent('BREAK_END', end),
      ];

      const summary = BreakCalculator.calculateDailyBreaks(events);

      expect(summary.breakSessions[0].isOverBreak).toBe(false);
      expect(summary.overBreakMinutes).toBe(0);
    });

    it('should handle multiple breaks', () => {
      const events = [
        createMockEvent('BREAK_START', new Date('2024-01-01T10:00:00Z')),
        createMockEvent('BREAK_END', new Date('2024-01-01T10:15:00Z')),
        createMockEvent('BREAK_START', new Date('2024-01-01T12:00:00Z')),
        createMockEvent('BREAK_END', new Date('2024-01-01T13:00:00Z')),
      ];

      const summary = BreakCalculator.calculateDailyBreaks(events);

      expect(summary.breakSessions).toHaveLength(2);
      expect(summary.totalBreakMinutes).toBe(75); // 15 + 60
    });

    it('should handle unclosed breaks', () => {
      const events = [
        createMockEvent('BREAK_START', new Date('2024-01-01T12:00:00Z')),
      ];

      const summary = BreakCalculator.calculateDailyBreaks(events);

      expect(summary.breakSessions).toHaveLength(1);
      expect(summary.breakSessions[0].endTime).toBeUndefined();
      expect(summary.breakSessions[0].durationMinutes).toBeUndefined();
    });
  });
});
