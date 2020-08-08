# plugins

Plugins developed for a better TiddlyGit.

## About

### Watch-FS

"linonetwo/watch-fs"

This plugin enables TiddlyWiki to watch the change in your disk, and if you edit one of your tiddler using editor likes VSCode and save it on the disk, the change will immediately reflected in the browser.

This by default monitor `./tiddlers` folder, if you have a different setup like my [linonetwo/wiki](https://github.com/linonetwo/wiki), add a `watchFolder` config to your `tiddlywiki.info`:

```json
{
  ...
  "themes": [
    "tiddlywiki/vanilla",
    "linonetwo/itonnote"
  ],
  ...
  "config": {
    "watchFolder": "./Meme-of-LinOnetwo/tiddlers"
  },
```

See [Jermolene/TiddlyWiki5/issues/3060](https://github.com/Jermolene/TiddlyWiki5/issues/3060) for related discussions.

Server side only. But also change the `SyncPollingInterval.tid` in the client side.

### Prevent-Edit

"linonetwo/prevent-edit"

Prevent `This page is asking you to confirm that you want to leave - data you have entered may not be saved` to popup.

Client side only.

### Service-Worker

"linonetwo/service-worker"

Needs additional setup, see plugin folder for details, only use it if you are an experienced web developer...

Client side only.

### Copy On Select

"linonetwo/copy-on-select"

When you select a string in your wiki, it will be copied automatically!

Client side only.

### Inverse Link And Folder

"linonetwo/inverse-link-and-folder"

Yet another bidirectional-link plugin.

![Inverse Link And Folder Screenshot](./docs/img/inverse-link-and-folder.png)

Client side only.

### Opened Tiddlers Bar

"linonetwo/opened-tiddlers-bar"

A VSCode style "opened tiddler" bar on the top of the wiki.

![Opened Tiddlers Bar Screenshot](./docs/img/opened-tiddlers-bar.png)

Client side only.

## How to use

Place the plugin like this:

![Folder Structure](./docs/img/folder-structure.png)

And update your `tiddlywiki.info`, pick what you need:

```json
{
  "description": ".....",
  "plugins": [
    "linonetwo/service-worker",
    "linonetwo/opened-tiddlers-bar",
    "linonetwo/inverse-link-and-folder",
    "linonetwo/copy-on-select",
    "linonetwo/prevent-edit",
    "linonetwo/watch-fs"
  ],
  "themes": ["tiddlywiki/vanilla", "linonetwo/itonnote"],
  "languages": ["zh-Hans"]
}
```
