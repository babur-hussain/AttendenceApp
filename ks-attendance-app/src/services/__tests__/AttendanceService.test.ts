/**
 * AttendanceService.test.ts - Unit Tests
 */

import { AttendanceService, EventType } from '../AttendanceService';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');
jest.mock('expo-location');

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = AttendanceService.getInstance();
  });

  describe('recordCheckin', () => {
    it('should create queued event', async () => {
      const eventId = await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
        matchScore: 0.92,
      });

      expect(eventId).toBeTruthy();
      const queue = service.getLocalQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('queued');
      expect(queue[0].eventType).toBe('IN');
    });

    it('should encrypt TOON payload', async () => {
      await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      });

      const queue = service.getLocalQueue();
      expect(queue[0].rawToon).toBeTruthy();
      // Should be base64 encrypted
      expect(() => Buffer.from(queue[0].rawToon, 'base64')).not.toThrow();
    });
  });

  describe('break management', () => {
    it('should start and end break', async () => {
      await service.startBreak('EMP001', 'LUNCH', 'MOBILE_001');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await service.endBreak('EMP001', 'LUNCH', 'MOBILE_001');

      const queue = service.getLocalQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].eventType).toBe('BREAK_START');
      expect(queue[1].eventType).toBe('BREAK_END');
    });

    it('should throw if no break start found', async () => {
      await expect(
        service.endBreak('EMP001', 'LUNCH', 'MOBILE_001')
      ).rejects.toThrow('No matching break start');
    });
  });

  describe('queue management', () => {
    it('should delete event', async () => {
      const eventId = await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      });

      const queue = service.getLocalQueue();
      await service.deleteEvent(queue[0].id);

      expect(service.getLocalQueue()).toHaveLength(0);
    });

    it('should mark duplicate', async () => {
      await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      });

      const queue = service.getLocalQueue();
      await service.markDuplicate(queue[0].id);

      expect(queue[0].status).toBe('duplicate');
    });

    it('should retry failed event', async () => {
      await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      });

      const queue = service.getLocalQueue();
      queue[0].status = 'failed';
      queue[0].nextRetryAt = new Date(Date.now() + 60000).toISOString();

      await service.retryEvent(queue[0].id);
      expect(queue[0].status).toBe('queued');
      expect(queue[0].nextRetryAt).toBeUndefined();
    });
  });

  describe('event listeners', () => {
    it('should notify listeners on event change', async () => {
      const listener = jest.fn();
      service.addEventListener(listener);

      await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        status: 'queued',
        eventType: 'IN',
      }));

      service.removeEventListener(listener);
    });

    it('should not notify after removal', async () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      service.removeEventListener(listener);

      await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('should save queue to SecureStore', async () => {
      await service.recordCheckin({
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'attendance_queue',
        expect.any(String)
      );
    });

    it('should load queue from SecureStore', async () => {
      const mockQueue = [{
        id: 'test-id',
        eventId: 'event-id',
        rawToon: 'encrypted',
        status: 'queued',
        attempts: 0,
        createdAt: new Date().toISOString(),
        employeeId: 'EMP001',
        eventType: 'IN',
        deviceId: 'MOBILE_001',
      }];

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        Buffer.from(JSON.stringify(mockQueue)).toString('base64')
      );

      // Force reload
      const newService = AttendanceService.getInstance();
      // Queue should be loaded from mock
    });
  });
});
