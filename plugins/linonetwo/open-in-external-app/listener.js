// Listen for the tm-home message
exports.startup = function () {
  if ($tw.browser) {
    $tw.rootWidget.addEventListener('tm-open-in-external-app', async function (event) {
      let title = '';
      if (typeof event.param === 'string') {
        // for button usage
        title = event.param;
      } else if (typeof event.paramObject === 'object') {
        // Get the specified additional fields, for message usage
        additionalFields = event.paramObject;
        if (additionalFields && additionalFields.title) {
          title = additionalFields.title;
        }
      }
      await window.service.wiki.openTiddlerInExternal(title);
    });
  }
};
