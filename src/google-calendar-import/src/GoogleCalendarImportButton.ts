/*\
type: application/javascript
module-type: widget

Import Google Calendar event of today into TiddlyWiki
Usage: <$import-google-calendar-event tags="private GoogleCalendar" />
Attributes: yesterday="yes"

\*/
const PLUGIN_NAME = '$:/plugins/linonetwo/google-calendar-import/';
const CLIENT_ID_TIDDLER_NAME = `${PLUGIN_NAME}/GoogleCalendarCLIENT_ID`;
const API_KEY_TIDDLER_NAME = `${PLUGIN_NAME}/GoogleCalendarAPI_KEY`;

const Widget = require('$:/core/modules/widgets/widget.js').widget;
const { importToWiki } = require('$:/plugins/linonetwo/google-calendar-import/GoogleCalendarImport');

class GoogleCalendarToTiddlyWikiWidget extends Widget {
  /**
   * Lifecycle method: call this.initialise and super
   */
  constructor(parseTreeNode, options) {
    super(parseTreeNode, options);
    this.initialise(parseTreeNode, options);
    this.state = {
      isSignedIn: false,
    };
  }

  /**
   * Lifecycle method: Render this widget into the DOM
   */
  render(parent, nextSibling) {
    this.parentDomNode = parent;
    this.computeAttributes();
    const importButton = this.document.createElement('button');
    importButton.appendChild(this.document.createTextNode(this.state.isSignedIn ? this.getAttribute('label') || 'Import Calendar' : 'Login to Google'));
    importButton.onclick = this.onImportButtonClick.bind(this);
    parent.insertBefore(importButton, nextSibling);
    this.domNodes.push(importButton);
    // init gapi client and refresh login display
    this.initClient();
  }

  /**
   * Event listener of button
   */
  async onImportButtonClick() {
    if (!this.state.isSignedIn) {
      try {
        // await this.initClient(); // we have init it in the constructor
        gapi.auth2.getAuthInstance().signIn();
      } catch (error) {
        console.error('GoogleCalendarToTiddlyWikiWidget: Error login using gapi client', error);
      }
    } else {
      try {
        const tags = this.getAttribute('tags', '');
        const updateCategoriesOnly = this.getAttribute('categories', 'no') === 'yes';
        await importToWiki(tags, { updateCategoriesOnly });
      } catch (error) {
        console.error('GoogleCalendarToTiddlyWikiWidget: Error importToWiki', error);
      }
    }
  }

  /**
   *  Initializes the API client library and sets up sign-in state
   *  listeners.
   */
  async initClient() {
    // on start up, it might not be loaded, we schedule it later
    if (!window.gapi) {
      setTimeout(this.initClient.bind(this), 100);
      return;
    }

    // Client ID and API key from the Google Developer Console
    // we get it from tiddler
    const CLIENT_ID = $tw.wiki.getTiddler(CLIENT_ID_TIDDLER_NAME).fields.text;
    const API_KEY = $tw.wiki.getTiddler(API_KEY_TIDDLER_NAME).fields.text;

    // Array of API discovery doc URLs for APIs used by the script
    const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
    // Authorization scopes required by the API; multiple scopes can be
    // included, separated by spaces.
    const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
    await new Promise((resolve) => gapi.load('client:auth2', resolve));
    await gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    });
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSignInStatus.bind(this));
    // Handle the initial sign-in state.
    this.updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  }

  /**
   *  Called when the signed in status changes, to update the UI
   *  appropriately. After a sign-in, the API is called.
   */
  updateSignInStatus(isSignedIn: boolean): void {
    const prevState = { ...this.state };
    if (isSignedIn) {
      this.state.isSignedIn = true;
    } else {
      this.state.isSignedIn = false;
    }
    // this is like React forceUpdate, we use it because it is not fully reactive on this.state change
    if (prevState.isSignedIn !== isSignedIn) {
      this.refreshSelf(); // method from super class
    }
  }
}

exports['import-google-calendar-event'] = GoogleCalendarToTiddlyWikiWidget;
