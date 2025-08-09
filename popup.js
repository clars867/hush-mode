const qs = (s) => document.querySelector(s);
const enabledEl = qs('#enabled');
const statusEl = qs('#status');
const voiceBoostDb = qs('#voiceBoostDb');
const musicCutDb = qs('#musicCutDb');
const bassCutHz = qs('#bassCutHz');
const sparkleCutHz = qs('#sparkleCutHz');
const resetBtn = qs('#reset');

const labels = {
  voiceBoostVal: qs('#voiceBoostVal'),
  musicCutVal: qs('#musicCutVal'),
  bassCutVal: qs('#bassCutVal'),
  sparkleVal: qs('#sparkleVal')
};

function updateLabels() {
  labels.voiceBoostVal.textContent = `+${voiceBoostDb.value} dB`;
  labels.musicCutVal.textContent = `−${musicCutDb.value} dB`;
  labels.bassCutVal.textContent = `${bassCutHz.value} Hz`;
  labels.sparkleVal.textContent = `${sparkleCutHz.value} Hz`;
}

async function getActiveTabId() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_ID' }, (res) => resolve(res?.tabId));
  });
}

async function sendToTab(msg) {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, msg, () => void 0);
}

enabledEl.addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  await sendToTab({ type: 'HUSH_TOGGLE', enabled });
  statusEl.textContent = enabled ? 'Running' : 'Idle';
});

[voiceBoostDb, musicCutDb, bassCutHz, sparkleCutHz].forEach((el) => {
  el.addEventListener('input', () => {
    updateLabels();
    const payload = {
      voiceBoostDb: Number(voiceBoostDb.value),
      musicCutDb: -Math.abs(Number(musicCutDb.value)),
      bassCutHz: Number(bassCutHz.value),
      sparkleCutHz: Number(sparkleCutHz.value)
    };
    sendToTab({ type: 'HUSH_UPDATE_SETTINGS', payload });
  });
});

resetBtn.addEventListener('click', () => {
  voiceBoostDb.value = 6;
  musicCutDb.value = 12;
  bassCutHz.value = 120;
  sparkleCutHz.value = 8000;
  updateLabels();
  const payload = {
    voiceBoostDb: 6,
    musicCutDb: -12,
    bassCutHz: 120,
    sparkleCutHz: 8000
  };
  sendToTab({ type: 'HUSH_UPDATE_SETTINGS', payload });
});

updateLabels();
