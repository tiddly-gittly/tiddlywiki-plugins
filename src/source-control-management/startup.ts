/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { IBrowserViewMetaData, IFileWithStatus, IGitLogEntry } from '../type';

export const startup = () => {
  if (!$tw.browser) return;

  // Safe window access for testing in Node.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-undef
  type SCMWindow = Partial<Window> & {
    meta?: () => IBrowserViewMetaData;
    service?: Window['service'];
  };
  const emptyWindow: SCMWindow = {};
  const globalWindow = typeof global === 'undefined' ? undefined : (global as { window?: Window }).window;
  const mockWindow = ($tw as { mockWindow?: SCMWindow }).mockWindow;
  const win: SCMWindow = typeof window === 'undefined' ? (globalWindow ?? mockWindow ?? emptyWindow) : window;

  // State for Commit List
  let currentPage = 0;
  let currentCommits: IGitLogEntry[] = [];
  let isFetching = false;
  let currentWikiFolder: string | undefined;
  const isDebugMode = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/configs/debug') === 'yes';
  const getMockCommits = (): IGitLogEntry[] => [
    {
      hash: 'mock1',
      parents: [],
      branch: 'main',
      message: 'Mock commit 1',
      committerDate: '2023-01-01',
      author: { name: 'Mock User' },
    },
    {
      hash: 'mock2',
      parents: [],
      branch: 'main',
      message: 'Mock commit 2',
      committerDate: '2023-01-02',
      author: { name: 'Mock User' },
    },
  ];
  const getMockFiles = (): IFileWithStatus[] => [
    { path: 'tiddlers/TestTiddler.tid', status: 'modified' },
    { path: 'other.txt', status: 'added' },
  ];

  // Helper to reset state
  const resetState = (tiddlerTitle: string) => {
    currentPage = 0;
    currentCommits = [];
    const commitsTitle = `$:/temp/source-control-management/${tiddlerTitle}/commits`;
    $tw.wiki.deleteTiddler(commitsTitle);
  };

  $tw.rootWidget.addEventListener('tm-scm-reload', async (_event) => {
    if (isFetching) return;

    // Get viewing tiddler from state
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return; // No tiddler selected to view

    const searchQuery = $tw.wiki.getTiddlerText('$:/state/scm/search');

    // Reset state for new search
    resetState(viewingTiddler);

    const debugMode = isDebugMode();
    const workspace = win.meta?.()?.workspace;
    currentWikiFolder = workspace?.wikiFolderLocation ?? undefined;
    const gitService = win.service?.git;
    const wikiService = win.service?.wiki;

    if (debugMode) {
      try {
        isFetching = true;
        $tw.wiki.setText('$:/state/scm/loading', 'text', undefined, 'yes');

        const newCommits: IGitLogEntry[] = [];
        await new Promise(resolve => setTimeout(resolve, 500));
        newCommits.push(...getMockCommits());
        currentCommits = newCommits;
        currentPage = 1;

        const commitsTitle = `$:/temp/source-control-management/${viewingTiddler}/commits`;
        const hashList = currentCommits.map(c => c.hash);
        $tw.wiki.addTiddler({
          title: commitsTitle,
          list: hashList,
        });

        $tw.wiki.setText('$:/state/scm/has-uncommitted', 'text', undefined, 'no');

        newCommits.forEach(commit => {
          const commitTitle = `$:/temp/source-control-management/${viewingTiddler}/commit/${commit.hash}`;
          $tw.wiki.addTiddler({
            title: commitTitle,
            text: commit.message,
            author: commit.author?.name,
            date: commit.committerDate,
            hash: commit.hash,
          });
        });
      } catch (error) {
        console.error('[SCM] Git Log Error:', error);
        $tw.wiki.setText('$:/state/scm/error', 'text', undefined, String(error));
      } finally {
        isFetching = false;
        $tw.wiki.setText('$:/state/scm/loading', 'text', undefined, 'no');
      }
      return;
    }

    if (!currentWikiFolder || !gitService || !wikiService) {
      return;
    }

    try {
      isFetching = true;
      $tw.wiki.setText('$:/state/scm/loading', 'text', undefined, 'yes');

      const newCommits: IGitLogEntry[] = [];

      // Resolve file path if tiddlerTitle is present

      // Get file path for the viewing tiddler
      const absoluteFilePath = await wikiService.getTiddlerFilePath(viewingTiddler);

      // If tiddler has no file path (e.g., shadow/system tiddler), show nothing
      if (!absoluteFilePath) {
        // Clear results for non-file tiddlers
        const commitsTitle = `$:/temp/source-control-management/${viewingTiddler}/commits`;
        $tw.wiki.addTiddler({ title: commitsTitle, list: [] });
        return;
      }

      // Convert absolute path to relative path (relative to wiki folder)
      const filePath = absoluteFilePath.replace(currentWikiFolder, '').replace(/^[/\\]+/, '');
      // API Call

      const result = await gitService.callGitOp('getGitLog', currentWikiFolder, {
        page: currentPage,
        pageSize: 50,
        searchQuery: searchQuery ?? undefined,
        searchMode: searchQuery ? 'message' : 'file',
        filePath,
      });

      newCommits.push(...result.entries);
      // Update internal state
      currentCommits = newCommits;
      currentPage += 1;

      // Update Tiddlers with new path structure
      const commitsTitle = `$:/temp/source-control-management/${viewingTiddler}/commits`;
      const hashList = currentCommits.map(c => c.hash);
      $tw.wiki.addTiddler({
        title: commitsTitle,
        list: hashList,
      });

      // Check if current tiddler file has uncommitted changes
      try {
        const uncommittedFiles = await gitService.callGitOp('getCommitFiles', currentWikiFolder, '');
        const filesList = Array.isArray(uncommittedFiles) ? uncommittedFiles : [];
        const absoluteFilePath = await wikiService.getTiddlerFilePath(viewingTiddler);

        if (absoluteFilePath) {
          const normalize = (p: string) => p.replaceAll('\\', '/');
          const folder = normalize(currentWikiFolder);
          const relativePath = normalize(absoluteFilePath).replace(folder, '').replace(/^\//, '');

          const hasUncommitted = filesList.some(f => normalize(f.path) === relativePath);
          $tw.wiki.setText('$:/state/scm/has-uncommitted', 'text', undefined, hasUncommitted ? 'yes' : 'no');
        } else {
          $tw.wiki.setText('$:/state/scm/has-uncommitted', 'text', undefined, 'no');
        }
      } catch (error) {
        console.error('[SCM] Error checking uncommitted changes:', error);
        $tw.wiki.setText('$:/state/scm/has-uncommitted', 'text', undefined, 'no');
      }

      // Batch add commit details with new path structure
      newCommits.forEach(commit => {
        const commitTitle = `$:/temp/source-control-management/${viewingTiddler}/commit/${commit.hash}`;
        $tw.wiki.addTiddler({
          title: commitTitle,
          text: commit.message,
          author: commit.author?.name,
          date: commit.committerDate,
          hash: commit.hash,
        });
      });
    } catch (error) {
      console.error('[SCM] Git Log Error:', error);
      $tw.wiki.setText('$:/state/scm/error', 'text', undefined, String(error));
    } finally {
      isFetching = false;
      $tw.wiki.setText('$:/state/scm/loading', 'text', undefined, 'no');
    }
  });

  $tw.rootWidget.addEventListener('tm-scm-load-uncommitted', async (_event) => {
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return;

    $tw.wiki.setText('$:/state/scm/selected-commit', 'text', undefined, 'uncommitted');
    const filesTitle = `$:/temp/source-control-management/${viewingTiddler}/files`;

    $tw.wiki.deleteTiddler(filesTitle);
    $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'yes');

    const debugMode = isDebugMode();
    const workspace = win.meta?.()?.workspace;
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    try {
      if (debugMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const files = getMockFiles();

        const fileTiddlers = files.map((file) => {
          const safeTitle = `$:/temp/source-control-management/${viewingTiddler}/file/${encodeURIComponent(file.path)}`;
          return {
            title: safeTitle,
            text: file.path,
            status: file.status,
            path: file.path,
          };
        });

        fileTiddlers.forEach((t) => {
          $tw.wiki.addTiddler(t);
        });

        $tw.wiki.addTiddler({
          title: filesTitle,
          list: fileTiddlers.map((t) => t.title),
        });

        $tw.wiki.setText('$:/state/scm/has-uncommitted', 'text', undefined, files.length > 0 ? 'yes' : 'no');
        $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, '');
        $tw.wiki.setText('$:/state/scm/show-file-list', 'text', undefined, 'yes');
        return;
      }

      if (!wikiFolderLocation) return;
      const gitService = win.service?.git;
      const wikiService = win.service?.wiki;
      if (!gitService || !wikiService) return;

      // Get uncommitted files using getCommitFiles with empty commitHash
      const files = await gitService.callGitOp('getCommitFiles', wikiFolderLocation, '');

      const fileTiddlers = files.map((file) => {
        const safeTitle = `$:/temp/source-control-management/${viewingTiddler}/file/${encodeURIComponent(file.path)}`;
        return {
          title: safeTitle,
          text: file.path,
          status: file.status,
          path: file.path,
        };
      });

      fileTiddlers.forEach((t) => {
        $tw.wiki.addTiddler(t);
      });

      $tw.wiki.addTiddler({
        title: filesTitle,
        list: fileTiddlers.map((t) => t.title),
      });

      // Store has uncommitted flag
      $tw.wiki.setText('$:/state/scm/has-uncommitted', 'text', undefined, files.length > 0 ? 'yes' : 'no');

      // Auto-select the viewing tiddler's file if present
      const absoluteFilePath = await wikiService.getTiddlerFilePath(viewingTiddler);
      let matchFound = false;
      if (absoluteFilePath) {
        const normalize = (p: string) => p.replaceAll('\\', '/');
        const folder = normalize(wikiFolderLocation);
        const relativePath = normalize(absoluteFilePath).replace(folder, '').replace(/^\//, '');

        const match = files.find(f => normalize(f.path) === relativePath);

        if (match) {
          $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, match.path);
          $tw.wiki.setText('$:/state/scm/show-file-list', 'text', undefined, 'no');
          // For uncommitted, load working copy
          $tw.rootWidget.dispatchEvent({ type: 'tm-scm-load-working-copy', param: match.path });
          matchFound = true;
        }
      }

      if (!matchFound) {
        $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, '');
        $tw.wiki.setText('$:/state/scm/show-file-list', 'text', undefined, 'yes');
      }
    } catch (error) {
      const errorInfo = error as { message?: string; stack?: string };
      console.error('[SCM] Error loading uncommitted changes:', error);
      console.error('[SCM] Error details:', {
        message: errorInfo.message,
        stack: errorInfo.stack,
        wikiFolderLocation,
      });
    } finally {
      $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'no');
    }
  });

  $tw.rootWidget.addEventListener('tm-scm-load-files', async (event) => {
    let commitHash = '';
    if (typeof event.param === 'string') {
      commitHash = event.param;
    } else if (typeof event.tiddlerTitle === 'string') {
      commitHash = event.tiddlerTitle;
    }
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!commitHash || !viewingTiddler) return;

    $tw.wiki.setText('$:/state/scm/selected-commit', 'text', undefined, commitHash);
    const filesTitle = `$:/temp/source-control-management/${viewingTiddler}/files`;

    $tw.wiki.deleteTiddler(filesTitle);
    $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'yes');

    const debugMode = isDebugMode();
    const workspace = win.meta?.()?.workspace;
    const wikiFolderLocation = workspace?.wikiFolderLocation;

    try {
      if (debugMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const files = getMockFiles();

        const fileTiddlers = files.map((file) => {
          const safeTitle = `$:/temp/source-control-management/${viewingTiddler}/file/${encodeURIComponent(file.path)}`;
          return {
            title: safeTitle,
            text: file.path,
            status: file.status,
            path: file.path,
          };
        });

        fileTiddlers.forEach((t) => {
          $tw.wiki.addTiddler(t);
        });

        $tw.wiki.addTiddler({
          title: filesTitle,
          list: fileTiddlers.map((t) => t.title),
        });

        $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, '');
        $tw.wiki.setText('$:/state/scm/show-file-list', 'text', undefined, 'yes');
        return;
      }

      if (!wikiFolderLocation) return;
      const gitService = win.service?.git;
      const wikiService = win.service?.wiki;
      if (!gitService || !wikiService) return;

      const files = await gitService.callGitOp('getCommitFiles', wikiFolderLocation, commitHash);

      const fileTiddlers = files.map((file) => {
        const safeTitle = `$:/temp/source-control-management/${viewingTiddler}/file/${encodeURIComponent(file.path)}`;
        return {
          title: safeTitle,
          text: file.path,
          status: file.status,
          path: file.path,
        };
      });

      fileTiddlers.forEach((t) => {
        $tw.wiki.addTiddler(t);
      });

      $tw.wiki.addTiddler({
        title: filesTitle,
        list: fileTiddlers.map((t) => t.title),
      });
      // Auto-select logic
      const absoluteFilePath = await wikiService.getTiddlerFilePath(viewingTiddler);
      let matchFound = false;
      if (absoluteFilePath) {
        // Normalize paths to forward slashes for comparison
        const normalize = (p: string) => p.replaceAll('\\', '/');
        const folder = normalize(wikiFolderLocation);
        const relativePath = normalize(absoluteFilePath).replace(folder, '').replace(/^\//, '');

        const match = files.find(f => normalize(f.path) === relativePath);

        if (match) {
          $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, match.path);
          $tw.wiki.setText('$:/state/scm/show-file-list', 'text', undefined, 'no');
          // Dispatch event to load content
          $tw.rootWidget.dispatchEvent({ type: 'tm-scm-load-content', param: match.path });
          matchFound = true;
        }
      }

      if (!matchFound) {
        $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, '');
        $tw.wiki.setText('$:/state/scm/show-file-list', 'text', undefined, 'yes');
      }
    } catch (error) {
      const errorInfo = error as { message?: string; stack?: string };
      console.error('[SCM] Error loading files:', error);
      console.error('[SCM] Error details:', {
        message: errorInfo.message,
        stack: errorInfo.stack,
        commitHash,
        wikiFolderLocation,
      });
    } finally {
      $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'no');
    }
  });

  $tw.rootWidget.addEventListener('tm-scm-load-working-copy', (event) => {
    const filePath = typeof event.param === 'string' ? event.param : '';
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');

    if (!filePath || !viewingTiddler) return undefined;

    $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, filePath);
    $tw.wiki.setText('$:/state/scm/loading-content', 'text', undefined, 'yes');

    try {
      // For working copy, use the current tiddler content
      const originalTitle = getTiddlerTitle(filePath);
      const currentTiddler = $tw.wiki.getTiddler(originalTitle);

      if (!currentTiddler) {
        throw new Error(`Tiddler not found: ${originalTitle}`);
      }

      const content = currentTiddler.fields.text ?? '';

      // Parse fields from the tiddler - preserve TiddlyWiki date format
      const fields: Record<string, string> = {};
      Object.keys(currentTiddler.fields).forEach(key => {
        if (key !== 'text' && key !== 'title') {
          const value = currentTiddler.fields[key];
          // Keep string values as-is (they're already in TiddlyWiki format)
          if (typeof value === 'string') {
            fields[key] = value;
          } // Convert Date objects to TiddlyWiki format (YYYYMMDDhhmmssSSS)
          else if (value instanceof Date) {
            fields[key] = $tw.utils.stringifyDate(value);
          } // For other types, convert to string without JSON encoding
          else if (value !== undefined && value !== null) {
            fields[key] = String(value);
          }
        }
      });

      const temporaryTitle = `$:/temp/source-control-management/${viewingTiddler}/file-content`;

      $tw.wiki.addTiddler({
        title: temporaryTitle,
        text: content,
        'scm-original-path': filePath,
        'scm-original-title': originalTitle,
        'scm-current-content': content,
        'scm-fields': JSON.stringify(fields),
      });
    } catch (error) {
      console.error('[SCM] Error loading working copy:', error);
    } finally {
      $tw.wiki.setText('$:/state/scm/loading-content', 'text', undefined, 'no');
    }
    return undefined;
  });

  $tw.rootWidget.addEventListener('tm-scm-load-content', async (event) => {
    const filePath = typeof event.param === 'string' ? event.param : '';
    const commitHash = $tw.wiki.getTiddlerText('$:/state/scm/selected-commit');
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    const workspace = win.meta?.()?.workspace;
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    const gitService = win.service?.git;

    if (!filePath || !commitHash || !wikiFolderLocation || !viewingTiddler || !gitService) return;

    $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, filePath);
    $tw.wiki.setText('$:/state/scm/loading-content', 'text', undefined, 'yes');

    try {
      const result = await gitService.callGitOp('getFileContent', wikiFolderLocation, commitHash, filePath);
      const content = typeof result?.content === 'string' ? result.content : '';
      if (!content) return;

      // Parse .tid file format: fields separated by newlines, empty line before text
      const fields: Record<string, string> = {};
      let textContent = content;

      if (filePath.endsWith('.tid')) {
        const lines = content.split('\n');
        let index = 0;

        // Parse fields (key: value format)
        while (index < lines.length) {
          const line = lines[index];
          if (line.trim() === '') {
            // Empty line marks end of fields
            index++;
            break;
          }
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            fields[key] = value;
          }
          index++;
        }

        // Rest is text content
        textContent = lines.slice(index).join('\n');
      }

      const temporaryTitle = `$:/temp/source-control-management/${viewingTiddler}/file-content`;
      const originalTitle = getTiddlerTitle(filePath);
      const currentTiddler = $tw.wiki.getTiddler(originalTitle);
      const currentContent = currentTiddler?.fields.text ?? '';

      $tw.wiki.addTiddler({
        title: temporaryTitle,
        text: textContent,
        'scm-original-path': filePath,
        'scm-original-title': originalTitle,
        'scm-current-content': currentContent,
        'scm-fields': JSON.stringify(fields), // Store fields as JSON
      });
    } catch (error) {
      console.error(error);
    } finally {
      $tw.wiki.setText('$:/state/scm/loading-content', 'text', undefined, 'no');
    }
  });

  $tw.rootWidget.addEventListener('tm-scm-apply-content', (_event) => {
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return;

    const temporaryTitle = `$:/temp/source-control-management/${viewingTiddler}/file-content`;
    const temporaryTiddler = $tw.wiki.getTiddler(temporaryTitle);
    if (!temporaryTiddler) return;

    const originalTitle = temporaryTiddler.fields['scm-original-title'];
    if (typeof originalTitle === 'string' && originalTitle) {
      const confirmMessage = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/language/zh-Hans/FileContent/ApplyConfirm') ??
        $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/language/en-GB/FileContent/ApplyConfirm') ??
        'Are you sure you want to apply this historical version? This will replace the current content.';
      if (!confirm(confirmMessage)) return;

      const existing = $tw.wiki.getTiddler(originalTitle);
      $tw.wiki.addTiddler({
        ...existing?.fields,
        title: originalTitle,
        text: temporaryTiddler.fields.text,
        modified: new Date(),
      });

      const story = new $tw.Story();
      story.addToStory(originalTitle, '$:/StoryList');
      story.addToHistory(originalTitle);
    }
    return true;
  });

  // Auto-select first commit after reload
  $tw.rootWidget.addEventListener('tm-scm-auto-select-first-commit', async (_event) => {
    // Wait a bit for the commits to be loaded
    await new Promise(resolve => setTimeout(resolve, 800));

    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return;

    const commitsTitle = `$:/temp/source-control-management/${viewingTiddler}/commits`;
    const commitsList = ($tw.wiki as { getTiddlerList?: (title: string) => string[] }).getTiddlerList?.(commitsTitle);

    if (commitsList && commitsList.length > 0) {
      const firstCommit = commitsList[0];
      $tw.wiki.setText('$:/state/scm/selected-commit', 'text', undefined, firstCommit);
      // Dispatch event to load files for this commit
      $tw.rootWidget.dispatchEvent({ type: 'tm-scm-load-files', param: firstCommit });
    }
  });
};

function getTiddlerTitle(filePath: string): string {
  if (filePath.startsWith('tiddlers/')) {
    return filePath.replace('tiddlers/', '').replace(/\.tid$/, '').replace(/\.[^.]+$/, '');
  }
  return filePath.replace(/\.tid$/, '').replace(/\.[^.]+$/, '');
}
