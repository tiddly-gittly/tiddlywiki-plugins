/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import type { IParseTreeNode, IWidgetInitialiseOptions } from 'tiddlywiki';

if ($tw.browser) {
  class GitCommitListWidget extends Widget {
    constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
      super(parseTreeNode, options);
      this.initialise(parseTreeNode, options);
    }

    render(parent: Element, nextSibling: Element | null) {
      this.parentDomNode = parent;
      this.computeAttributes();
      this.execute();

      const container = this.document.createElement('div');
      container.className = 'tidgi-scm-commit-list-container';
      
      this.renderChildren(container, null);
      parent.insertBefore(container, nextSibling);
      this.domNodes.push(container);
    }

    execute() {
      // Attributes used for triggering reload via refresh()
      const tiddler = this.getAttribute('tiddler');
      const search = this.getAttribute('search');
      
      this.makeChildWidgets();
    }

    refresh(changedTiddlers: Record<string, any>) {
      const changedAttributes = this.computeAttributes();
      if (changedAttributes.tiddler || changedAttributes.search) {
        // Attributes changed, no need to trigger reload automatically
        this.refreshSelf();
        return true;
      }
      return this.refreshChildren(changedTiddlers);
    }
  }

  exports['git-commit-list'] = GitCommitListWidget;
}
