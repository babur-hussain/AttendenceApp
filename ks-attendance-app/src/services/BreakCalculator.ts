/**
 * BreakCalculator - Break Accounting & Over-Break Detection
 */

import { QueuedEvent } from './AttendanceService';

export interface BreakSession {
  breakType: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  allowedMinutes: number;
  graceMinutes: number;
  isOverBreak: boolean;
  overByMinutes: number;
}

export interface DailyBreakSummary {
  totalBreakMinutes: number;
  allowedBreakMinutes: number;
  overBreakMinutes: number;
  breakSessions: BreakSession[];
}

export class BreakCalculator {
  private static readonly DEFAULT_BREAK_POLICIES = {
    LUNCH: { allowed: 60, grace: 10 },
    PERSONAL: { allowed: 15, grace: 5 },
    SMOKE: { allowed: 10, grace: 3 },
    OTHER: { allowed: 15, grace: 5 },
  };

  /**
   * Calculate break summary from events
   */
  public static calculateDailyBreaks(events: QueuedEvent[]): DailyBreakSummary {
    const sortedEvents = events
      .filter(e => ['BREAK_START', 'BREAK_END'].includes(e.eventType))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const sessions: BreakSession[] = [];
    const openBreaks = new Map<string, QueuedEvent>();

    for (const event of sortedEvents) {
      const breakType = this.extractBreakType(event);
      if (!breakType) continue;

      if (event.eventType === 'BREAK_START') {
        openBreaks.set(breakType, event);
      } else if (event.eventType === 'BREAK_END') {
        const start = openBreaks.get(breakType);
        if (start) {
          const session = this.buildSession(start, event, breakType);
          sessions.push(session);
          openBreaks.delete(breakType);
        }
      }
    }

    // Handle unclosed breaks
    openBreaks.forEach((start, breakType) => {
      const session = this.buildSession(start, undefined, breakType);
      sessions.push(session);
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const allowedMinutes = sessions.reduce((sum, s) => sum + s.allowedMinutes, 0);
    const overMinutes = sessions.reduce((sum, s) => sum + s.overByMinutes, 0);

    return {
      totalBreakMinutes: totalMinutes,
      allowedBreakMinutes: allowedMinutes,
      overBreakMinutes: overMinutes,
      breakSessions: sessions,
    };
  }

  private static buildSession(start: QueuedEvent, end: QueuedEvent | undefined, breakType: string): BreakSession {
    const policy = this.DEFAULT_BREAK_POLICIES[breakType as keyof typeof this.DEFAULT_BREAK_POLICIES] || { allowed: 15, grace: 5 };
    const startTime = new Date(start.createdAt);
    const endTime = end ? new Date(end.createdAt) : undefined;
    const durationMinutes = endTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 60000) : undefined;
    const overByMinutes = durationMinutes ? Math.max(0, durationMinutes - policy.allowed - policy.grace) : 0;

    return {
      breakType,
      startTime,
      endTime,
      durationMinutes,
      allowedMinutes: policy.allowed,
      graceMinutes: policy.grace,
      isOverBreak: overByMinutes > 0,
      overByMinutes,
    };
  }

  private static extractBreakType(event: QueuedEvent): string | undefined {
    // TODO: Parse from TOON B1 token
    return 'LUNCH'; // Mock
  }
}
