import type { ModifiedFileList } from 'git-sync-js';

declare global {
  interface Window {
    // methods copy from TidGi-Desktop, should update if it changes
    service: {
      auth: {
        getStorageServiceUserInfo(serviceName: SupportedStorageServices): Promise<IGitUserInfos | undefined>;
      };
      git: {
        commitAndSync(workspace: IWorkspace, configs: ICommitAndSyncConfigs): Promise<boolean>;
        getModifiedFileList(wikiFolderPath: string): Promise<ModifiedFileList[]>;
      };
      native: {
        openPath(filePath: string, showItemInFolder?: boolean): Promise<void>;
      };
      sync: {
        syncWikiIfNeeded(workspace: IWorkspace): Promise<void>;
      };
      wiki: {
        getTiddlerFilePath(title: string, workspaceID?: string): Promise<string | undefined>;
      };
      workspace: {
        getActiveWorkspace: () => Promise<IWorkspace | undefined>;
        getWorkspacesAsList(): Promise<IWorkspace[]>;
      };
    };
  }
}

export interface ICommitAndSyncConfigs {
  commitOnly?: boolean;
  remoteUrl?: string;
  userInfo?: IGitUserInfos;
}
export interface IGitUserInfos extends IGitUserInfosWithoutToken {
  /** Github Login: token */
  accessToken: string;
}

export interface IGitUserInfosWithoutToken {
  branch: string;
  /** Git commit message email */
  email: string | null | undefined;
  /** Github Login: username , this is also used to filter user's repo when searching repo */
  gitUserName: string;
}

export interface IWorkspace {
  /**
   * Is this workspace selected by user, and showing corresponding webview?
   */
  active: boolean;
  authToken?: string;
  /**
   * When this workspace is a local workspace, we can still use local git to backup
   */
  backupOnInterval: boolean;
  disableAudio: boolean;
  disableNotifications: boolean;
  enableHTTPAPI: boolean;
  /**
   * List of plugins excluded on startup, for example `['$:/plugins/bimlas/kin-filter', '$:/plugins/dullroar/sitemap']`
   */
  excludedPlugins: string[];
  /**
   * The online repo to back data up to
   */
  gitUrl: string | null;
  /**
   * Hibernate workspace on startup and when switch to another workspace.
   */
  hibernateWhenUnused: boolean;
  /**
   * Is this workspace hibernated. You can hibernate workspace manually, without setting its hibernateWhenUnused. So we record this field in workspace.
   */
  hibernated: boolean;
  /**
   * Localhost server url to load in the electron webview
   */
  homeUrl: string;
  /**
   * Mostly used for deploying blog. Need tls-key and tls-cert.
   */
  https?: {
    enabled: boolean;
    tlsCert?: string;
    tlsKey?: string;
  };
  id: string;
  /**
   * Is this workspace a subwiki that link to a main wiki, and doesn't have its own webview?
   */
  isSubWiki: boolean;
  /**
   * Nodejs start argument cli, used to start tiddlywiki server in terminal
   */
  lastNodeJSArgv?: string[];
  /**
   * Last visited url, used for rememberLastPageVisited in preferences
   */
  lastUrl: string | null;
  /**
   * ID of main wiki of the sub-wiki. Only useful when isSubWiki === true
   */
  mainWikiID: string | null;
  /**
   * Absolute path of main wiki of the sub-wiki. Only useful when isSubWiki === true , this is the wiki repo that this subwiki's folder soft links to
   */
  mainWikiToLink: string | null;
  /**
   * Display name for this wiki workspace
   */
  name: string;
  /**
   * You can drag workspaces to reorder them
   */
  order: number;
  /**
   * workspace icon's path in file system
   */
  picturePath: string | null;
  /**
   * Localhost tiddlywiki server port
   */
  port: number;
  /**
   * Make wiki readonly if readonly is true. This is normally used for server mode, so also enable gzip.
   *
   * The principle is to configure anonymous reads, but writes require a login, and then give an unguessable username and password to.
   *
   * @url https://wiki.zhiheng.io/static/TiddlyWiki%253A%2520Readonly%2520for%2520Node.js%2520Server.html
   */
  readOnlyMode: boolean;
  /**
   * The root tiddler for wiki. When missing, may use `$:/core/save/lazy-images`
   * @url https://tiddlywiki.com/#LazyLoading
   */
  rootTiddler?: string;
  /**
   * Storage service this workspace sync to
   */
  storageService: SupportedStorageServices;
  /**
   * We basically place sub-wiki in main wiki's `tiddlers/subwiki/` folder, but the `subwiki` part can be configured. Default is `subwiki`
   */
  subWikiFolderName: string;
  /**
   * Sync wiki every interval.
   * If this is false (false by default to save the CPU usage from chokidar watch), then sync will only happen if user manually trigger by click sync button in the wiki, or sync at the app open.
   */
  syncOnInterval: boolean;
  /**
   * Commit and Sync when App starts.
   */
  syncOnStartup: boolean;
  /**
   * Tag name in tiddlywiki's filesystemPath, tiddler with this tag will be save into this subwiki
   */
  tagName: string | null;
  /**
   * Use authenticated-user-header to provide `TIDGI_AUTH_TOKEN_HEADER` as header key to receive a value as username (we use it as token)
   */
  tokenAuth: boolean;
  transparentBackground: boolean;
  userName: string;
  /**
   * folder path for this wiki workspace
   */
  wikiFolderLocation: string;
}
export enum SupportedStorageServices {
  /** China's Collaboration platform for software development & code hosting,
   * with some official background, very secure in China, but have 500M storage limit */
  gitee = 'gitee',
  /** High availability git service without storage limit, but is blocked by GFW in China somehow */
  github = 'github',
  /** Open source git service */
  gitlab = 'gitlab',
  local = 'local',
  /** SocialLinkedData, a privacy first DApp platform leading by Tim Berners-Lee, you can run a server by you own  */
  solid = 'solid',
}

export {};
