// Logs exact CSP blocks so you can whitelist the right domains.
window.addEventListener('securitypolicyviolation', (e) => {
  console.warn(
    '[CSP] blocked:',
    e.effectiveDirective,
    '\nblockedURI:', e.blockedURI || '(empty)',
    '\ndocumentURI:', e.documentURI,
    '\nviolated:', e.violatedDirective
  );
});
