/**
 * FR5: Android Widget Task Handler tests
 * Tests for src/widgets/android/widgetTaskHandler.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock react-native-android-widget — Android-only native module
jest.mock('react-native-android-widget', () => ({
  registerWidgetTaskHandler: jest.fn(),
  updateWidget: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeWidgetData() {
  return {
    hours: '32.5',
    hoursDisplay: '32.5h',
    earnings: '$1,300',
    earningsRaw: 1300,
    today: '6.2h',
    hoursRemaining: '7.5h left',
    aiPct: '71%\u201375%',
    brainlift: '3.2h',
    deadline: Date.now() + 6 * 60 * 60 * 1000,
    urgency: 'none',
    pendingCount: 0,
    isManager: false,
    cachedAt: Date.now(),
    useQA: false,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('widgetTaskHandler (FR5)', () => {
  let widgetTaskHandler: (props: { widgetInfo: { widgetName: string; widgetId: number } }) => Promise<void>;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    ({ default: widgetTaskHandler } = await import('../../../widgets/android/widgetTaskHandler'));
  });

  it('reads widget_data from AsyncStorage for HourglassWidget', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(makeWidgetData()));

    await widgetTaskHandler({ widgetInfo: { widgetName: 'HourglassWidget', widgetId: 1 } });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('widget_data');
  });

  it('does not call AsyncStorage for unknown widget names', async () => {
    await widgetTaskHandler({ widgetInfo: { widgetName: 'UnknownWidget', widgetId: 1 } });

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('handles null data gracefully (shows fallback state)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    // Should not throw
    await expect(
      widgetTaskHandler({ widgetInfo: { widgetName: 'HourglassWidget', widgetId: 1 } })
    ).resolves.toBeUndefined();
  });

  it('handles malformed JSON gracefully (shows fallback state)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{ bad json }}}');

    await expect(
      widgetTaskHandler({ widgetInfo: { widgetName: 'HourglassWidget', widgetId: 1 } })
    ).resolves.toBeUndefined();
  });

  it('handles valid data without throwing', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(makeWidgetData()));

    await expect(
      widgetTaskHandler({ widgetInfo: { widgetName: 'HourglassWidget', widgetId: 1 } })
    ).resolves.toBeUndefined();
  });

  it('handles AsyncStorage error gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    await expect(
      widgetTaskHandler({ widgetInfo: { widgetName: 'HourglassWidget', widgetId: 1 } })
    ).resolves.toBeUndefined();
  });
});
