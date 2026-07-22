import { setRoutingFeatureAvailable } from './routing-state';

exports.name = 'tidgi-routing-chain-startup';
exports.platforms = ['browser'];
exports.after = ['startup'];
exports.synchronous = true;

/**
 * Probe once whether TidGi exposes routing info for this wiki.
 * Per-tiddler chains are fetched on toolbar hover by `$tidgi-routing-refresh`.
 */
async function probeFeatureAvailability() {
  const getTiddlerRoutingInfo = window?.service?.wiki?.getTiddlerRoutingInfo;
  if (typeof getTiddlerRoutingInfo !== 'function') {
    setRoutingFeatureAvailable(false);
    return;
  }

  try {
    const info = await getTiddlerRoutingInfo('$:/SiteTitle');
    setRoutingFeatureAvailable(info.featureAvailable);
  } catch (error) {
    console.error('tidgi-routing-chain: getTiddlerRoutingInfo failed', error);
    setRoutingFeatureAvailable(false);
  }
}

exports.startup = function startup() {
  if (!$tw.browser) {
    return;
  }

  void probeFeatureAvailability();
};
