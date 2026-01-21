function getInfoTiddlerFields() {
  const infoTiddlerFields: Array<{ text: string; title: string }> = [];

  if ($tw.browser === null || typeof window === 'undefined') return infoTiddlerFields;

  // Check if Git API is available
  const isGitAPIAvailable = typeof window?.service?.git?.callGitOp === 'function';

  infoTiddlerFields.push({
    title: '$:/info/tidgi/git-api-available',
    text: isGitAPIAvailable ? 'yes' : 'no',
  });

  return infoTiddlerFields;
}

const moduleExports = exports as Record<string, unknown>;
moduleExports.getInfoTiddlerFields = getInfoTiddlerFields;
