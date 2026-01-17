function getInfoTiddlerFields() {
  const infoTiddlerFields: Array<{ text: string; title: string }> = [];
  
  if (!$tw.browser || typeof window === 'undefined') return infoTiddlerFields;
  
  // Check if Git API is available
  const isGitAPIAvailable = !!(window?.service?.git?.callGitOp);
  
  infoTiddlerFields.push({
    title: '$:/info/tidgi/git-api-available',
    text: isGitAPIAvailable ? 'yes' : 'no'
  });
  
  return infoTiddlerFields;
}

exports.getInfoTiddlerFields = getInfoTiddlerFields;
