/**
 * DeviceService
 * TOON-based device registry and management service
 */

import { toonClient } from './api/ToonClient';
import { API_ENDPOINTS } from './api/config';

export interface Device {
  id: string;
  name: string;
  type: 'face' | 'fingerprint';
  status: 'online' | 'offline';
  location: string;
  ipAddress?: string;
  lastSeen: string;
  registeredAt: string;
}

export interface RegisterDeviceRequest {
  name: string;
  type: 'face' | 'fingerprint';
  location: string;
  ipAddress?: string;
}

export interface UpdateDeviceRequest {
  name?: string;
  location?: string;
  status?: 'online' | 'offline';
}

export class DeviceService {
  /**
   * Get all registered devices
   */
  static async getAllDevices(): Promise<Device[]> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.LIST,
        { operation: 'list' },
        { timeout: 5000 }
      );

      return response.devices || [];
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      throw error;
    }
  }

  /**
   * Get a specific device by ID
   */
  static async getDevice(deviceId: string): Promise<Device> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.DETAIL,
        { deviceId },
        { timeout: 5000 }
      );

      return response.device;
    } catch (error) {
      console.error('Failed to fetch device:', error);
      throw error;
    }
  }

  /**
   * Register a new device
   */
  static async registerDevice(deviceData: RegisterDeviceRequest): Promise<Device> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.REGISTER,
        deviceData,
        { timeout: 5000 }
      );

      return response.device;
    } catch (error) {
      console.error('Failed to register device:', error);
      throw error;
    }
  }

  /**
   * Update device information
   */
  static async updateDevice(deviceId: string, updates: UpdateDeviceRequest): Promise<Device> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.UPDATE,
        { deviceId, ...updates },
        { timeout: 5000 }
      );

      return response.device;
    } catch (error) {
      console.error('Failed to update device:', error);
      throw error;
    }
  }

  /**
   * Delete a device
   */
  static async deleteDevice(deviceId: string): Promise<void> {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.DELETE,
        { deviceId },
        { timeout: 5000 }
      );
    } catch (error) {
      console.error('Failed to delete device:', error);
      throw error;
    }
  }

  /**
   * Ping a device to check status
   */
  static async pingDevice(deviceId: string): Promise<{ online: boolean; latency: number }> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.PING,
        { deviceId },
        { timeout: 3000 }
      );

      return {
        online: response.online || false,
        latency: response.latency || 0,
      };
    } catch (error) {
      console.error('Failed to ping device:', error);
      return { online: false, latency: -1 };
    }
  }

  /**
   * Get device logs
   */
  static async getDeviceLogs(deviceId: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.LOGS,
        { deviceId, limit },
        { timeout: 5000 }
      );

      return response.logs || [];
    } catch (error) {
      console.error('Failed to fetch device logs:', error);
      throw error;
    }
  }
}

export const deviceService = new DeviceService();
