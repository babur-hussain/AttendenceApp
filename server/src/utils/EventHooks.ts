/**
 * Event Hooks System for Server-Side Events
 * Allows internal services to subscribe to attendance events
 */

export type EventHookType = 
  | 'onEventIngested'
  | 'onDeviceRegistered'
  | 'onDeviceHeartbeat'
  | 'onDeviceCommand'
  | 'onDeviceRevoked'
  | 'onFirmwareFailure'
  | 'onCommandAcknowledged'
  | 'onReportGenerated'
  | 'onDuplicateEvent'
  | 'onInvalidEvent';

export type EventHookCallback = (data: any) => void | Promise<void>;

export class EventHooksManager {
  private static instance: EventHooksManager;
  private hooks: Map<EventHookType, Set<EventHookCallback>> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EventHooksManager {
    if (!EventHooksManager.instance) {
      EventHooksManager.instance = new EventHooksManager();
    }
    return EventHooksManager.instance;
  }

  /**
   * Register event hook
   */
  register(eventType: EventHookType, callback: EventHookCallback): void {
    if (!this.hooks.has(eventType)) {
      this.hooks.set(eventType, new Set());
    }
    this.hooks.get(eventType)!.add(callback);
  }

  /**
   * Unregister event hook
   */
  unregister(eventType: EventHookType, callback: EventHookCallback): void {
    const callbacks = this.hooks.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event to all registered hooks
   */
  async emit(eventType: EventHookType, data: any): Promise<void> {
    const callbacks = this.hooks.get(eventType);
    if (!callbacks || callbacks.size === 0) return;

    const promises: Promise<void>[] = [];
    for (const callback of callbacks) {
      const result = callback(data);
      if (result instanceof Promise) {
        promises.push(result);
      }
    }

    await Promise.all(promises);
  }

  /**
   * Clear all hooks for event type
   */
  clear(eventType: EventHookType): void {
    this.hooks.delete(eventType);
  }

  /**
   * Clear all hooks
   */
  clearAll(): void {
    this.hooks.clear();
  }
}
