/* eslint-disable @typescript-eslint/strict-boolean-expressions, no-var */
import { IWidgetEvent } from 'tiddlywiki';

declare var exports: {
  startup: () => void;
};
declare global {
  interface Window {
    // methods copy from TidGi-Desktop, should update if it changes
    service: {
      native: {
        openPath(filePath: string, showItemInFolder?: boolean): Promise<void>;
      };
      wiki: {
        getTiddlerFilePath(title: string, workspaceID?: string): Promise<string | undefined>;
      };
    };
  }
}

// Listen for the tm-home message
exports.startup = () => {
  async function getFilePath(event: IWidgetEvent): Promise<string | undefined> {
    let title = '';
    if (typeof event.param === 'string') {
      // for button usage
      title = event.param;
    } else if (typeof event.paramObject === 'object') {
      // Get the specified additional fields, for message usage
      const additionalFields = event.paramObject as { title?: string };
      if (additionalFields?.title) {
        title = additionalFields.title;
      }
    }
    const filePath = await window?.service?.wiki?.getTiddlerFilePath?.(title);
    return filePath;
  }
  if ($tw.browser) {
    $tw.rootWidget.addEventListener('tm-open-in-external-app', async (event) => {
      const filePath = await getFilePath(event);
      if (filePath !== undefined) {
        await window?.service?.native?.openPath?.(filePath);
      }
    });
    $tw.rootWidget.addEventListener('tm-open-in-folder', async (event) => {
      const filePath = await getFilePath(event);
      if (filePath !== undefined) {
        await window?.service?.native?.openPath?.(filePath, true);
      }
    });

    $tw.rootWidget.addEventListener('tm-open-path', async (event) => {
      let filePath = '';
      if (typeof event.param === 'string') {
        // for button usage
        filePath = event.param;
      } else if (typeof event.paramObject === 'object') {
        // Get the specified additional fields, for message usage
        const additionalFields = event.paramObject as { filePath?: string };
        if (additionalFields?.filePath) {
          filePath = additionalFields.filePath;
        }
      }
      await window?.service?.native?.openPath?.(filePath);
    });
  }
};
