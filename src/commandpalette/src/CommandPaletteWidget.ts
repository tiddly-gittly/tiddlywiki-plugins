const Widget = require('$:/core/modules/widgets/widget.js').widget;

class CommandPaletteWidget extends Widget {
  constructor(parseTreeNode: any, options: any) {
    super(parseTreeNode, options);
    this.initialise(parseTreeNode, options);
    this.currentSelection = 0; //0 is nothing selected, 1 is first result,...
    this.symbolProviders = {};
    this.actions = [];
    this.triggers = [];
    this.blockProviderChange = false;
    this.defaultSettings = {
      maxResults: 15,
      maxResultHintSize: 45,
      neverBasic: false,
      showHistoryOnOpen: true,
      escapeGoesBack: true,
      alwaysPassSelection: true,
      theme: '$:/plugins/linonetwo/commandpalette/Compact.css',
    };
    this.settings = {};
    this.commandHistoryPath = '$:/plugins/linonetwo/commandpalette/CommandPaletteHistory';
    this.settingsPath = '$:/plugins/linonetwo/commandpalette/CommandPaletteSettings';
    this.searchStepsPath = '$:/plugins/linonetwo/commandpalette/CommandPaletteSearchSteps';
    this.customCommandsTag = '$:/tags/CommandPaletteCommand';
    this.themesTag = '$:/tags/CommandPaletteTheme';
    this.typeField = 'command-palette-type';
    /** 用于搜索的字段 */
    this.nameField = 'command-palette-name';
    /** 用于展示翻译内容的字段 */
    this.captionField = 'command-palette-caption';
    this.hintField = 'command-palette-hint';
    this.modeField = 'command-palette-mode';
    this.userInputField = 'command-palette-user-input';
    this.caretField = 'command-palette-caret';
    this.immediateField = 'command-palette-immediate';
    this.triggerField = 'command-palette-trigger';
  }

  actionStringBuilder(text: any) {
    return (e: any) => this.invokeActionString(text, this, e);
  }

  actionStringInput(action: any, hint: any, e: any) {
    this.blockProviderChange = true;
    this.allowInputFieldSelection = true;
    this.hint.innerText = hint;
    this.input.value = '';
    this.currentProvider = () => {};
    this.currentResolver = (e: any) => {
      this.invokeActionString(action, this, e, { commandpaletteinput: this.input.value });
      this.closePalette();
    };
    this.showResults([]);
    this.onInput(this.input.value);
  }

  invokeFieldMangler(tiddler: any, message: any, param: any, e: any) {
    let action = `<$fieldmangler tiddler="${tiddler}">
			<$action-sendmessage $message="${message}" $param="${param}"/>
			</$fieldmangler>`;
    this.invokeActionString(action, this, e);
  }

