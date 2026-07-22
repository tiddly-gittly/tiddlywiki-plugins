function getInfoTiddlerFields() {
  const infoTiddlerFields: Array<{ text: string; title: string }> = [];

  if ($tw.browser === null || typeof window === 'undefined') {
    return infoTiddlerFields;
  }

  // Conservative default; startup upgrades this to "yes" only when TidGi reports
  // featureAvailable (at least one sub-wiki with routing settings enabled).
  const hasDesktopApi = typeof window?.service?.wiki?.getTiddlerRoutingInfo === 'function' ||
    Boolean($tw.wiki.getTiddlerText('$:/info/tidgi/workspaceID', ''));

  infoTiddlerFields.push({
    title: '$:/info/tidgi/routing-chain-available',
    text: hasDesktopApi ? 'pending' : 'no',
  });

  return infoTiddlerFields;
}

const moduleExports = exports as Record<string, unknown>;
moduleExports.getInfoTiddlerFields = getInfoTiddlerFields;
