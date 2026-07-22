import type { ITiddlerRoutingInfo } from '../type';

export const ROUTING_INFO_PREFIX = '$:/temp/linonetwo/tidgi-routing-chain/info/';
export const AVAILABLE_INFO_TITLE = '$:/info/tidgi/routing-chain-available';

export function routingInfoTitleFor(tiddlerTitle: string): string {
  return `${ROUTING_INFO_PREFIX}${tiddlerTitle}`;
}

function getLingoText(key: string, fallback: string): string {
  const language = $tw.wiki.getTiddlerText('$:/language', '$:/languages/en-GB');
  const langCode = language.includes('zh') ? 'zh-Hans' : 'en-GB';
  return $tw.wiki.getTiddlerText(
    `$:/plugins/linonetwo/tidgi-routing-chain/language/${langCode}/${key}`,
    fallback,
  );
}

function buildTooltip(info: NonNullable<ITiddlerRoutingInfo['match']>): string {
  const template = info.kind === 'filter'
    ? getLingoText('Tooltip/Filter', 'Routed to "{{workspace}}" by filter: {{chain}}')
    : info.isSubWiki
    ? getLingoText('Tooltip/Private', 'Routed to sub-workspace "{{workspace}}" via: {{chain}}')
    : getLingoText('Tooltip/Public', 'Routed to main workspace "{{workspace}}" via: {{chain}}');
  return template.replaceAll('{{workspace}}', info.workspaceName).replaceAll('{{chain}}', info.chain);
}

/** Drop cached routing display so wikitext falls back until the next hover fetch. */
export function clearRoutingInfoTiddler(tiddlerTitle: string): void {
  const title = routingInfoTitleFor(tiddlerTitle);
  if ($tw.wiki.tiddlerExists(title)) {
    $tw.wiki.deleteTiddler(title);
  }
}

/**
 * Persist TidGi routing payload into a temp tiddler for wikitext UI to read.
 */
export function writeRoutingInfoTiddler(tiddlerTitle: string, info: ITiddlerRoutingInfo): void {
  const title = routingInfoTitleFor(tiddlerTitle);
  if (!info.featureAvailable || !info.match) {
    clearRoutingInfoTiddler(tiddlerTitle);
    return;
  }

  $tw.wiki.addTiddler({
    title,
    text: info.match.chain,
    workspaceId: info.match.workspaceId,
    workspaceName: info.match.workspaceName,
    isSubWiki: info.match.isSubWiki ? 'yes' : 'no',
    kind: info.match.kind,
    chain: info.match.chain,
    rootTag: info.match.rootTag ?? '',
    tooltip: buildTooltip(info.match),
  });
}

export function setRoutingFeatureAvailable(available: boolean): void {
  $tw.wiki.addTiddler({
    title: AVAILABLE_INFO_TITLE,
    text: available ? 'yes' : 'no',
  });
}
