(async () => {
  if (!('xr' in navigator)) {
    console.warn('[XR] navigator.xr not available. On iOS: need iOS 16.4+ Safari (not PWA).');
    return;
  }
  try {
    const ar = await navigator.xr.isSessionSupported('immersive-ar');
    const vr = await navigator.xr.isSessionSupported('immersive-vr');
    console.log('[XR] immersive-ar supported:', ar, ' / immersive-vr:', vr);
    if (!ar) {
      console.warn('[XR] No immersive-ar. Common causes:',
        '\n- iOS < 16.4, or using a third-party browser without WebXR',
        '\n- Running as Home-screen app (PWA) on iOS â€” WebXR is disabled there',
        '\n- Inside an iframe without allow="xr-spatial-tracking"',
        '\n- Device/flags disabled AR');
    }
  } catch (e) {
    console.error('[XR] isSessionSupported failed:', e);
  }
})();
