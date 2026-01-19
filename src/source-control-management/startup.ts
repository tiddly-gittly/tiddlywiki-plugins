/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { IFileWithStatus, IGitLogResult, IGitLogEntry } from '../type';

export const startup = () => {
  if (!$tw.browser) return;

  // Safe window access for testing in Node.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-undef
  const win = typeof window !== 'undefined' ? window : 
              (typeof global !== 'undefined' && (global as any).window) ? (global as any).window :
              ($tw as any).mockWindow ? ($tw as any).mockWindow :
              (typeof global !== 'undefined' ? global : {}) as any;

  // State for Commit List
  let currentPage = 0;
  let currentCommits: IGitLogEntry[] = [];
  let isFetching = false;
  let currentWikiFolder: string | null = null;
  let hasMore = true;

  // Helper to reset state
  const resetState = (tiddlerTitle: string) => {
    currentPage = 0;
    currentCommits = [];
    hasMore = true;
    const commitsTitle = `$:/temp/source-control-management/${tiddlerTitle}/commits`;
    $tw.wiki.deleteTiddler(commitsTitle);
  }

  $tw.rootWidget.addEventListener('tm-scm-reload', async (event) => {
    if (isFetching) return;
    
    // Get viewing tiddler from state
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return; // No tiddler selected to view
    
    const searchQuery = $tw.wiki.getTiddlerText('$:/state/scm/search');
    
    // Reset state for new search
    resetState(viewingTiddler);

    // Get API
    const workspace = win?.meta?.()?.workspace;
    currentWikiFolder = workspace?.wikiFolderLocation || null;

    if (!currentWikiFolder || !win?.service?.git?.callGitOp) {
       return;
    }

    try {
      isFetching = true;
      $tw.wiki.setText('$:/state/scm/loading', 'text', undefined, 'yes');

      let filePath: string | undefined;
      const newCommits: IGitLogEntry[] = [];
      let totalCount = 0;

      // Resolve file path if tiddlerTitle is present
      
      console.log('[SCM] Viewing tiddler:', viewingTiddler);
      
      // Get file path for the viewing tiddler
      const absoluteFilePath = await win.service.wiki.getTiddlerFilePath(viewingTiddler);
      console.log('[SCM] Absolute file path:', absoluteFilePath);
        
        // If tiddler has no file path (e.g., shadow/system tiddler), show nothing
        if (!absoluteFilePath) {
            console.log('[SCM] No file path found for tiddler');
            // Clear results for non-file tiddlers
            const commitsTitle = `$:/temp/source-control-management/${viewingTiddler}/commits`;
            $tw.wiki.addTiddler({ title: commitsTitle, list: [] });
            return;
        }
      
      // Convert absolute path to relative path (relative to wiki folder)
      filePath = absoluteFilePath.replace(currentWikiFolder!, '').replace(/^[\\\/]+/, '');
      console.log('[SCM] Relative file path:', filePath);

      // API Call
      console.log('[SCM] Calling getGitLog with:', {
          folder: currentWikiFolder,
          page: currentPage,
          searchQuery,
          filePath
      });
      
      const result = await win.service.git.callGitOp('getGitLog', currentWikiFolder!, {
          page: currentPage,
          pageSize: 50,
          searchQuery: searchQuery || undefined,
          searchMode: searchQuery ? 'message' : 'file',
          filePath: filePath 
      });
      
      console.log('[SCM] Git log result:', result);

      newCommits.push(...(result as IGitLogResult).entries);
      totalCount = (result as IGitLogResult).totalCount;
      
      // Update internal state
      currentCommits = newCommits;
      currentPage += 1;
      hasMore = currentCommits.length < totalCount;
      
      // Update Tiddlers with new path structure
      const commitsTitle = `$:/temp/source-control-management/${viewingTiddler}/commits`;
      const hashList = currentCommits.map(c => c.hash);
      console.log('[SCM] Saving commits to:', commitsTitle, 'with hashes:', hashList);
      $tw.wiki.addTiddler({
           title: commitsTitle,
           list: hashList
      });

      // Check if current tiddler file has uncommitted changes
      try {
        const uncommittedFiles = await win.service.git.callGitOp('getCommitFiles', currentWikiFolder!, '');
        const absoluteFilePath = await win.service.wiki.getTiddlerFilePath(viewingTiddler);
        
        if (absoluteFilePath) {
          const normalize = (p: string) => p.replace(/\\/g, '/');
          const folder = normalize(currentWikiFolder!);
          const relativePath = normalize(absoluteFilePath).replace(folder, '').replace(/^\//, '');
          
          const hasUncommitted = uncommittedFiles.some(f => normalize(f.path) === relativePath);
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
           console.log('[SCM] Saving commit:', commitTitle);
           $tw.wiki.addTiddler({
             title: commitTitle,
             text: commit.message,
             author: commit.author?.name,
             date: commit.committerDate,
             hash: commit.hash
           });
        });
      
      console.log('[SCM] All commits saved successfully');

    } catch (error) {
       console.error('[SCM] Git Log Error:', error);
       $tw.wiki.setText('$:/state/scm/error', 'text', undefined, String(error));
    } finally {
       isFetching = false;
       $tw.wiki.setText('$:/state/scm/loading', 'text', undefined, 'no');
    }
  });

  $tw.rootWidget.addEventListener('tm-scm-load-uncommitted', async (event) => {
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return;

    console.log('[SCM] Loading uncommitted changes for:', viewingTiddler);

    $tw.wiki.setText('$:/state/scm/selected-commit', 'text', undefined, 'uncommitted');
    const filesTitle = `$:/temp/source-control-management/${viewingTiddler}/files`;
    
    $tw.wiki.deleteTiddler(filesTitle);
    $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'yes');

    const workspace = win?.meta?.()?.workspace;
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    if (!wikiFolderLocation) return;

    try {
      // Get uncommitted files using getCommitFiles with empty commitHash
      console.log('[SCM] Calling getCommitFiles with empty hash for uncommitted changes');
      const files = await win.service.git.callGitOp('getCommitFiles', wikiFolderLocation!, '');
      console.log('[SCM] Uncommitted files:', files);

      const fileTiddlers = files.map((file) => {
        const safeTitle = `$:/temp/source-control-management/${viewingTiddler}/file/${encodeURIComponent(file.path)}`;
        return {
          title: safeTitle,
          text: file.path,
          status: file.status,
          path: file.path,
        };
      });

      fileTiddlers.forEach((t) => $tw.wiki.addTiddler(t));

      $tw.wiki.addTiddler({
        title: filesTitle,
        list: fileTiddlers.map((t) => t.title),
      });
      
      // Store has uncommitted flag
      $tw.wiki.setText('$:/state/scm/has-uncommitted', 'text', undefined, files.length > 0 ? 'yes' : 'no');

      // Auto-select the viewing tiddler's file if present
      const absoluteFilePath = await win.service.wiki.getTiddlerFilePath(viewingTiddler);
      let matchFound = false;
      if (absoluteFilePath) {
         const normalize = (p: string) => p.replace(/\\/g, '/');
         const folder = normalize(wikiFolderLocation!);
         const relativePath = normalize(absoluteFilePath).replace(folder, '').replace(/^\//, '');
         
         const match = files.find(f => normalize(f.path) === relativePath);
         
         if (match) {
             console.log('[SCM] Auto-selecting uncommitted file:', match.path);
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
      console.error('[SCM] Error loading uncommitted changes:', error);
      console.error('[SCM] Error details:', {
        message: error?.message,
        stack: error?.stack,
        wikiFolderLocation
      });
    } finally {
      $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'no');
    }
  });

  $tw.rootWidget.addEventListener('tm-scm-load-files', async (event) => {
    const commitHash = event.param || event.tiddlerTitle;
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!commitHash || !viewingTiddler) return;

    console.log('[SCM] Loading files for commit:', commitHash, 'viewing:', viewingTiddler);

    $tw.wiki.setText('$:/state/scm/selected-commit', 'text', undefined, commitHash);
    const filesTitle = `$:/temp/source-control-management/${viewingTiddler}/files`;
    console.log('[SCM] Files Tiddler Title:', filesTitle);
    
    $tw.wiki.deleteTiddler(filesTitle);
    $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'yes');

    const workspace = win?.meta?.()?.workspace;
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    if (!wikiFolderLocation) return;
    
    console.log('[SCM] Using WikiFolder:', wikiFolderLocation);

    try {
      console.log('[SCM] Calling getCommitFiles with:', { wikiFolderLocation, commitHash });
      const files = await win.service.git.callGitOp('getCommitFiles', wikiFolderLocation!, commitHash);
      
      console.log('[SCM] Loaded files:', files);

      const fileTiddlers = files.map((file) => {
        const safeTitle = `$:/temp/source-control-management/${viewingTiddler}/file/${encodeURIComponent(file.path)}`;
        return {
          title: safeTitle,
          text: file.path,
          status: file.status,
          path: file.path,
        };
      });

      console.log('[SCM] Saving file tiddlers:', fileTiddlers.length);
      fileTiddlers.forEach((t) => $tw.wiki.addTiddler(t));

      $tw.wiki.addTiddler({
        title: filesTitle,
        list: fileTiddlers.map((t) => t.title),
      });
      console.log('[SCM] Saved file list to:', filesTitle, 'List:', fileTiddlers.map((t) => t.title));
      
      // Auto-select logic
      const absoluteFilePath = await win.service.wiki.getTiddlerFilePath(viewingTiddler);
      let matchFound = false;
      if (absoluteFilePath) {
         // Normalize paths to forward slashes for comparison
         const normalize = (p: string) => p.replace(/\\/g, '/');
         const folder = normalize(wikiFolderLocation!);
         const relativePath = normalize(absoluteFilePath).replace(folder, '').replace(/^\//, '');
         
         const match = files.find(f => normalize(f.path) === relativePath);
         
         if (match) {
             console.log('[SCM] Auto-selecting file:', match.path);
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
      console.error('[SCM] Error loading files:', error);
      console.error('[SCM] Error details:', {
        message: error?.message,
        stack: error?.stack,
        commitHash,
        wikiFolderLocation
      });
    } finally {
      $tw.wiki.setText('$:/state/scm/loading-files', 'text', undefined, 'no');
    }
  });

  $tw.rootWidget.addEventListener('tm-scm-load-working-copy', async (event) => {
    const filePath = event.param;
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');

    if (!filePath || !viewingTiddler) return;

    $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, filePath);
    $tw.wiki.setText('$:/state/scm/loading-content', 'text', undefined, 'yes');

    try {
      // For working copy, use the current tiddler content
      const originalTitle = getTiddlerTitle(filePath);
      const currentTiddler = $tw.wiki.getTiddler(originalTitle);
      
      if (!currentTiddler) {
        throw new Error(`Tiddler not found: ${originalTitle}`);
      }
      
      const content = currentTiddler.fields.text || '';
      
      // Parse fields from the tiddler - preserve TiddlyWiki date format
      const fields: Record<string, string> = {};
      Object.keys(currentTiddler.fields).forEach(key => {
        if (key !== 'text' && key !== 'title') {
          const value = currentTiddler.fields[key];
          // Keep string values as-is (they're already in TiddlyWiki format)
          if (typeof value === 'string') {
            fields[key] = value;
          }
          // Convert Date objects to TiddlyWiki format (YYYYMMDDhhmmssSSS)
          else if (value instanceof Date) {
            fields[key] = $tw.utils.stringifyDate(value);
          }
          // For other types, convert to string without JSON encoding
          else if (value !== undefined && value !== null) {
            fields[key] = String(value);
          }
        }
      });

      const tempTitle = `$:/temp/source-control-management/${viewingTiddler}/file-content`;
      
      $tw.wiki.addTiddler({
        title: tempTitle,
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
  });

  $tw.rootWidget.addEventListener('tm-scm-load-content', async (event) => {
    const filePath = event.param;
    const commitHash = $tw.wiki.getTiddlerText('$:/state/scm/selected-commit');
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    const workspace = win?.meta?.()?.workspace;
    const wikiFolderLocation = workspace?.wikiFolderLocation;

    if (!filePath || !commitHash || !wikiFolderLocation || !viewingTiddler) return;

    $tw.wiki.setText('$:/state/scm/selected-file', 'text', undefined, filePath);
    $tw.wiki.setText('$:/state/scm/loading-content', 'text', undefined, 'yes');

    try {
      const result = await win.service.git.callGitOp(
          'getFileContent',
          wikiFolderLocation!,
          commitHash,
          filePath,
      );
      const content = result.content;

      // Parse .tid file format: fields separated by newlines, empty line before text
      let fields: Record<string, string> = {};
      let textContent = content;
      
      if (filePath.endsWith('.tid')) {
        const lines = content.split('\n');
        let i = 0;
        
        // Parse fields (key: value format)
        while (i < lines.length) {
          const line = lines[i];
          if (line.trim() === '') {
            // Empty line marks end of fields
            i++;
            break;
          }
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            fields[key] = value;
          }
          i++;
        }
        
        // Rest is text content
        textContent = lines.slice(i).join('\n');
      }

      const tempTitle = `$:/temp/source-control-management/${viewingTiddler}/file-content`;
      const originalTitle = getTiddlerTitle(filePath);
      const currentTiddler = $tw.wiki.getTiddler(originalTitle);
      const currentContent = currentTiddler?.fields.text || '';
      
      $tw.wiki.addTiddler({
        title: tempTitle,
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

  $tw.rootWidget.addEventListener('tm-scm-apply-content', (event) => {
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return;
    
    const tempTitle = `$:/temp/source-control-management/${viewingTiddler}/file-content`;
    const tempTiddler = $tw.wiki.getTiddler(tempTitle);
    if (!tempTiddler) return;

    const originalTitle = tempTiddler.fields['scm-original-title'];
    if (typeof originalTitle === 'string' && originalTitle) {
      const confirmMessage = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/language/zh-Hans/FileContent/ApplyConfirm') 
        || $tw.wiki.getTiddlerText('$:/plugins/linonetwo/source-control-management/language/en-GB/FileContent/ApplyConfirm')
        || 'Are you sure you want to apply this historical version? This will replace the current content.';
      if (!confirm(confirmMessage)) return;

      const existing = $tw.wiki.getTiddler(originalTitle);
      $tw.wiki.addTiddler({
        ...existing?.fields,
        title: originalTitle,
        text: tempTiddler.fields.text,
        modified: new Date(),
      });

      const story = new $tw.Story();
      story.addToStory(originalTitle, '$:/StoryList');
      story.addToHistory(originalTitle);
    }
    return true;
  });

  // Auto-select first commit after reload
  $tw.rootWidget.addEventListener('tm-scm-auto-select-first-commit', async (event) => {
    // Wait a bit for the commits to be loaded
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const viewingTiddler = $tw.wiki.getTiddlerText('$:/state/scm/viewing-tiddler');
    if (!viewingTiddler) return;
    
    const commitsTitle = `$:/temp/source-control-management/${viewingTiddler}/commits`;
    const commitsList = $tw.wiki.getTiddlerList(commitsTitle);
    
    if (commitsList && commitsList.length > 0) {
      const firstCommit = commitsList[0];
      console.log('[SCM] Auto-selecting first commit:', firstCommit);
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
