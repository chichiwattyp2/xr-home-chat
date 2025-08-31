// Logs whether AR/VR are exposed by this browser context.
(async () => {
  try {
    if (!('xr' in navigator)) {
      console.warn('[XR] navigator.xr not available. On iOS: need iOS 16.4+ Safari (not PWA).');
      return;
    }
    const ar = await navigator.xr.isSessionSupported('immersive-ar');
    const vr = await navigator.xr.isSessionSupported('immersive-vr');
    console.log('[XR] immersive-ar supported:', ar, ' / immersive-vr:', vr);
    if (!ar) {
      console.warn('[XR] No immersive-ar. Common causes:\n- iOS < 16.4, or third-party browser\n- PWA (Add to Home Screen) on iOS\n- In an <iframe> without allow=\"xr-spatial-tracking\"\n- Device/flags disabled AR');
    }
  } catch (e) {
    console.error('[XR] isSessionSupported failed:', e);
  }
})();
