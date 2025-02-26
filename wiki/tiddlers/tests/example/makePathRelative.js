describe('Path utils tests', function() {
  const makePathRelative = require('$:/plugins/linonetwo/tidgi-external-attachments/startup.js').makePathRelative;
  
  it('should exist', function() {
    expect(makePathRelative).toBeDefined();
  });

  it('should make path relative', function() {
    function test(sourcepath, rootpath, result, options) {
      const actualResult = makePathRelative(sourcepath, rootpath, options);
      expect(actualResult).toBe(result);
    }

    test("/Users/me/something/file.png", "/Users/you/something/index.html", "../../me/something/file.png");
    test("/Users/me/something/file.png", "/Users/you/something/index.html", "/Users/me/something/file.png", { useAbsoluteForNonDescendents: true });
    test("/Users/me/something/else/file.png", "/Users/me/something/index.html", "else/file.png");
    test("/Users/me/something/file.png", "/Users/me/something/new/index.html", "../file.png");
    test("/Users/me/something/file.png", "/Users/me/something/new/index.html", "/Users/me/something/file.png", { useAbsoluteForNonDescendents: true });
    test("/Users/me/something/file.png", "/Users/me/something/index.html", "file.png");
    test("/Users/jeremyruston/Downloads/Screenshot 2020-10-18 at 15.33.40.png", "/Users/jeremyruston/git/Jermolene/TiddlyWiki5/editions/prerelease/output/index.html", "../../../../../../Downloads/Screenshot%202020-10-18%20at%2015.33.40.png");
    test("/Users/me/nothing/image.png", "/Users/me/something/a/b/c/d/e/index.html", "../../../../../../nothing/image.png");
    test("C:\\Users\\me\\something\\file.png", "/C:/Users/me/something/index.html", "file.png", { isWindows: true });
    test("\\\\SHARE\\Users\\me\\something\\file.png", "/SHARE/Users/me/somethingelse/index.html", "../something/file.png", { isWindows: true });
    test("\\\\SHARE\\Users\\me\\something\\file.png", "/C:/Users/me/something/index.html", "/SHARE/Users/me/something/file.png", { isWindows: true });
  });
});
