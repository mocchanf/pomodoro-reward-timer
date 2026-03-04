// ポモドーロ ご褒美タイマー - Service Worker

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'pomodoro') return;

  const data = await chrome.storage.local.get(['isRunning', 'phase', 'completedSessions', 'workMinutes', 'breakMinutes']);
  if (!data.isRunning) return;

  const workMinutes = data.workMinutes || 25;
  const breakMinutes = data.breakMinutes || 5;

  if (data.phase === 'work') {
    const sessions = (data.completedSessions || 0) + 1;
    const endTime = Date.now() + breakMinutes * 60 * 1000;

    await chrome.storage.local.set({
      phase: 'break',
      endTime,
      needsDiceRoll: true,
      diceResult: null,
      completedSessions: sessions
    });

    chrome.alarms.create('pomodoro', { delayInMinutes: breakMinutes });

    chrome.notifications.create('workEnd', {
      type: 'basic',
      iconUrl: 'icon48.png',
      title: '🎉 お疲れ様！休憩時間です',
      message: 'ポップアップを開いてサイコロを振ってご褒美をゲットしよう！',
      requireInteraction: false
    });

  } else {
    const endTime = Date.now() + workMinutes * 60 * 1000;

    await chrome.storage.local.set({
      phase: 'work',
      endTime,
      needsDiceRoll: false,
      diceResult: null
    });

    chrome.alarms.create('pomodoro', { delayInMinutes: workMinutes });

    chrome.notifications.create('breakEnd', {
      type: 'basic',
      iconUrl: 'icon48.png',
      title: '⏰ 休憩終了！集中タイム開始！',
      message: `${workMinutes}分間の作業を頑張りましょう！`,
      requireInteraction: false
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message) {
  const stored = await chrome.storage.local.get(['workMinutes', 'breakMinutes', 'completedSessions']);
  const workMinutes = stored.workMinutes || 25;
  const breakMinutes = stored.breakMinutes || 5;

  if (message.action === 'start') {
    const phase = message.phase || 'work';
    const minutes = phase === 'work' ? workMinutes : breakMinutes;
    const endTime = Date.now() + minutes * 60 * 1000;

    await chrome.storage.local.set({
      phase,
      endTime,
      isRunning: true,
      needsDiceRoll: phase === 'break',
      diceResult: null
    });

    await chrome.alarms.clear('pomodoro');
    chrome.alarms.create('pomodoro', { delayInMinutes: minutes });
    return { success: true };

  } else if (message.action === 'pause') {
    await chrome.alarms.clear('pomodoro');
    const remaining = message.remaining;
    await chrome.storage.local.set({ isRunning: false, pausedRemaining: remaining });
    return { success: true };

  } else if (message.action === 'resume') {
    const data = await chrome.storage.local.get(['pausedRemaining', 'phase']);
    const remaining = data.pausedRemaining || 0;
    const endTime = Date.now() + remaining;
    const minutesRemaining = remaining / 60000;

    await chrome.storage.local.set({ isRunning: true, endTime, pausedRemaining: null });
    chrome.alarms.create('pomodoro', { delayInMinutes: minutesRemaining });
    return { success: true };

  } else if (message.action === 'reset') {
    await chrome.alarms.clear('pomodoro');
    await chrome.storage.local.set({
      isRunning: false,
      phase: 'work',
      endTime: null,
      pausedRemaining: null,
      needsDiceRoll: false,
      diceResult: null
    });
    return { success: true };

  } else if (message.action === 'resetSessions') {
    await chrome.storage.local.set({ completedSessions: 0 });
    return { success: true };
  }

  return { success: false };
}
