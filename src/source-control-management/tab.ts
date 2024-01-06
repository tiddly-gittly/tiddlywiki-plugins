/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IParseTreeNode, IWidgetInitialiseOptions } from 'tiddlywiki';
import './style.css';

declare let exports: {
  ['git-sync-scm-tab']: typeof NodeJSGitSyncSCMTabWidget;
};
class NodeJSGitSyncSCMTabWidget extends Widget {
  state: {
    count: number;
    needSetUp: boolean;
    repoInfo: Record<
      string,
      Array<{
        filePath: string;
        fileRelativePath: string;
        type: string;
      }>
    >;
    unsync: boolean;
  } = {
    /**
     * need to setup api, or just API missing
     */
    needSetUp: false,

    /**
     * {
     *   [folderName: string]: {
     *      type: string,
     *      fileRelativePath: string,
     *      filePath: string,
     *   }[]
     * }
     */
    repoInfo: {},
    /**
     * things need to commit
     */
    count: 0,
    /**
     * need to push to github
     */
    unsync: false,
  };

  /**
   * Lifecycle method: call this.initialise and super
   */
  constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
    super(parseTreeNode, options);
    this.initialise(parseTreeNode, options);
    void this.checkInLoop();
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
    const container = this.document.createElement('div');
    container.className = '';

    // workspaces
    for (const workspaceFullPath of Object.keys(this.state.repoInfo).sort((a, b) => a.length - b.length)) {
      const changedFileInfoList = this.state.repoInfo[workspaceFullPath];

      const workspaceInfoContainer = this.document.createElement('div');
      const workspaceTitle = this.document.createElement('h4');
      const workspaceTitleChangedCount = this.document.createElement('span');
      workspaceTitleChangedCount.className = 'tidgi-scm-count';
      workspaceTitleChangedCount.innerText = String(changedFileInfoList.length);

      const workspaceName = workspaceFullPath.split('/').pop();
      workspaceTitle.innerText = workspaceName ?? '-';
      workspaceTitle.append(workspaceTitleChangedCount);
      workspaceInfoContainer.append(workspaceTitle);

      // changed files
      for (const changedFileInfo of changedFileInfoList) {
        const fileInfoContainer = this.document.createElement('div');
        fileInfoContainer.className = 'tidgi-scm-file-info';
        const fileChangedTypeElement = this.document.createElement('span');
        fileChangedTypeElement.className = 'tidgi-scm-file-changed-type';
        fileChangedTypeElement.innerText = this.mapChangeTypeToText(changedFileInfo.type);

        const fileNameElement = this.document.createElement('a');
        fileNameElement.className = 'tidgi-scm-file-name tc-tiddlylink tc-tiddlylink-resolves tc-popup-handle tc-popup-absolute';
        const tiddlerTitle = this.getTitleByPath(changedFileInfo.fileRelativePath);
        fileNameElement.innerText = tiddlerTitle;
        fileNameElement.addEventListener('click', () => {
          this.onChangedFileNameClicked(tiddlerTitle);
        });

        fileInfoContainer.append(fileChangedTypeElement);
        fileInfoContainer.append(fileNameElement);
        workspaceInfoContainer.append(fileInfoContainer);
      }

      container.append(workspaceInfoContainer);
    }

    parent.insertBefore(container, nextSibling);
    this.domNodes.push(container);
  }

  onChangedFileNameClicked(title: string): void {
    const workspaceID = window.meta()?.workspaceID;
    if (workspaceID) {
      void window.service.wiki.wikiOperationInBrowser('wiki-open-tiddler', workspaceID, [title]);
    }
  }

  getTitleByPath(fileRelativePath: string) {
    // TODO: use tiddlywiki's API to get title by path, to handle sub wiki case
    if (fileRelativePath.startsWith('plugins')) {
      return `$:/${fileRelativePath}`;
    } else if (fileRelativePath.startsWith('tiddlers/')) {
      return fileRelativePath.replace('tiddlers/', '').replace(/\.tid$/, '');
    }
    return fileRelativePath;
  }

  async getFolderInfo() {
    const workspaces = await this.getWorkspaces();
    return workspaces.map(({ wikiFolderLocation: wikiPath, gitUrl }) => ({ wikiPath, gitUrl }));
  }

  mapChangeTypeToText(changedType: string): string {
    switch (changedType) {
      case '??': {
        return '+';
      }

      default: {
        return changedType;
      }
    }
  }

  /**
   * Check state every a few time
   */
  async checkInLoop() {
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
      await this.checkGitState();
    }
    // TODO: only check when tab is just opened, wait for https://github.com/Jermolene/TiddlyWiki5/discussions/5945
    // setTimeout(() => {
    //   this.checkInLoop();
    // }, this.state.interval);
  }

  /**
   *  Check repo git sync state and count of uncommit things
   */
  async checkGitState() {
    this.state.count = 0;
    this.state.unsync = false;
    this.state.repoInfo = {};

    const folderInfo = await this.getFolderInfo();
    await Promise.all(
      folderInfo.map(async ({ wikiPath }) => {
        const modifiedList = await window.service.git.getModifiedFileList(wikiPath);
        modifiedList.sort((changedFileInfoA, changedFileInfoB) => changedFileInfoA.fileRelativePath > changedFileInfoB.fileRelativePath ? 1 : -1);
        $tw.wiki.addTiddler({
          title: `$:/state/scm-modified-file-list/${wikiPath}`,
          text: JSON.stringify(modifiedList),
        });
        this.state.repoInfo[wikiPath] = modifiedList;
      }),
    );

    return this.refreshSelf(); // method from super class, this is like React forceUpdate, we use it because it is not fully reactive on this.state change
  }
}

exports['git-sync-scm-tab'] = NodeJSGitSyncSCMTabWidget;
