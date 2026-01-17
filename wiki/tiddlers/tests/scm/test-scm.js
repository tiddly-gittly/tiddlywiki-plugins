/* eslint-disable @typescript-eslint/no-explicit-any */
describe('SCM Plugin Logic', function() {
  // Mock window.service and window.meta
  const mockGitOp = jasmine.createSpy('callGitOp');
  const mockGetTiddlerFilePath = jasmine.createSpy('getTiddlerFilePath');
  const mockWorkspace = { wikiFolderLocation: '/path/to/wiki' };

  beforeAll(() => {
    // 1. Setup Mock Window on $tw for TiddlyWiki Sandbox compatibility
    // Since 'global' and 'window' are hidden in the sandbox, we attach to $tw.
    $tw.mockWindow = {};
    const win = $tw.mockWindow;
    
    win.service = win.service || {};
    win.service.git = { callGitOp: mockGitOp };
    win.service.wiki = { getTiddlerFilePath: mockGetTiddlerFilePath };
    win.meta = () => ({ workspace: mockWorkspace });

    // 2. Mock $tw.browser and manually trigger startup
    const originalBrowser = $tw.browser;
    $tw.browser = true;
    
    try {
        const startupModule = require('$:/plugins/linonetwo/source-control-management/startup.js');
        if (startupModule && typeof startupModule.startup === 'function') {
            startupModule.startup();
        }
    } catch (e) {
        console.error('Failed to load or run startup module', e);
    } finally {
        // Restore browser state to avoid core crashing on missing document
        $tw.browser = originalBrowser;
    }
  });
  
  beforeEach(() => {
     mockGitOp.calls.reset();
     mockGetTiddlerFilePath.calls.reset();
     $tw.wiki.deleteTiddler('$:/state/scm/viewing-tiddler');
     $tw.wiki.deleteTiddler('$:/temp/source-control-management/TestTiddler/commits');
  });

  it('tm-scm-reload should fetch git log and create commit tiddlers', async function() {
    // 1. Setup State
    $tw.wiki.addTiddler({ title: '$:/state/scm/viewing-tiddler', text: 'TestTiddler' });
    
    // 2. Mock API Returns
    mockGetTiddlerFilePath.and.returnValue(Promise.resolve('/path/to/wiki/tiddlers/TestTiddler.tid'));
    mockGitOp.and.returnValue(Promise.resolve({
      entries: [
        { hash: 'hash1', message: 'commit 1', author: { name: 'User' }, committerDate: '2023-01-01' },
         { hash: 'hash2', message: 'commit 2', author: { name: 'User' }, committerDate: '2023-01-02' }
      ],
      totalCount: 2
    }));

    // 3. Trigger Event
    $tw.rootWidget.dispatchEvent({ type: 'tm-scm-reload' });
    
    // 4. Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));

    // 5. Assertions
    expect(mockGetTiddlerFilePath).toHaveBeenCalledWith('TestTiddler');
    expect(mockGitOp).toHaveBeenCalledWith('getGitLog', '/path/to/wiki', jasmine.objectContaining({
        filePath: 'tiddlers/TestTiddler.tid'
    }));

    const commitsTiddler = $tw.wiki.getTiddler('$:/temp/source-control-management/TestTiddler/commits');
    expect(commitsTiddler).toBeDefined();
    expect(commitsTiddler.fields.list).toEqual(['hash1', 'hash2']);

    const commit1 = $tw.wiki.getTiddler('$:/temp/source-control-management/TestTiddler/commit/hash1');
    expect(commit1.fields.text).toBe('commit 1');
  });

  it('tm-scm-load-files should fetch files and create file tiddlers', async function() {
     // 1. Setup State
    $tw.wiki.addTiddler({ title: '$:/state/scm/viewing-tiddler', text: 'TestTiddler' });

    // 2. Mock API
    mockGitOp.and.returnValue(Promise.resolve([
        { path: 'tiddlers/TestTiddler.tid', status: 'modified' },
        { path: 'other.txt', status: 'added' }
    ]));

    // 3. Trigger Event
    $tw.rootWidget.dispatchEvent({ type: 'tm-scm-load-files', param: 'hash1' });

    // 4. Wait
    await new Promise(resolve => setTimeout(resolve, 200));

    // 5. Assertions
    expect(mockGitOp).toHaveBeenCalledWith('getCommitFiles', '/path/to/wiki', 'hash1');

    const filesTiddler = $tw.wiki.getTiddler('$:/temp/source-control-management/TestTiddler/files');
    expect(filesTiddler).toBeDefined();
    expect(filesTiddler.fields.list.length).toBe(2);

    const file1 = $tw.wiki.getTiddler('$:/temp/source-control-management/TestTiddler/file/tiddlers%2FTestTiddler.tid');
    expect(file1).toBeDefined();
    expect(file1.fields.text).toBe('tiddlers/TestTiddler.tid');
  });

  it('Debug Mode should use mock data without calling Git API', async function() {
      // 1. Enable Debug Mode
      $tw.wiki.addTiddler({ title: '$:/plugins/linonetwo/source-control-management/configs/debug', text: 'yes' });
      $tw.wiki.addTiddler({ title: '$:/state/scm/viewing-tiddler', text: 'TestTiddler' });

      // 2. Trigger Reload
      $tw.rootWidget.dispatchEvent({ type: 'tm-scm-reload' });
      await new Promise(resolve => setTimeout(resolve, 600)); // Wait for mock delay (500ms)

      // 3. Assert Git API NOT called
      expect(mockGitOp).not.toHaveBeenCalledWith('getGitLog', jasmine.anything(), jasmine.anything());

      // 4. Assert Mock Commits created
      const commitsTiddler = $tw.wiki.getTiddler('$:/temp/source-control-management/TestTiddler/commits');
      expect(commitsTiddler).toBeDefined();
      expect(commitsTiddler.fields.list).toContain('mock1');
      expect(commitsTiddler.fields.list).toContain('mock2');

      // 5. Trigger Load Files for Mock Commit
      $tw.rootWidget.dispatchEvent({ type: 'tm-scm-load-files', param: 'mock1' });
      await new Promise(resolve => setTimeout(resolve, 600)); // Wait for mock delay

      // 6. Assert Git API NOT called for files
      expect(mockGitOp).not.toHaveBeenCalledWith('getCommitFiles', jasmine.anything(), jasmine.anything());
      
      const filesTiddler = $tw.wiki.getTiddler('$:/temp/source-control-management/TestTiddler/files');
      expect(filesTiddler.fields.list.length).toBeGreaterThan(0);
      
      // Cleanup
      $tw.wiki.deleteTiddler('$:/plugins/linonetwo/source-control-management/configs/debug');
  });
});
