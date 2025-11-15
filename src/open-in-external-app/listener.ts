/* eslint-disable @typescript-eslint/strict-boolean-expressions, no-var */
import { IWidgetEvent } from 'tiddlywiki';

declare var exports: {
  startup: () => void;
};

async function getFilePath(event: IWidgetEvent): Promise<string | undefined> {
  let title = '';
  let filePath: string | undefined;
  if (typeof event.param === 'string') {
    // for button usage
    title = event.param;
  } else if (typeof event.paramObject === 'object') {
    // Get the specified additional fields, for message usage
    const additionalFields = event.paramObject as { filePath?: string; title?: string };
    if (additionalFields?.title) {
      title = additionalFields.title;
    }
    if (additionalFields?.filePath) {
      filePath = additionalFields.filePath;
    }
  }
  if (title) {
    filePath = await window?.service?.wiki?.getTiddlerFilePath?.(title);
  }
  if (!filePath) return;
  // Check if filePath is a relative path (i.e., not starting with a drive letter or "/" for Mac/Linux) and prepend wikiFolderLocation
  const isRelativePath = !/^(?:[A-Za-z]:[/\\]|\/)/.test(filePath);
  if (isRelativePath) {
    const workspace = window?.meta?.()?.workspace;
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    if (!wikiFolderLocation) return;
    filePath = decodeURI(`${wikiFolderLocation}/${filePath}`);
  }
  return filePath;
}

// Listen for the tm-home message
exports.startup = () => {
  if (!$tw.browser) {
    return;
  }
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
};
