/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import type { ModifiedFileList } from 'git-sync-js';
import { IParseTreeNode, IWidgetInitialiseOptions } from 'tiddlywiki';

declare let exports: {
  ['tidgi-desktop-git-sync']: typeof NodeJSGitSyncWidget;
};

class NodeJSGitSyncWidget extends Widget {
  state = {
    /**
     * need to setup api, or just API missing
     */
    needSetUp: false,
    /**
     * check interval
     */
    interval: 1000,
    /**
     * things need to commit
     */
    count: 0,
    /**
     * need to push to github
     */
    unsync: false,
    /**
     * a sync is in progress
     */
    syncing: false,
  };

  /**
   * Lifecycle method: call this.initialise and super
   */
  constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
    super(parseTreeNode, options);
    this.initialise(parseTreeNode, options);
    this.checkInLoop();
  }

  async getWorkspaces() {
    const workspaces = await window.service.workspace.getWorkspacesAsList();
    const activeWorkspace = await window.service.workspace.getActiveWorkspace();
    if (activeWorkspace) {
      return workspaces.filter((workspace) => workspace.id === activeWorkspace.id || (workspace.isSubWiki && workspace.mainWikiID === activeWorkspace.id));
    }
    return [];
  }

  /**
   * Lifecycle method: Render this widget into the DOM
   */
  render(parent: Element, nextSibling: Element) {
    // boilerplate
    this.parentDomNode = parent;
    this.computeAttributes();

    // DOM
    const syncStateButton = this.document.createElement('button');
    syncStateButton.className = 'tc-btn-invisible tc-btn-plugins-linonetwo-tidgi-desktop-git-sync ';
    syncStateButton.addEventListener('click', this.onSyncButtonClick.bind(this));

    // set icon
    if (this.state.needSetUp) {
      // all commit and sync to cloud
      syncStateButton.className += 'git-sync';
      // tooltip
      const label = '需要配置TidGi';
      syncStateButton.title = label;
      syncStateButton.ariaLabel = label;
      // icon
      syncStateButton.innerHTML = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/icons/git-sync.svg') ?? '';
    } else if (this.state.syncing) {
      // all commit and sync to cloud
      syncStateButton.className += 'git-sync syncing';
      // tooltip
      const label = '正在同步到云端';
      syncStateButton.title = label;
      syncStateButton.ariaLabel = label;
      // icon
      syncStateButton.innerHTML = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/icons/git-sync.svg') ?? '';
    } else if (this.state.count === 0 && !this.state.unsync) {
      // all commit and sync to cloud
      syncStateButton.className += 'git-sync';
      // tooltip
      const label = '已完全同步到云端';
      syncStateButton.title = label;
      syncStateButton.ariaLabel = label;
      // icon
      syncStateButton.innerHTML = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/icons/git-sync.svg') ?? '';
    } else if (this.state.count === 0 && this.state.unsync) {
      // some commit need to sync to the cloud
      syncStateButton.className += 'git-pull-request';
      // tooltip
      const label = '待推送到云端';
      syncStateButton.title = label;
      syncStateButton.ariaLabel = label;
      // icon
      syncStateButton.innerHTML = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/icons/git-pull-request.svg') ?? '';
    } else {
      // some need to commit, and not sync to cloud yet
      syncStateButton.className += 'git-pull-request';
      // tooltip
      const label = `${this.state.count} 个文件待提交和推送`;
      syncStateButton.title = label;
      syncStateButton.ariaLabel = label;
      // icon
      const iconSVG = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/icons/git-pull-request.svg') ?? '';
      // add count indicator badge
      const countIndicator = `<span class="tidgi-scm-count tidgi-scm-count-small">${this.state.count}</span>`;
      syncStateButton.innerHTML = `<span>${iconSVG}${countIndicator}</span>`;
    }

    // boilerplate
    parent.insertBefore(syncStateButton, nextSibling);
    this.domNodes.push(syncStateButton);
  }

  /**
   * Event listener of button
   */
  async onSyncButtonClick() {
    if (!this.state.syncing && this.state.unsync) {
      this.state.syncing = true;
      this.refreshSelf();
      try {
        const workspaces = await this.getWorkspaces();
        const tasks = workspaces.map(async (workspace) => {
          await window.service.sync.syncWikiIfNeeded(workspace);
        });
        await Promise.all(tasks);
      } catch (error) {
        console.error('NodeJSGitSyncWidget: Error syncing', error);
      }
      this.state.syncing = false;
      this.refreshSelf();
    }
  }

  /**
   * Check state every a few time
   */
  checkInLoop() {
    // check if API from TidGi is available, first time it is Server Side Rendening so window.xxx from the electron ContextBridge will be missing
    if (
      !window.service.git ||
      typeof window.service.git.commitAndSync !== 'function' ||
      typeof window.service.git.getModifiedFileList !== 'function' ||
      typeof window.service.workspace.getWorkspacesAsList !== 'function'
    ) {
      this.state.needSetUp = true;
    } else {
      this.state.needSetUp = false;
      void this.checkGitState();
    }
    setTimeout(() => {
      this.checkInLoop();
    }, this.state.interval);
  }

  /**
   *  Check repo git sync state and count of uncommit things
   */
  async checkGitState() {
    const workspaces = await this.getWorkspaces();
    const repoStatuses = [];
    for (const workspace of workspaces) {
      const modifiedListString = $tw.wiki.getTiddlerText(`$:/state/scm-modified-file-list/${workspace.wikiFolderLocation}`);
      if (modifiedListString !== undefined) {
        const modifiedListJSON = JSON.parse(modifiedListString) as ModifiedFileList[];
        repoStatuses.push(modifiedListJSON);
      }
    }

    this.state.count = 0;
    this.state.unsync = false;
    for (const repoStatus of repoStatuses) {
      if (repoStatus.length > 0) {
        this.state.count += repoStatus.length;
        this.state.unsync = true;
      }
    }

    return this.refreshSelf(); // method from super class, this is like React forceUpdate, we use it because it is not fully reactive on this.state change
  }
}

exports['tidgi-desktop-git-sync'] = NodeJSGitSyncWidget;