  //filter = (tiddler, terms) => [tiddlers]
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  tagOperation(e, hintTiddler, hintTag, filter, allowNoSelection, message) {
    this.blockProviderChange = true;
    if (allowNoSelection) this.allowInputFieldSelection = true;
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    this.currentProvider = this.historyProviderBuilder(hintTiddler);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.currentResolver = (e) => {
      if (this.currentSelection === 0) return;
      let tiddler = this.currentResults[this.currentSelection - 1].result.name;
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
      this.currentProvider = (terms) => {
        this.currentSelection = 0;
        this.hint.innerText = hintTag;
        let searches = filter(tiddler, terms);
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 's' implicitly has an 'any' type.
        searches = searches.map((s) => {
          return { name: s };
        });
        this.showResults(searches);
      };
      this.input.value = '';
      this.onInput(this.input.value);
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      this.currentResolver = (e) => {
        if (!allowNoSelection && this.currentSelection === 0) return;
        let tag = this.input.value;
        if (this.currentSelection !== 0) {
          tag = this.currentResults[this.currentSelection - 1].result.name;
        }
        this.invokeFieldMangler(tiddler, message, tag, e);
        if (!e.getModifierState('Shift')) {
          this.closePalette();
        } else {
          this.onInput(this.input.value);
        }
      };
    };
    this.input.value = '';
    this.onInput(this.input.value);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  refreshThemes(e) {
    this.themes = this.getTiddlersWithTag(this.themesTag);
    let found = false;
    for (let theme of this.themes) {
      let themeName = theme.fields.title;
      if (themeName === this.settings.theme) {
        found = true;
        this.addTagIfNecessary(themeName, '$:/tags/Stylesheet', e);
      } else {
        this.invokeFieldMangler(themeName, 'tm-remove-tag', '$:/tags/Stylesheet', e);
      }
    }
    if (found) return;
    this.addTagIfNecessary(this.defaultSettings.theme, '$:/tags/Stylesheet', e);
  }

  //Re-adding an existing tag changes modification date
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tiddler' implicitly has an 'any' type.
  addTagIfNecessary(tiddler, tag, e) {
    if (this.hasTag(tiddler, tag)) return;
    this.invokeFieldMangler(tiddler, 'tm-add-tag', tag, e);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tiddler' implicitly has an 'any' type.
  hasTag(tiddler, tag) {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    return $tw.wiki.getTiddler(tiddler).fields.tags.includes(tag);
  }

  refreshCommands() {
    this.actions = [];
    this.actions.push({
      name: 'Refresh Command Palette',
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      action: (e) => {
        this.refreshCommandPalette();
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
        this.promptCommand('');
      },
      keepPalette: true,
    });
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.actions.push({ name: 'Explorer', action: (e) => this.explorer(e), keepPalette: true });
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.actions.push({ name: 'See History', action: (e) => this.showHistory(e), keepPalette: true });
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.actions.push({ name: 'New Command Wizard', action: (e) => this.newCommandWizard(e), keepPalette: true });
    this.actions.push({
      name: 'Add tag to tiddler',
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      action: (e) =>
        this.tagOperation(
          e,
          'Pick tiddler to tag',
          'Pick tag to add (⇧⏎ to add multiple)',
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tiddler' implicitly has an 'any' type.
          (tiddler, terms) => $tw.wiki.filterTiddlers(`[!is[system]tags[]] [is[system]tags[]] -[[${tiddler}]tags[]] +[search[${terms}]]`),
          true,
          'tm-add-tag',
        ),
      keepPalette: true,
    });
    this.actions.push({
      name: 'Remove tag',
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      action: (e) =>
        this.tagOperation(
          e,
          'Pick tiddler to untag',
          'Pick tag to remove (⇧⏎ to remove multiple)',
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tiddler' implicitly has an 'any' type.
          (tiddler, terms) => $tw.wiki.filterTiddlers(`[[${tiddler}]tags[]] +[search[${terms}]]`),
          false,
          'tm-remove-tag',
        ),
      keepPalette: true,
    });

    let commandTiddlers = this.getTiddlersWithTag(this.customCommandsTag);
    for (let tiddler of commandTiddlers) {
      if (!tiddler.fields[this.typeField] === undefined) continue;
      let name = tiddler.fields[this.nameField];
      let caption = tiddler.fields[this.captionField];
      let type = tiddler.fields[this.typeField];
      let text = tiddler.fields.text;
      if (text === undefined) text = '';
      let textFirstLine = text.match(/^.*/)[0];
      let hint = tiddler.fields[this.hintField];
      if (hint === undefined) hint = tiddler.fields[this.nameField];
      if (hint === undefined) hint = '';
      if (type === 'shortcut') {
        ``;
        let trigger = tiddler.fields[this.triggerField];
        if (trigger === undefined) continue;
        this.triggers.push({ name, caption, trigger, text, hint });
        continue;
      }
      if (!tiddler.fields[this.nameField] === undefined) continue;
      if (type === 'prompt') {
        let immediate = !!tiddler.fields[this.immediateField];
        let caret = tiddler.fields[this.caretField];
        let action = { name, caption, hint, action: () => this.promptCommand(textFirstLine, caret), keepPalette: !immediate, immediate: immediate };
        this.actions.push(action);
        continue;
      }
      if (type === 'prompt-basic') {
        let caret = tiddler.fields[this.caretField];
        let action = { name, caption, hint, action: () => this.promptCommandBasic(textFirstLine, caret, hint), keepPalette: true };
        this.actions.push(action);
        continue;
      }
      if (type === 'message') {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
        this.actions.push({ name, caption, hint, action: (e) => this.tmMessageBuilder(textFirstLine)(e) });
        continue;
      }
      if (type === 'actionString') {
        let userInput = tiddler.fields[this.userInputField] !== undefined && tiddler.fields[this.userInputField] === 'true';
        if (userInput) {
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
          this.actions.push({ name, caption, hint, action: (e) => this.actionStringInput(text, hint, e), keepPalette: true });
        } else {
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
          this.actions.push({ name, caption, hint, action: (e) => this.actionStringBuilder(text)(e) });
        }
        continue;
      }
      if (type === 'history') {
        let mode = tiddler.fields[this.modeField];
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
        this.actions.push({ name, caption, hint, action: (e) => this.commandWithHistoryPicker(textFirstLine, hint, mode).handler(e), keepPalette: true });
        continue;
      }
    }
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'caption' implicitly has an 'any' type.
  translateCaption(caption) {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    return $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', caption);
  }

  newCommandWizard() {
    this.blockProviderChange = true;
    this.input.value = '';
    this.hint.innerText = 'Command Name';
    let name = '';
    let type = '';
    let hint = '';

    let messageStep = () => {
      this.input.value = '';
      this.hint.innerText = 'Enter Message';
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      this.currentResolver = (e) => {
        this.tmMessageBuilder('tm-new-tiddler', {
          title: '$:/' + name,
          tags: this.customCommandsTag,
          [this.typeField]: type,
          [this.nameField]: name,
          [this.hintField]: hint,
          text: this.input.value,
        })(e);
        this.closePalette();
      };
    };

    let hintStep = () => {
      this.input.value = '';
      this.hint.innerText = 'Enter hint';
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      this.currentResolver = (e) => {
        hint = this.input.value;
        messageStep();
      };
    };

    let typeStep = () => {
      this.input.value = '';
      this.hint.innerText = 'Enter type (prompt, prompt-basic, message, actionString, history)';
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      this.currentResolver = (e) => {
        type = this.input.value;
        if (type === 'history') {
          hintStep();
        } else {
          this.tmMessageBuilder('tm-new-tiddler', {
            title: '$:/' + name,
            tags: this.customCommandsTag,
            [this.typeField]: type,
            [this.nameField]: name,
          })(e);
          this.closePalette();
        }
      };
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.currentProvider = (terms) => {};
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.currentResolver = (e) => {
      if (this.input.value.length === 0) return;
      name = this.input.value;
      typeStep();
    };
    this.showResults([]);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  explorer(e) {
    this.blockProviderChange = true;
    this.input.value = '$:/';
    this.lastExplorerInput = '$:/';
    this.hint.innerText = 'Explorer (⇧⏎ to add multiple)';
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.currentProvider = (terms) => this.explorerProvider('$:/', terms);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.currentResolver = (e) => {
      if (this.currentSelection === 0) return;
      this.currentResults[this.currentSelection - 1].result.action(e);
    };
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
    this.onInput();
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'url' implicitly has an 'any' type.
  explorerProvider(url, terms) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'url' implicitly has an 'any' type.
    let switchFolder = (url) => {
      this.input.value = url;
      this.lastExplorerInput = this.input.value;
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
      this.currentProvider = (terms) => this.explorerProvider(url, terms);
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
      this.onInput();
    };
    if (!this.input.value.startsWith(url)) {
      this.input.value = this.lastExplorerInput;
    }
    this.lastExplorerInput = this.input.value;
    this.currentSelection = 0;
    let search = this.input.value.substr(url.length);
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    let tiddlers = $tw.wiki.filterTiddlers(`[removeprefix[${url}]splitbefore[/]sort[]search[${search}]]`);
    let folders = [];
    let files = [];
    for (let tiddler of tiddlers) {
      if (tiddler.endsWith('/')) {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
        folders.push({ name: tiddler, action: (e) => switchFolder(`${url}${tiddler}`) });
      } else {
        files.push({
          name: tiddler,
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
          action: (e) => {
            this.navigateTo(`${url}${tiddler}`);
            if (!e.getModifierState('Shift')) {
              this.closePalette();
            }
          },
        });
      }
    }
    let topResult;
    if (url !== '$:/') {
      let splits = url.split('/');
      splits.splice(splits.length - 2);
      let parent = splits.join('/') + '/';
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      topResult = { name: '..', action: (e) => switchFolder(parent) };
      this.showResults([topResult, ...folders, ...files]);
      return;
    }
    this.showResults([...folders, ...files]);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
  setSetting(name, value) {
    //doing the validation here too (it's also done in refreshSettings, so you can load you own settings with a json file)
    if (typeof value === 'string') {
      if (value === 'true') value = true;
      if (value === 'false') value = false;
    }
    this.settings[name] = value;
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    $tw.wiki.setTiddlerData(this.settingsPath, this.settings);
  }

  //loadSettings?
  refreshSettings() {
    //get user or default settings
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    this.settings = $tw.wiki.getTiddlerData(this.settingsPath, { ...this.defaultSettings });
    //Adding eventual missing properties to current user settings
    for (let prop in this.defaultSettings) {
      if (!this.defaultSettings.hasOwnProperty(prop)) continue;
      if (this.settings[prop] === undefined) {
        this.settings[prop] = this.defaultSettings[prop];
      }
    }
    //cast all booleans
    for (let prop in this.settings) {
      if (!this.settings.hasOwnProperty(prop)) continue;
      if (typeof this.settings[prop] !== 'string') continue;
      if (this.settings[prop].toLowerCase() === 'true') this.settings[prop] = true;
      if (this.settings[prop].toLowerCase() === 'false') this.settings[prop] = false;
    }
  }

  //helper function to retrieve all tiddlers (+ their fields) with a tag
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tag' implicitly has an 'any' type.
  getTiddlersWithTag(tag) {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    let tiddlers = $tw.wiki.getTiddlersWithTag(tag);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 't' implicitly has an 'any' type.
    return tiddlers.map((t) => $tw.wiki.getTiddler(t));
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'parent' implicitly has an 'any' type.
  render(parent, nextSibling) {
    this.parentDomNode = parent;
    this.execute();
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    this.history = $tw.wiki.getTiddlerData(this.commandHistoryPath, { history: [] }).history;

    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    $tw.rootWidget.addEventListener('open-command-palette', (e) => this.openPalette(e));
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    $tw.rootWidget.addEventListener('open-command-palette-selection', (e) => this.openPaletteSelection(e));
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    $tw.rootWidget.addEventListener('insert-command-palette-result', (e) => this.insertSelectedResult(e));

    // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
    let inputAndMainHintWrapper = this.createElement('div', { className: 'inputhintwrapper' });
    this.div = this.createElement('div', { className: 'commandpalette' }, { display: 'none' });
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
    this.input = this.createElement('input', { type: 'text' });
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
    this.hint = this.createElement('div', { className: 'commandpalettehint commandpalettehintmain' });
    inputAndMainHintWrapper.append(this.input, this.hint);
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
    this.scrollDiv = this.createElement('div', { className: 'cp-scroll' });
    this.div.append(inputAndMainHintWrapper, this.scrollDiv);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.input.addEventListener('input', () => this.onInput(this.input.value));
    window.addEventListener('click', (e) => this.onClick(e));
    parent.insertBefore(this.div, nextSibling);

    this.refreshCommandPalette();

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.symbolProviders['>'] = { searcher: (terms) => this.actionProvider(terms), resolver: (e) => this.actionResolver(e) };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.symbolProviders['#'] = { searcher: (terms) => this.tagListProvider(terms), resolver: (e) => this.tagListResolver(e) };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.symbolProviders['@'] = { searcher: (terms) => this.tagProvider(terms), resolver: (e) => this.defaultResolver(e) };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.symbolProviders['?'] = { searcher: (terms) => this.helpProvider(terms), resolver: (e) => this.helpResolver(e) };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.symbolProviders['['] = { searcher: (terms, hint) => this.filterProvider(terms, hint), resolver: (e) => this.filterResolver(e) };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.symbolProviders['+'] = { searcher: (terms) => this.createTiddlerProvider(terms), resolver: (e) => this.createTiddlerResolver() };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.symbolProviders['|'] = { searcher: (terms) => this.settingsProvider(terms), resolver: (e) => this.settingsResolver() };
    this.currentResults = [];
    this.currentProvider = {};
  }

  refreshSearchSteps() {
    this.searchSteps = [];
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    let steps = $tw.wiki.getTiddlerData(this.searchStepsPath);
    steps = steps.steps;
    for (let step of steps) {
      this.searchSteps.push(this.searchStepBuilder(step.filter, step.caret, step.hint));
    }
  }

  refreshCommandPalette() {
    this.refreshSettings();
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
    this.refreshThemes();
    this.refreshCommands();
    this.refreshSearchSteps();
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'command' implicitly has an 'any' type.
  updateCommandHistory(command) {
    this.history = Array.from(new Set([command.name, ...this.history]));
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    $tw.wiki.setTiddlerData(this.commandHistoryPath, { history: this.history });
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'hint' implicitly has an 'any' type.
  historyProviderBuilder(hint, mode) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    return (terms) => {
      this.currentSelection = 0;
      this.hint.innerText = hint;
      let results;
      if (mode !== undefined && mode === 'drafts') {
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
        results = $tw.wiki.filterTiddlers('[has:field[draft.of]]');
      } else if (mode !== undefined && mode === 'story') {
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
        results = $tw.wiki.filterTiddlers('[list[$:/StoryList]]');
      } else {
        results = this.getHistory();
      }
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'r' implicitly has an 'any' type.
      results = results.map((r) => {
        return { name: r };
      });
      this.showResults(results);
    };
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
  commandWithHistoryPicker(message, hint, mode) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    let handler = (e) => {
      this.blockProviderChange = true;
      this.allowInputFieldSelection = true;
      this.currentProvider = provider;
      this.currentResolver = resolver;
      this.input.value = '';
      this.onInput(this.input.value);
    };
    let provider = this.historyProviderBuilder(hint, mode);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    let resolver = (e) => {
      if (this.currentSelection === 0) return;
      let title = this.currentResults[this.currentSelection - 1].result.name;
      this.parentWidget.dispatchEvent({
        type: message,
        param: title,
        tiddlerTitle: title,
      });
      this.closePalette();
    };
    return {
      handler,
      provider,
      resolver,
    };
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'text' implicitly has an 'any' type.
  onInput(text) {
    if (this.blockProviderChange) {
      //prevent provider changes
      this.currentProvider(text);
      this.setSelectionToFirst();
      return;
    }
    let { resolver, provider, terms } = this.parseCommand(text);
    this.currentResolver = resolver;
    this.currentProvider = provider;
    this.currentProvider(terms);
    this.setSelectionToFirst();
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'text' implicitly has an 'any' type.
  parseCommand(text) {
    let terms = '';
    let prefix = text.substr(0, 1);
    let resolver;
    let provider;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 't' implicitly has an 'any' type.
    let shortcut = this.triggers.find((t) => text.startsWith(t.trigger));
    if (shortcut !== undefined) {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
      resolver = (e) => {
        let inputWithoutShortcut = this.input.value.substr(shortcut.trigger.length);
        this.invokeActionString(shortcut.text, this, e, { commandpaletteinput: inputWithoutShortcut });
        this.closePalette();
      };
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
      provider = (terms) => {
        this.hint.innerText = shortcut.hint;
        this.showResults([]);
      };
    } else {
      let providerSymbol = Object.keys(this.symbolProviders).find((p) => p === prefix);
      if (providerSymbol === undefined) {
        resolver = this.defaultResolver;
        provider = this.defaultProvider;
        terms = text;
      } else {
        provider = this.symbolProviders[providerSymbol].searcher;
        resolver = this.symbolProviders[providerSymbol].resolver;
        terms = text.substring(1);
      }
    }
    return { resolver, provider, terms };
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  onClick(e) {
    if (this.isOpened && !this.div.contains(e.target)) {
      this.closePalette();
    }
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  openPaletteSelection(e) {
    let selection = this.getCurrentSelection();
    e.param = selection;
    this.openPalette(e);
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  openPalette(e) {
    this.isOpened = true;
    this.allowInputFieldSelection = false;
    this.goBack = undefined;
    this.blockProviderChange = false;
    let activeElement = this.getActiveElement();
    this.previouslyFocused = {
      element: activeElement,
      start: activeElement.selectionStart,
      end: activeElement.selectionEnd,
      caretPos: activeElement.selectionEnd,
    };
    this.input.value = '';
    if (e.param !== undefined) {
      this.input.value = e.param;
    }
    if (this.settings.alwaysPassSelection) {
      this.input.value += this.getCurrentSelection();
    }
    this.currentSelection = 0;
    this.onInput(this.input.value); //Trigger results on open
    this.div.style.display = 'flex';
    this.input.focus();
  }

  insertSelectedResult() {
    if (!this.isOpened) return;
    if (this.currentSelection === 0) return; //TODO: what to do here?
    let previous = this.previouslyFocused;
    let previousValue = previous.element.value;
    if (previousValue === undefined) return;
    let selection = this.currentResults[this.currentSelection - 1].result.name;
    if (previous.start !== previous.end) {
      this.previouslyFocused.element.value = previousValue.substring(0, previous.start) + selection + previousValue.substring(previous.end);
    } else {
      this.previouslyFocused.element.value = previousValue.substring(0, previous.start) + selection + previousValue.substring(previous.start);
    }
    this.previouslyFocused.caretPos = previous.start + selection.length;
    this.closePalette();
  }

  closePalette() {
    this.div.style.display = 'none';
    this.isOpened = false;
    this.focusAtCaretPosition(this.previouslyFocused.element, this.previouslyFocused.caretPos);
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  onKeyDown(e) {
    if (e.key === 'Escape') {
      //									\/ There's no previous state
      if (!this.settings.escapeGoesBack || this.goBack === undefined) {
        this.closePalette();
      } else {
        this.goBack();
        this.goBack = undefined;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      let sel = this.currentSelection - 1;

      if (sel === 0) {
        if (!this.allowInputFieldSelection) {
          sel = this.currentResults.length;
        }
      } else if (sel < 0) {
        sel = this.currentResults.length;
      }
      this.setSelection(sel);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      let sel = (this.currentSelection + 1) % (this.currentResults.length + 1);
      if (!this.allowInputFieldSelection && sel === 0 && this.currentResults.length !== 0) {
        sel = 1;
      }
      this.setSelection(sel);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.validateSelection(e);
    }
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'result' implicitly has an 'any' type.
  addResult(result, id) {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
    let resultDiv = this.createElement('div', { className: 'commandpaletteresult', innerText: this.translateCaption(result.caption || result.name) });
    if (result.hint !== undefined) {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
      let hint = this.createElement('div', { className: 'commandpalettehint', innerText: this.translateCaption(result.hint) });
      resultDiv.appendChild(hint);
    }
    resultDiv.result = result;
    this.currentResults.push(resultDiv);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    resultDiv.addEventListener('click', (e) => {
      this.setSelection(id + 1);
      this.validateSelection(e);
    });
    this.scrollDiv.appendChild(resultDiv);
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  validateSelection(e) {
    this.currentResolver(e);
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  defaultResolver(e) {
    if (e.getModifierState('Shift')) {
      this.input.value = '+' + this.input.value; //this resolver expects that the input starts with +
      this.createTiddlerResolver(e);
      return;
    }
    if (this.currentSelection === 0) return;
    let selectionTitle = this.currentResults[this.currentSelection - 1].result.name;
    this.closePalette();
    this.navigateTo(selectionTitle);
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'title' implicitly has an 'any' type.
  navigateTo(title) {
    this.parentWidget.dispatchEvent({
      type: 'tm-navigate',
      param: title,
      navigateTo: title,
    });
  }

  showHistory() {
    this.hint.innerText = 'History';
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.currentProvider = (terms) => {
      let results;
      if (terms.length === 0) {
        results = this.getHistory();
      } else {
        results = this.getHistory().filter((h) => (h as any).includes(terms));
      }
      results = results.map((r) => {
        return {
          name: r,
          action: () => {
            this.navigateTo(r);
            this.closePalette();
          },
        };
      });
      this.showResults(results);
    };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.currentResolver = (e) => {
      if (this.currentSelection === 0) return;
      this.currentResults[this.currentSelection - 1].result.action(e);
    };
    this.input.value = '';
    this.blockProviderChange = true;
    this.onInput(this.input.value);
  }

  setSelectionToFirst() {
    let sel = 1;
    if (this.allowInputFieldSelection || this.currentResults.length === 0) {
      sel = 0;
    }
    this.setSelection(sel);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'id' implicitly has an 'any' type.
  setSelection(id) {
    this.currentSelection = id;
    for (let i = 0; i < this.currentResults.length; i++) {
      let selected = this.currentSelection === i + 1;
      this.currentResults[i].className = selected ? 'commandpaletteresult commandpaletteresultselected' : 'commandpaletteresult';
    }
    if (this.currentSelection === 0) {
      this.scrollDiv.scrollTop = 0;
      return;
    }
    let scrollHeight = this.scrollDiv.offsetHeight;
    let scrollPos = this.scrollDiv.scrollTop;
    let selectionPos = this.currentResults[this.currentSelection - 1].offsetTop;
    let selectionHeight = this.currentResults[this.currentSelection - 1].offsetHeight;

    if (selectionPos < scrollPos || selectionPos >= scrollPos + scrollHeight) {
      //select the closest scrolling position showing the selection
      let a = selectionPos;
      let b = selectionPos - scrollHeight + selectionHeight;
      a = Math.abs(a - scrollPos);
      b = Math.abs(b - scrollPos);
      if (a < b) {
        this.scrollDiv.scrollTop = selectionPos;
      } else {
        this.scrollDiv.scrollTop = selectionPos - scrollHeight + selectionHeight;
      }
    }
  }

  getHistory() {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    let history = $tw.wiki.getTiddlerData('$:/HistoryList');
    if (history === undefined) {
      history = [];
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'x' implicitly has an 'any' type.
    history = [...history.reverse().map((x) => x.title), ...$tw.wiki.filterTiddlers('[list[$:/StoryList]]')];
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 't' implicitly has an 'any' type.
    return Array.from(new Set(history.filter((t) => this.tiddlerOrShadowExists(t))));
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'title' implicitly has an 'any' type.
  tiddlerOrShadowExists(title) {
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    return $tw.wiki.tiddlerExists(title) || $tw.wiki.isShadowTiddler(title);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  defaultProvider(terms) {
    this.hint.innerText = 'Search tiddlers (⇧⏎ to create)';
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'searches' implicitly has type 'any[]' in... Remove this comment to see the full error message
    let searches;
    if (terms.startsWith('\\')) terms = terms.substr(1);
    if (terms.length === 0) {
      if (this.settings.showHistoryOnOpen) {
        searches = this.getHistory().map((s) => {
          return { name: s, hint: 'history' };
        });
      } else {
        searches = [];
      }
    } else {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
      searches = this.searchSteps.reduce((a, c) => [...a, ...c(terms)], []);
      searches = Array.from(new Set(searches));
    }
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'searches' implicitly has an 'any[]' type... Remove this comment to see the full error message
    this.showResults(searches);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'filter' implicitly has an 'any' type.
  searchStepBuilder(filter, caret, hint) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    return (terms) => {
      let search = filter.substr(0, caret) + terms + filter.substr(caret);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
      let results = $tw.wiki.filterTiddlers(search).map((s) => {
        return { name: s, hint: hint };
      });
      return results;
    };
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  tagListProvider(terms) {
    this.currentSelection = 0;
    this.hint.innerText = 'Search tags';
    let searches;
    if (terms.length === 0) {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
      searches = $tw.wiki.filterTiddlers('[!is[system]tags[]][is[system]tags[]][all[shadows]tags[]]');
    } else {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
      searches = $tw.wiki.filterTiddlers(
        '[all[]tags[]!is[system]search[' + terms + ']][all[]tags[]is[system]search[' + terms + ']][all[shadows]tags[]search[' + terms + ']]',
      );
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 's' implicitly has an 'any' type.
    searches = searches.map((s) => {
      return { name: s };
    });
    this.showResults(searches);
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  tagListResolver(e) {
    if (this.currentSelection === 0) {
      let input = this.input.value.substr(1);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
      let exist = $tw.wiki.filterTiddlers('[tag[' + input + ']]');
      if (!exist) return;
      this.input.value = '@' + input;
      return;
    }
    let result = this.currentResults[this.currentSelection - 1];
    this.input.value = '@' + result.innerText;
    this.onInput(this.input.value);
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  tagProvider(terms) {
    this.currentSelection = 0;
    this.hint.innerText = 'Search tiddlers with @tag(s)';
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'searches' implicitly has type 'any[]' in... Remove this comment to see the full error message
    let searches = [];
    if (terms.length !== 0) {
      let { tags, searchTerms, tagsFilter } = this.parseTags(this.input.value);
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
      let taggedTiddlers = $tw.wiki.filterTiddlers(tagsFilter);

      if (taggedTiddlers.length !== 0) {
        if (tags.length === 1) {
          let tag = tags[0];
          let tagTiddlerExists = this.tiddlerOrShadowExists(tag);
          if (tagTiddlerExists && searchTerms.some((s) => tag.includes(s))) searches.push(tag);
        }
        searches = [...searches, ...taggedTiddlers];
      }
    }
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'searches' implicitly has an 'any[]' type... Remove this comment to see the full error message
    searches = searches.map((s) => {
      return { name: s };
    });
    this.showResults(searches);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'input' implicitly has an 'any' type.
  parseTags(input) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 's' implicitly has an 'any' type.
    let splits = input.split(' ').filter((s) => s !== '');
    let tags = [];
    let searchTerms = [];
    for (let i = 0; i < splits.length; i++) {
      if (splits[i].startsWith('@')) {
        tags.push(splits[i].substr(1));
        continue;
      }
      searchTerms.push(splits[i]);
    }
    let tagsFilter = `[all[tiddlers+system+shadows]${tags.reduce((a, c) => {
      return a + 'tag[' + c + ']';
    }, '')}]`;
    if (searchTerms.length !== 0) {
      tagsFilter = tagsFilter.substr(0, tagsFilter.length - 1); //remove last ']'
      tagsFilter += `search[${searchTerms.join(' ')}]]`;
    }
    return { tags, searchTerms, tagsFilter };
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  settingsProvider(terms) {
    this.currentSelection = 0;
    this.hint.innerText = 'Select the setting you want to change';
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    let isNumerical = (terms) => terms.length !== 0 && terms.match(/\D/gm) === null;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    let isBoolean = (terms) => terms.length !== 0 && terms.match(/(true\b)|(false\b)/gim) !== null;
    this.showResults([
      { name: 'Theme (currently ' + this.settings.theme.match(/[^\/]*$/) + ')', action: () => this.promptForThemeSetting() },
      this.settingResultBuilder('Max results', 'maxResults', 'Choose the maximum number of results', isNumerical, 'Error: value must be a positive integer'),
      this.settingResultBuilder(
        'Show history on open',
        'showHistoryOnOpen',
        'Chose whether to show the history when you open the palette',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Escape to go back',
        'escapeGoesBack',
        'Chose whether ESC should go back when possible',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Use selection as search query',
        'alwaysPassSelection',
        'Chose your current selection is passed to the command palette',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Never Basic',
        'neverBasic',
        'Chose whether to override basic prompts to show filter operation',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Field preview max size',
        'maxResultHintSize',
        'Choose the maximum hint length for field preview',
        isNumerical,
        'Error: value must be a positive integer',
      ),
    ]);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
  settingResultBuilder(name, settingName, hint, validator, errorMsg) {
    return { name: name + ' (currently ' + this.settings[settingName] + ')', action: () => this.promptForSetting(settingName, hint, validator, errorMsg) };
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  settingsResolver(e) {
    if (this.currentSelection === 0) return;
    this.goBack = () => {
      this.input.value = '|';
      this.blockProviderChange = false;
      this.onInput(this.input.value);
    };
    this.currentResults[this.currentSelection - 1].result.action();
  }

  promptForThemeSetting() {
    this.blockProviderChange = true;
    this.allowInputFieldSelection = false;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.currentProvider = (terms) => {
      this.currentSelection = 0;
      this.hint.innerText = 'Choose a theme';
      let defaultValue = this.defaultSettings['theme'];
      let results = [
        {
          name: 'Revert to default value: ' + defaultValue.match(/[^\/]*$/),
          action: () => {
            this.setSetting('theme', defaultValue);
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
            this.refreshThemes();
          },
        },
      ];
      for (let theme of this.themes) {
        let name = theme.fields.title;
        let shortName = name.match(/[^\/]*$/);
        let action = () => {
          this.setSetting('theme', name);
          // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
          this.refreshThemes();
        };
        results.push({ name: shortName, action: action });
      }
      this.showResults(results);
    };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.currentResolver = (e) => {
      this.currentResults[this.currentSelection - 1].result.action(e);
    };
    this.input.value = '';
    this.onInput(this.input.value);
  }

  //Validator = (terms) => bool
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'settingName' implicitly has an 'any' ty... Remove this comment to see the full error message
  promptForSetting(settingName, hint, validator, errorMsg) {
    this.blockProviderChange = true;
    this.allowInputFieldSelection = true;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
    this.currentProvider = (terms) => {
      this.currentSelection = 0;
      this.hint.innerText = hint;
      let defaultValue = this.defaultSettings[settingName];
      let results = [{ name: 'Revert to default value: ' + defaultValue, action: () => this.setSetting(settingName, defaultValue) }];
      if (!validator(terms)) {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: any; }' is not assignabl... Remove this comment to see the full error message
        results.push({ name: errorMsg });
      }
      this.showResults(results);
    };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    this.currentResolver = (e) => {
      if (this.currentSelection === 0) {
        let input = this.input.value;
        if (validator(input)) {
          this.setSetting(settingName, input);
          this.goBack = undefined;
          this.blockProviderChange = false;
          this.allowInputFieldSelection = false;
          // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
          this.promptCommand('|');
        }
      } else {
        let action = this.currentResults[this.currentSelection - 1].result.action;
        if (action) {
          action();
          this.goBack = undefined;
          this.blockProviderChange = false;
          this.allowInputFieldSelection = false;
          // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
          this.promptCommand('|');
        }
      }
    };
    this.input.value = this.settings[settingName];
    this.onInput(this.input.value);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'results' implicitly has an 'any' type.
  showResults(results) {
    for (let cur of this.currentResults) {
      cur.remove();
    }
    this.currentResults = [];
    let resultCount = 0;
    for (let result of results) {
      this.addResult(result, resultCount);
      resultCount++;
      if (resultCount >= this.settings.maxResults) break;
    }
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
  tmMessageBuilder(message, params = {}) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    return (e) => {
      let event = {
        type: message,
        paramObject: params,
        event: e,
      };
      this.parentWidget.dispatchEvent(event);
    };
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  actionProvider(terms) {
    this.currentSelection = 0;
    this.hint.innerText = 'Search commands';
    let results;
    if (terms.length === 0) {
      results = this.getCommandHistory();
    } else {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
      results = this.actions.filter((a) => a.name.toLowerCase().includes(terms.toLowerCase()));
    }
    this.showResults(results);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  helpProvider(terms) {
    //TODO: tiddlerify?
    this.currentSelection = 0;
    this.hint.innerText = 'Help';
    let searches = [
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '... Search', action: () => this.promptCommand('') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '> Commands', action: () => this.promptCommand('>') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '+ Create tiddler with title', action: () => this.promptCommand('+') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '# Search tags', action: () => this.promptCommand('#') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '@ List tiddlers with tag', action: () => this.promptCommand('@') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '[ Filter operation', action: () => this.promptCommand('[') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '| Command Palette Settings', action: () => this.promptCommand('|') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '\\ Escape first character', action: () => this.promptCommand('\\') },
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      { name: '? Help', action: () => this.promptCommand('?') },
    ];
    this.showResults(searches);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  filterProvider(terms, hint) {
    this.currentSelection = 0;
    this.hint.innerText = hint === undefined ? 'Filter operation' : hint;
    terms = '[' + terms;
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    let fields = $tw.wiki.filterTiddlers('[fields[]]');
    // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
    let results = $tw.wiki.filterTiddlers(terms).map((r) => {
      return { name: r };
    });
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'i' implicitly has an 'any' type.
    let insertResult = (i, result) => results.splice(i + 1, 0, result);
    for (let i = 0; i < results.length; i++) {
      let initialResult = results[i];
      let alreadyMatched = false;
      let date = 'Invalid Date';
      if (initialResult.name.length === 17) {
        //to be sure to only match tiddly dates (17 char long)
        // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
        date = $tw.utils.parseDate(initialResult.name).toLocaleString();
      }
      if (date !== 'Invalid Date') {
        results[i].hint = date;
        results[i].action = () => {};
        alreadyMatched = true;
      }
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
      let isTag = $tw.wiki.getTiddlersWithTag(initialResult.name).length !== 0;
      if (isTag) {
        if (alreadyMatched) {
          insertResult(i, { ...results[i] });
          i += 1;
        }
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
        results[i].action = () => this.promptCommand('@' + initialResult.name);
        results[i].hint = 'Tag'; //Todo more info?
        alreadyMatched = true;
      }
      let isTiddler = this.tiddlerOrShadowExists(initialResult.name);
      if (isTiddler) {
        if (alreadyMatched) {
          insertResult(i, { ...results[i] });
          i += 1;
        }
        results[i].action = () => {
          this.navigateTo(initialResult.name);
          this.closePalette();
        };
        results[i].hint = 'Tiddler';
        alreadyMatched = true;
      }
      let isField = fields.includes(initialResult.name);
      if (isField) {
        if (alreadyMatched) {
          insertResult(i, { ...results[i] });
          i += 1;
        }
        let parsed;
        try {
          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
          parsed = $tw.wiki.parseFilter(this.input.value);
        } catch (e) {} //The error is already displayed to the user
        let foundTitles = [];
        for (let node of parsed || []) {
          if (node.operators.length !== 2) continue;
          if (node.operators[0].operator === 'title' && node.operators[1].operator === 'fields') {
            foundTitles.push(node.operators[0].operand);
          }
        }
        let hint = 'Field';
        if (foundTitles.length === 1) {
          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name '$tw'.
          hint = $tw.wiki.getTiddler(foundTitles[0]).fields[initialResult.name];
          // @ts-expect-error ts-migrate(2358) FIXME: The left-hand side of an 'instanceof' expression m... Remove this comment to see the full error message
          if (hint instanceof Date) {
            hint = hint.toLocaleString();
          }
          hint = hint.toString().replace(/(\r\n|\n|\r)/gm, '');
          let maxSize = this.settings.maxResultHintSize - 3;
          if (hint.length > maxSize) {
            hint = hint.substring(0, maxSize);
            hint += '...';
          }
        }
        results[i].hint = hint;
        results[i].action = () => {};
        alreadyMatched = true;
      }
      // let isContentType = terms.includes('content-type');
    }
    this.showResults(results);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  filterResolver(e) {
    if (this.currentSelection === 0) return;
    this.currentResults[this.currentSelection - 1].result.action();
    e.stopPropagation();
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  helpResolver(e) {
    if (this.currentSelection === 0) return;
    this.currentResults[this.currentSelection - 1].result.action();
    e.stopPropagation();
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'terms' implicitly has an 'any' type.
  createTiddlerProvider(terms) {
    this.currentSelection = 0;
    this.hint.innerText = 'Create new tiddler with title @tag(s)';
    this.showResults([]);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  createTiddlerResolver(e) {
    let { tags, searchTerms } = this.parseTags(this.input.value.substr(1));
    let title = searchTerms.join(' ');
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'any[]'.
    tags = tags.join(' ');
    this.tmMessageBuilder('tm-new-tiddler', { title: title, tags: tags })(e);
    this.closePalette();
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
  promptCommand(value, caret) {
    this.blockProviderChange = false;
    this.input.value = value;
    this.input.focus();
    if (caret !== undefined) {
      this.input.setSelectionRange(caret, caret);
    }
    this.onInput(this.input.value);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
  promptCommandBasic(value, caret, hint) {
    if (this.settings.neverBasic === 'true' || this.settings.neverBasic === true) {
      //TODO: validate settings to avoid unnecessary checks
      this.promptCommand(value, caret);
      return;
    }
    this.input.value = '';
    this.blockProviderChange = true;
    this.currentProvider = this.basicProviderBuilder(value, caret, hint);
    this.onInput(this.input.value);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
  basicProviderBuilder(value, caret, hint) {
    let start = value.substr(0, caret);
    let end = value.substr(caret);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'input' implicitly has an 'any' type.
    return (input) => {
      let { resolver, provider, terms } = this.parseCommand(start + input + end);
      let backgroundProvider = provider;
      backgroundProvider(terms, hint);
      this.currentResolver = resolver;
    };
  }

  getCommandHistory() {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'h' implicitly has an 'any' type.
    this.history = this.history.filter((h) => this.actions.some((a) => a.name === h)); //get rid of deleted command that are still in history;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'h' implicitly has an 'any' type.
    let results = this.history.map((h) => this.actions.find((a) => a.name === h));
    while (results.length <= this.settings.maxResults) {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
      let nextDefaultAction = this.actions.find((a) => !results.includes(a));
      if (nextDefaultAction === undefined) break;
      results.push(nextDefaultAction);
    }
    return results;
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
  actionResolver(e) {
    if (this.currentSelection === 0) return;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
    let result = this.actions.find((a) => a.name === this.currentResults[this.currentSelection - 1].innerText);
    if (result.keepPalette) {
      let curInput = this.input.value;
      this.goBack = () => {
        this.input.value = curInput;
        this.blockProviderChange = false;
        this.onInput(this.input.value);
      };
    }
    this.updateCommandHistory(result);
    result.action(e);
    e.stopPropagation();
    if (result.immediate) {
      this.validateSelection(e);
      return;
    }
    if (!result.keepPalette) {
      this.closePalette();
    }
  }

  getCurrentSelection() {
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    let selection = window.getSelection().toString();
    if (selection !== '') return selection;
    let activeElement = this.getActiveElement();
    if (activeElement === undefined || activeElement.selectionStart === undefined) return '';
    if (activeElement.selectionStart > activeElement.selectionEnd) {
      return activeElement.value.substring(activeElement.selectionStart, activeElement.selectionEnd);
    } else {
      return activeElement.value.substring(activeElement.selectionEnd, activeElement.selectionStart);
    }
  }
  // @ts-expect-error ts-migrate(7023) FIXME: 'getActiveElement' implicitly has return type 'any... Remove this comment to see the full error message
  getActiveElement(element = document.activeElement) {
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    const shadowRoot = element.shadowRoot;
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    const contentDocument = element.contentDocument;

    if (shadowRoot && shadowRoot.activeElement) {
      return this.getActiveElement(shadowRoot.activeElement);
    }

    if (contentDocument && contentDocument.activeElement) {
      return this.getActiveElement(contentDocument.activeElement);
    }

    return element;
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'el' implicitly has an 'any' type.
  focusAtCaretPosition(el, caretPos) {
    if (el !== null) {
      el.value = el.value;
      // ^ this is used to not only get "focus", but
      // to make sure we don't have it everything -selected-
      // (it causes an issue in chrome, and having it doesn't hurt any other browser)
      if (el.createTextRange) {
        var range = el.createTextRange();
        range.move('character', caretPos);
        range.select();
        return true;
      } else {
        // (el.selectionStart === 0 added for Firefox bug)
        if (el.selectionStart || el.selectionStart === 0) {
          el.focus();
          el.setSelectionRange(caretPos, caretPos);
          return true;
        } else {
          // fail city, fortunately this never happens (as far as I've tested) :)
          el.focus();
          return false;
        }
      }
    }
  }
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
  createElement(name, proprieties, styles) {
    let el = this.document.createElement(name);
    for (let [propriety, value] of Object.entries(proprieties || {})) {
      el[propriety] = value;
    }
    for (let [style, value] of Object.entries(styles || {})) {
      el.style[style] = value;
    }
    return el;
  }
  /*
			Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
			*/
  refresh() {
    return false;
  }
}

exports.commandpalettewidget = CommandPaletteWidget;
