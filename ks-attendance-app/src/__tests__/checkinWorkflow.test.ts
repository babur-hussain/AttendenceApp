/**
 * Mobile Check-in Workflow Test
 * 
 * Run this in the mobile app to test the complete flow:
 * 1. HomeScreen navigation
 * 2. CheckinScreen capture and process
 * 3. CheckinResultScreen display
 * 4. OfflineQueueScreen management
 */

import CheckinFlowCoordinator from '../services/CheckinFlowCoordinator';
import type { AttendanceEventType } from '../types/checkin';

/**
 * Test the complete check-in flow
 */
export async function testCheckinFlow(eventType: AttendanceEventType = 'IN') {
  console.log('=== Mobile Check-in Flow Test ===');
  console.log(`Testing event type: ${eventType}`);
  
  const coordinator = CheckinFlowCoordinator;
  
  // Subscribe to events
  const events: any[] = [];
  const unsubscribe = coordinator.subscribe((event) => {
    console.log('Event received:', event.type, event);
    events.push(event);
  });
  
  try {
    // Start check-in
    console.log('\n1. Starting check-in...');
    const result = await coordinator.startCheckin(eventType, 'EMP_001');
    
    console.log('\n2. Check-in result:', result);
    
    // Get queue stats
    const stats = await coordinator.getQueueStats();
    console.log('\n3. Queue stats:', stats);
    
    // Get all events
    const allEvents = await coordinator.getAllEvents();
    console.log('\n4. All events:', allEvents.length);
    
    // Verify events were emitted
    console.log('\n5. Events emitted:', events.length);
    events.forEach((e, i) => {
      console.log(`   Event ${i + 1}:`, e.type);
    });
    
    return {
      success: true,
      result,
      stats,
      eventsEmitted: events.length,
      allEvents: allEvents.length,
    };
    
  } catch (error) {
    console.error('Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    unsubscribe();
  }
}

/**
 * Test offline queue management
 */
export async function testOfflineQueue() {
  console.log('=== Offline Queue Test ===');
  
  const coordinator = CheckinFlowCoordinator;
  
  try {
    // Get initial stats
    const initialStats = await coordinator.getQueueStats();
    console.log('Initial stats:', initialStats);
    
    // Get all events
    const events = await coordinator.getAllEvents();
    console.log('Total events:', events.length);
    
    if (events.length > 0) {
      const firstEvent = events[0];
      console.log('\nFirst event:', firstEvent.eventId, firstEvent.status);
      
      // Try to resend if queued or failed
      if (firstEvent.status === 'queued' || firstEvent.status === 'failed') {
        console.log('Attempting resend...');
        const resendResult = await coordinator.resendEvent(firstEvent.eventId);
        console.log('Resend result:', resendResult);
      }
      
      // Get updated stats
      const updatedStats = await coordinator.getQueueStats();
      console.log('Updated stats:', updatedStats);
    }
    
    return {
      success: true,
      stats: initialStats,
      eventCount: events.length,
    };
    
  } catch (error) {
    console.error('Queue test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test policy configuration
 */
export async function testPolicyConfig() {
  console.log('=== Policy Configuration Test ===');
  
  const coordinator = CheckinFlowCoordinator;
  
  // Get current policy
  const currentPolicy = coordinator.getPolicy();
  console.log('Current policy:', currentPolicy);
  
  // Update policy
  coordinator.setPolicy({
    faceMatchThreshold: 0.90,
    livenessMin: 0.80,
  });
  
  const updatedPolicy = coordinator.getPolicy();
  console.log('Updated policy:', updatedPolicy);
  
  return {
    success: true,
    currentPolicy,
    updatedPolicy,
  };
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('=== Running All Mobile Workflow Tests ===\n');
  
  const results = {
    policyTest: await testPolicyConfig(),
    checkinTest: await testCheckinFlow('IN'),
    checkoutTest: await testCheckinFlow('OUT'),
    breakStartTest: await testCheckinFlow('BREAK_START'),
    queueTest: await testOfflineQueue(),
  };
  
  console.log('\n=== Test Results Summary ===');
  Object.entries(results).forEach(([testName, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${testName}:`, result.success);
  });
  
  return results;
}
