/**
 * FR5: App Background Push Handler tests
 * Tests for src/notifications/handler.ts: handleBackgroundPush, scheduleLocalNotification
 */

// Mock expo-notifications
const mockScheduleNotification = jest.fn();
const mockAddNotificationReceivedListener = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: mockScheduleNotification,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
}));

// Mock boundary dependencies (from other specs)
const mockFetchFreshData = jest.fn();
const mockUpdateWidgetData = jest.fn();

jest.mock('../../lib/crossoverData', () => ({
  fetchFreshData: mockFetchFreshData,
}));

jest.mock('../../lib/widgetBridge', () => ({
  updateWidgetData: mockUpdateWidgetData,
}));

// Mock AsyncStorage for previous approval count
import AsyncStorage from '@react-native-async-storage/async-storage';
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import {
  handleBackgroundPush,
  scheduleLocalNotification,
} from '../../notifications/handler';

// Realistic CrossoverSnapshot shape matching spec boundary contract
const makeFreshData = (pendingApprovalCount = 0, isManager = false) => ({
  pendingApprovals: Array.from({ length: pendingApprovalCount }, (_, i) => ({
    id: `approval-${i}`,
    type: 'manual',
  })),
  isManager,
  hoursThisWeek: 32.5,
  earnings: 1234.56,
});

const makePush = (dataType: string) => ({
  request: {
    content: {
      data: { type: dataType },
      title: null,
      body: null,
    },
    identifier: 'test-notif-id',
    trigger: {},
  },
  date: Date.now(),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateWidgetData.mockResolvedValue(undefined);
  mockScheduleNotification.mockResolvedValue('scheduled-id');
});

describe('FR5: handleBackgroundPush', () => {
  it('ignores notifications where data.type is not bg_refresh', async () => {
    await handleBackgroundPush(makePush('other_type') as any);

    expect(mockFetchFreshData).not.toHaveBeenCalled();
    expect(mockUpdateWidgetData).not.toHaveBeenCalled();
  });

  it('ignores notifications with no data type', async () => {
    const notif = { request: { content: { data: {} }, identifier: 'x', trigger: {} }, date: 0 };
    await handleBackgroundPush(notif as any);

    expect(mockFetchFreshData).not.toHaveBeenCalled();
  });

  it('calls fetchFreshData on bg_refresh notification', async () => {
    mockFetchFreshData.mockResolvedValueOnce(makeFreshData());

    await handleBackgroundPush(makePush('bg_refresh') as any);

    expect(mockFetchFreshData).toHaveBeenCalledTimes(1);
  });

  it('calls updateWidgetData with the fetched fresh data', async () => {
    const freshData = makeFreshData(0, false);
    mockFetchFreshData.mockResolvedValueOnce(freshData);

    await handleBackgroundPush(makePush('bg_refresh') as any);

    expect(mockUpdateWidgetData).toHaveBeenCalledWith(freshData);
  });

  it('schedules local notification when manager has new approvals', async () => {
    // Previous count: 1, new count: 3
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('1');
    const freshData = makeFreshData(3, true);
    mockFetchFreshData.mockResolvedValueOnce(freshData);

    await handleBackgroundPush(makePush('bg_refresh') as any);

    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.title).toBe('New Approvals');
    expect(call.content.body).toContain('3');
    expect(call.content.body).toContain('pending approval');
  });

  it('does not schedule notification when approval count is unchanged', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('2');
    const freshData = makeFreshData(2, true);
    mockFetchFreshData.mockResolvedValueOnce(freshData);

    await handleBackgroundPush(makePush('bg_refresh') as any);

    expect(mockScheduleNotification).not.toHaveBeenCalled();
  });

  it('does not schedule notification for non-manager users', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('0');
    const freshData = makeFreshData(5, false); // 5 "approvals" but user is not a manager
    mockFetchFreshData.mockResolvedValueOnce(freshData);

    await handleBackgroundPush(makePush('bg_refresh') as any);

    expect(mockScheduleNotification).not.toHaveBeenCalled();
  });

  it('catches and logs errors without throwing', async () => {
    mockFetchFreshData.mockRejectedValueOnce(new Error('Network timeout'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      handleBackgroundPush(makePush('bg_refresh') as any)
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('FR5: scheduleLocalNotification', () => {
  it('schedules notification with title "New Approvals"', async () => {
    await scheduleLocalNotification(3);

    expect(mockScheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'New Approvals',
        }),
        trigger: null,
      })
    );
  });

  it('schedules notification with body containing count', async () => {
    await scheduleLocalNotification(5);

    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.content.body).toContain('5');
    expect(call.content.body).toContain('pending approval');
  });

  it('schedules notification immediately (trigger: null)', async () => {
    await scheduleLocalNotification(1);

    const call = mockScheduleNotification.mock.calls[0][0];
    expect(call.trigger).toBeNull();
  });
});
