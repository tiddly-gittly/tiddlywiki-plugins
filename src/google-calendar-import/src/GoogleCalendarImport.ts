interface ICalendarItem {
  id: string;
  start: { dateTime: string };
  end: { dateTime: string };
  summary: string;
  description: string;
  created: string;
  updated: string;
  creator: string;
  htmlLink: string;
  organizer: { displayName: string };
  backgroundColor: string;
  etag: string;
}

interface ITiddlerCalendarCategoryFields {
  title: string;
  caption: string;
  text: string;
  tags: string;
  color: string;
  created: string;
}

/**
 * Using $tw to add fetched calender data to TiddlerWiki, and add tags to them
 */
export async function importToWiki(tags: string = '', options: { updateCategoriesOnly?: boolean }) {
  const buildCategoryTitle = (categoryName: string) => `谷歌日历/类型/${categoryName}`;
  const buildEventTitle = (categoryName: string, created: string) => `谷歌日历/事件/${categoryName}-${created}`;
  const journeyTitle = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const categoryTags = `${tags} 谷歌日历/类型`;

  const calendarList = await getCalendarLists();
  const categories: ITiddlerCalendarCategoryFields[] = calendarList.map(({ summary, description = '', backgroundColor, etag }) => ({
    title: buildCategoryTitle(summary),
    caption: summary,
    text: description,
    tags: categoryTags,
    color: backgroundColor,
    created: toTWUTCString(new Date(Number(JSON.parse(etag)) / 1000)),
  }));
  // update Categories only
  if (options.updateCategoriesOnly) {
    $tw.wiki.addTiddlers(categories);
    return;
  }
  // update events only

  const calendarEvents = await getCalendarEvents(calendarList);
  const tiddlers = calendarEvents.map(
    ({
      start: { dateTime: startDate },
      end: { dateTime: endDate },
      summary,
      description = '',
      created,
      updated = created,
      creator,
      htmlLink,
      organizer: { displayName: category },
      backgroundColor,
    }) => ({
      title: buildEventTitle(summary, created),
      caption: summary,
      text: description,
      tags: `${tags} ${journeyTitle} ${buildCategoryTitle(category)}`,
      type: 'text/vnd.tiddlywiki',
      startDate,
      endDate,
      created: toTWUTCString(new Date(created)),
      creator: creator.email || 'GoogleCalendar',
      modified: toTWUTCString(new Date(updated)),
      source: htmlLink,
      color: backgroundColor, // mixed from calendar data
    }),
  );
  $tw.wiki.addTiddlers(tiddlers);
}

/**
 * Get calendars we want to import
 */
export async function getCalendarLists(): Promise<Array<ICalendarItem>> {
  const calendarListResponse = await gapi.client.calendar.calendarList.list({ showDeleted: false });
  const calendarList = calendarListResponse.result.items;
  // I set every calendar need to be imported have a description starts with '任务类型'
  return calendarList.filter((calendar: { description: string }) => String(calendar.description).startsWith('任务类型'));
}

/**
 * Get list of Calendar events, modify this if you want to customize it for your need
 */
export async function getCalendarEvents(calendarList: ICalendarItem[]): Promise<ICalendarItem[]> {
  // set date range
  let timeMin = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  let timeMax = new Date(new Date().setHours(24, 0, 0, 0)).toISOString();

  const allEventList = await Promise.all(
    calendarList.map((calendar: ICalendarItem) => {
      const calendarColor = calendar.backgroundColor;
      // get all events in the calendar
      return gapi.client.calendar.events
        .list({
          calendarId: calendar.id,
          // from midnight to next midnight
          timeMin,
          timeMax,
        })
        .then((eventResponse) => {
          return eventResponse.result.items.map((item) => ({ ...item, color: calendarColor }));
        });
    }),
  );
  return allEventList.flat();
}

// Utils
export function pad(number: number) {
  if (number < 10) {
    return '0' + number;
  }
  return String(number);
}
export function toTWUTCString(date: Date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5)
  );
}
