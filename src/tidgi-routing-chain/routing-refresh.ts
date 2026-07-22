import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import type { IChangedTiddlers, IParseTreeNode, IWidgetInitialiseOptions } from 'tiddlywiki';
import { clearRoutingInfoTiddler, writeRoutingInfoTiddler } from './routing-state';

/**
 * Hover bridge: fetch TidGi routing info only on mouseenter, write a temp tiddler,
 * and let wikitext children refresh from that tiddler. No display logic here.
 */
if ($tw.browser) {
  class TidgiRoutingRefreshWidget extends Widget {
    private requestId = 0;
    private hoverHost: Element | undefined;

    constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
      super(parseTreeNode, options);
      this.initialise(parseTreeNode, options);
    }

    private handlePointerEnter = () => {
      this.fetchRoutingInfo();
    };

    private fetchRoutingInfo() {
      const tiddlerTitle = this.getAttribute('tiddler') || this.getVariable('currentTiddler');
      if (!tiddlerTitle || typeof window?.service?.wiki?.getTiddlerRoutingInfo !== 'function') {
        return;
      }

      const currentRequest = ++this.requestId;
      void window.service.wiki.getTiddlerRoutingInfo(tiddlerTitle).then((info) => {
        if (currentRequest !== this.requestId) {
          return;
        }
        writeRoutingInfoTiddler(tiddlerTitle, info);
      }).catch((error: unknown) => {
        console.error('tidgi-routing-chain: refresh failed', error);
      });
    }

    private detachHoverListener() {
      if (this.hoverHost) {
        this.hoverHost.removeEventListener('mouseenter', this.handlePointerEnter);
        this.hoverHost = undefined;
      }
    }

    render(parent: Element, nextSibling: Element | null) {
      this.parentDomNode = parent;
      this.computeAttributes();
      this.execute();

      const host = this.document.createElement('span');
      host.className = 'tc-tidgi-routing-refresh';
      host.setAttribute('data-tidgi-routing-refresh', 'yes');
      parent.insertBefore(host, nextSibling);
      this.domNodes.push(host);
      this.hoverHost = host;
      host.addEventListener('mouseenter', this.handlePointerEnter);

      this.renderChildren(host, null);
    }

    execute() {
      void this.getAttribute('tiddler');
      this.makeChildWidgets();
    }

    removeChildDomNodes() {
      this.detachHoverListener();
      super.removeChildDomNodes();
    }

    refresh(changedTiddlers: IChangedTiddlers) {
      const changedAttributes = this.computeAttributes();
      const tiddlerTitle = this.getAttribute('tiddler') || this.getVariable('currentTiddler');

      if (changedAttributes.tiddler) {
        this.refreshSelf();
        return true;
      }

      // Tags/fields changed → drop stale routing display; next hover refetches.
      if (tiddlerTitle && changedTiddlers[tiddlerTitle]) {
        clearRoutingInfoTiddler(tiddlerTitle);
      }

      return this.refreshChildren(changedTiddlers);
    }
  }

  const moduleExports = exports as Record<string, unknown>;
  moduleExports['tidgi-routing-refresh'] = TidgiRoutingRefreshWidget;
}
