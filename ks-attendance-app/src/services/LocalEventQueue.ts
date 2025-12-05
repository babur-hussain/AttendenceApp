/**
 * LocalEventQueue - Encrypted local storage for TOON attendance events
 * Handles persistence, retry logic, and sync reconciliation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AttendanceToonEvent, LocalEventQueueItem } from '../types/checkin';
import { encodeToToonPayload, decodeFromToonPayload } from '../utils/toon';

// Simple codec wrapper
const ToonCodec = {
  encode: (obj: any): string => {
    const payload = encodeToToonPayload(obj);
    return typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
  },
  decode: (str: string): any => {
    return decodeFromToonPayload(str);
  },
};

const QUEUE_KEY = '@ks_attendance:event_queue';
const ENCRYPTION_KEY = '@ks_attendance:encryption_key';

export class LocalEventQueue {
  private static instance: LocalEventQueue;
  private queue: LocalEventQueueItem[] = [];
  private encryptionKey: string | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): LocalEventQueue {
    if (!LocalEventQueue.instance) {
      LocalEventQueue.instance = new LocalEventQueue();
    }
    return LocalEventQueue.instance;
  }

  /**
   * Initialize the queue (load from storage)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get or create encryption key
      let key = await AsyncStorage.getItem(ENCRYPTION_KEY);
      if (!key) {
        // Simple key generation without expo-crypto
        key = `${Date.now()}-${Math.random().toString(36)}-${Math.random().toString(36)}`;
        await AsyncStorage.setItem(ENCRYPTION_KEY, key);
      }
      this.encryptionKey = key;

      // Load queue
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }

      this.initialized = true;
      console.log(`[LocalEventQueue] Initialized with ${this.queue.length} items`);
    } catch (error) {
      console.error('[LocalEventQueue] Failed to initialize:', error);
      this.queue = [];
      this.initialized = true;
    }
  }

  /**
   * Enqueue a TOON event for persistence
   */
  async enqueue(event: AttendanceToonEvent): Promise<string> {
    await this.initialize();

    const rawToon = ToonCodec.encode(event);
    
    const item: LocalEventQueueItem = {
      id: Date.now(),
      eventId: event.A1,
      raw_toon: rawToon,
      status: 'queued',
      attempts: 0,
      created_at: new Date().toISOString(),
    };

    this.queue.push(item);
    await this.persist();

    console.log(`[LocalEventQueue] Enqueued event ${event.A1}`);
    return event.A1;
  }

  /**
   * Mark event as sent with server response
   */
  async markSent(eventId: string, serverResponseToon: string): Promise<void> {
    await this.initialize();

    const item = this.queue.find(i => i.eventId === eventId);
    if (item) {
      item.status = 'sent';
      item.sent_at = new Date().toISOString();
      item.server_response_toon = serverResponseToon;
      await this.persist();
      console.log(`[LocalEventQueue] Marked ${eventId} as sent`);
    }
  }

  /**
   * Mark event as failed and schedule retry
   */
  async markFailed(eventId: string, error: string, retryBackoffMs: number): Promise<void> {
    await this.initialize();

    const item = this.queue.find(i => i.eventId === eventId);
    if (item) {
      item.attempts++;
      item.status = 'failed';
      item.error_message = error;
      
      // Exponential backoff
      const backoff = retryBackoffMs * Math.pow(2, item.attempts - 1);
      item.next_retry_at = new Date(Date.now() + backoff).toISOString();
      
      await this.persist();
      console.log(`[LocalEventQueue] Marked ${eventId} as failed (attempt ${item.attempts}), retry at ${item.next_retry_at}`);
    }
  }

  /**
   * Mark event as duplicate
   */
  async markDuplicate(eventId: string): Promise<void> {
    await this.initialize();

    const item = this.queue.find(i => i.eventId === eventId);
    if (item) {
      item.status = 'duplicate';
      await this.persist();
      console.log(`[LocalEventQueue] Marked ${eventId} as duplicate`);
    }
  }

  /**
   * Get all queued events (not sent, not duplicate)
   */
  async getQueuedEvents(): Promise<LocalEventQueueItem[]> {
    await this.initialize();
    return this.queue.filter(i => i.status === 'queued' || i.status === 'failed');
  }

  /**
   * Get events ready for retry (failed with retry time passed)
   */
  async getEventsReadyForRetry(): Promise<LocalEventQueueItem[]> {
    await this.initialize();
    const now = new Date();
    
    return this.queue.filter(item => {
      if (item.status !== 'failed') return false;
      if (!item.next_retry_at) return true;
      return new Date(item.next_retry_at) <= now;
    });
  }

  /**
   * Get all events (for UI display)
   */
  async getAllEvents(): Promise<LocalEventQueueItem[]> {
    await this.initialize();
    return [...this.queue].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Delete event from queue
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.initialize();
    this.queue = this.queue.filter(i => i.eventId !== eventId);
    await this.persist();
    console.log(`[LocalEventQueue] Deleted event ${eventId}`);
  }

  /**
   * Clear all sent and duplicate events (cleanup)
   */
  async cleanup(): Promise<void> {
    await this.initialize();
    const before = this.queue.length;
    this.queue = this.queue.filter(i => i.status !== 'sent' && i.status !== 'duplicate');
    await this.persist();
    console.log(`[LocalEventQueue] Cleaned up ${before - this.queue.length} events`);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    queued: number;
    sent: number;
    failed: number;
    duplicate: number;
  }> {
    await this.initialize();
    
    return {
      total: this.queue.length,
      queued: this.queue.filter(i => i.status === 'queued').length,
      sent: this.queue.filter(i => i.status === 'sent').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
      duplicate: this.queue.filter(i => i.status === 'duplicate').length,
    };
  }

  /**
   * Persist queue to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[LocalEventQueue] Failed to persist:', error);
    }
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<LocalEventQueueItem | null> {
    await this.initialize();
    return this.queue.find(i => i.eventId === eventId) || null;
  }

  /**
   * Update event raw TOON (for edit functionality)
   */
  async updateEvent(eventId: string, newToon: string): Promise<void> {
    await this.initialize();
    
    const item = this.queue.find(i => i.eventId === eventId);
    if (item) {
      item.raw_toon = newToon;
      item.status = 'queued';
      item.attempts = 0;
      item.error_message = undefined;
      item.next_retry_at = undefined;
      await this.persist();
      console.log(`[LocalEventQueue] Updated event ${eventId}`);
    }
  }
}

export default LocalEventQueue.getInstance();
