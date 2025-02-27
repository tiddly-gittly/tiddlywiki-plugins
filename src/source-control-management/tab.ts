/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IParseTreeNode, IWidgetInitialiseOptions } from 'tiddlywiki';
import './style.css';

if ($tw.browser) {
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

    checkLoopTimeout: NodeJS.Timeout | undefined;

    /**
     * Lifecycle method: call this.initialise and super
     */
    constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
      super(parseTreeNode, options);
      this.initialise(parseTreeNode, options);
      void this.checkInLoop();
    }

    async getWorkspaces() {
      const workspaces = await window?.service?.workspace?.getWorkspacesAsList?.();
      const activeWorkspace = await window?.service?.workspace?.getActiveWorkspace?.();
      if (activeWorkspace && workspaces) {
        return workspaces.filter((workspace) => workspace.id === activeWorkspace.id || (workspace.isSubWiki && workspace.mainWikiID === activeWorkspace.id));
      }
      return [];
    }

    /**
     * Lifecycle method: Render this widget into the DOM
     */
    render(parent: Element, nextSibling: Element | null) {
      // boilerplate
      this.parentDomNode = parent;
      this.computeAttributes();

      // DOM
      const container = this.document.createElement('div');
      container.className = '';

      // workspaces
      for (const workspaceFullPath of Object.keys(this.state.repoInfo).sort((a, b) => a.length - b.length)) {
        /**
       * changed files
       * ```jsonl
       *  {type: 'M', fileRelativePath: 'tiddlers/$__palette.tid', filePath: "C:\Users\linonetwo\Documents\repo-c\TidGi-Desktop\wiki-dev\wiki\tiddlers\$__language.tid"}
          {type: '??', fileRelativePath: 'tiddlers/$__plugins_Gk0Wk_CPL-Repo_config_popup-readme-at-startup.tid', filePath: 'C:\Users\linonetwo\Documents\repo-c\TidGi-Desktop\wiki-dev\wiki\tiddlers\$__plugins_Gk0Wk_CPL-Repo_config_popup-readme-at-startup.tid'}
        ```
       */
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
          const fileOpenInFolderElement = this.document.createElement('a');
          fileOpenInFolderElement.className = 'tidgi-scm-file-open-in-folder tc-tiddlylink tc-tiddlylink-resolves tc-popup-handle tc-popup-absolute';
          const openInFolderIcon = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/open-in-external-app/icons/open-in-folder') ?? 'O';
          fileOpenInFolderElement.innerHTML = openInFolderIcon;
          fileOpenInFolderElement.addEventListener('click', () => {
            this.onOpenInFolderClicked(changedFileInfo.filePath);
          });

          fileInfoContainer.append(fileChangedTypeElement);
          fileInfoContainer.append(fileNameElement);
          fileInfoContainer.append(fileOpenInFolderElement);
          workspaceInfoContainer.append(fileInfoContainer);
        }

        container.append(workspaceInfoContainer);
      }

      parent.insertBefore(container, nextSibling);
      this.domNodes.push(container);
    }

    onChangedFileNameClicked(title: string): void {
      const workspaceID = window.meta?.()?.workspaceID;
      if (workspaceID) {
        void window?.service?.wiki?.wikiOperationInBrowser?.('wiki-open-tiddler', workspaceID, [title]);
      }
    }

    onOpenInFolderClicked(filePath: string): void {
      void window?.service?.native?.openPath?.(filePath, true);
    }

    getTitleByPath(fileRelativePath: string) {
      // TODO: use tiddlywiki's API to get title by path, to handle sub wiki case
      if (fileRelativePath.startsWith('plugins')) {
        return `$:/${fileRelativePath}`;
      } else if (fileRelativePath.startsWith('tiddlers/')) {
        return fileRelativePath.replace('tiddlers/', '').replace(/\.tid$/, '');
      } else if (fileRelativePath.endsWith('.tid')) {
        return fileRelativePath.replace(/\.tid$/, '');
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
        !(window?.service?.git) ||
        typeof window?.service?.git?.commitAndSync !== 'function' ||
        typeof window?.service?.git?.getModifiedFileList !== 'function' ||
        typeof window?.service?.workspace?.getWorkspacesAsList !== 'function'
      ) {
        this.state.needSetUp = true;
      } else {
        this.state.needSetUp = false;
        await this.checkGitState();
      }
      // TODO: tab's parent won't connect to dom tree when render is called, make destroy logic difficult to implement
      /**
       * ```
       * container tab <div class>​</div>​
          initialized tab
          this.state.initialized, connected true false
          destroy tab
          this.state.initialized, connected false true
       */
    }

    /**
     *  Check repo git sync state and count of uncommit things
     */
    async checkGitState() {
      this.state.count = 0;
      this.state.unsync = false;
      this.state.repoInfo = {};

      const folderInfo = await this.getFolderInfo();
      const tasks = folderInfo.map(async ({ wikiPath }) => {
        const modifiedList = await window?.service?.git?.getModifiedFileList?.(wikiPath);
        if (!modifiedList) return;
        modifiedList.sort((changedFileInfoA, changedFileInfoB) => changedFileInfoA.fileRelativePath > changedFileInfoB.fileRelativePath ? 1 : -1);
        $tw.wiki.addTiddler({
          title: `$:/state/scm-modified-file-list/${wikiPath}`,
          text: JSON.stringify(modifiedList),
        });
        this.state.repoInfo[wikiPath] = modifiedList;
      });
      await Promise.all(tasks);

      return this.refreshSelf(); // method from super class, this is like React forceUpdate, we use it because it is not fully reactive on this.state change
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  exports['git-sync-scm-tab'] = NodeJSGitSyncSCMTabWidget;
}
