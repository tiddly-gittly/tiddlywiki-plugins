import { md2tid } from 'md-to-tid';

const Widget = require('$:/core/modules/widgets/widget.js').widget;

class MdToTidButtonWidget extends Widget {
  /**
   * Lifecycle method: call this.initialise and super
   */
  constructor(parseTreeNode, options) {
    super(parseTreeNode, options);
    this.initialise(parseTreeNode, options);
  }

  /**
   * Lifecycle method: Render this widget into the DOM
   */
  render(parent, nextSibling) {
    this.parentDomNode = parent;
    this.computeAttributes();
    const transformButton = this.document.createElement('button');
    $tw.utils.addClass(transformButton, 'tc-btn-invisible');
    transformButton.innerHTML = `${$tw.wiki.getTiddlerText(
      '$:/plugins/linonetwo/markdown-transformer/md-to-tid-button-icon',
    )}<span class="tc-btn-text tc-button-md-to-tid-button-caption">${$tw.wiki.getTiddlerText(
      '$:/plugins/linonetwo/markdown-transformer/md-to-tid-button-icon-caption',
    )}</span>`;
    transformButton.onclick = this.onExecuteButtonClick.bind(this);
    transformButton.title = transformButton.ariaLabel = 'MD2Tid';
    parent.insertBefore(transformButton, nextSibling);
    this.domNodes.push(transformButton);
  }

  /**
   * Event listener of button
   */
  async onExecuteButtonClick() {
    const title = this.getAttribute('title');
    if (!title) return;
    const type = this.getAttribute('type') || 'text/vnd.tiddlywiki';
    if (type !== 'text/x-markdown') return;
    const prevMDText = await $tw.wiki.getTiddlerText(title);
    if (!prevMDText) return;
    const tidText = await md2tid(prevMDText);
    $tw.wiki.setText(title, 'text', undefined, tidText);
    $tw.wiki.setText(title, 'type', undefined, 'text/vnd.tiddlywiki');
  }
}

exports['md-to-tid-button'] = MdToTidButtonWidget;
