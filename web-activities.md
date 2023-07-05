# Activities in Firefox OS

The documentation for MozActivity was a mess even at the time it existed. The archived documentation is at https://web.archive.org/web/20160919113535/https://developer.mozilla.org/en-US/docs/Archive/Firefox_OS/API/Web_Activities, but even this is neither complete nor entirely correct. The following isn’t either, but it should be useful, at least for me.

## Call an activity

To call an activity, use something like the following code

```js
var request = new MozActivity({
	name: activityName,
	data: activityData
});

request.onsuccess = function () {
	handleResult(request.result);
};

request.onerror = function () {
	handleError(request.error);
};
```

where `activityName` is a string with the name of the activity from the table below, `activityData` is an object with the required data as described.

Note that in most cases `activityData` should have a key `type` with a MIME type or something similar.

When the activity is successfull, the returned data is as described. Common errors are (`error.name`) `'NO_PROVIDER'` when there is no app to handle the activity, and `'ActivityCanceled'` when the user didn’t select an app from the list.

## Implement an activity

To implement an activity, code both in the manifest and the JS code is required

In the manifest, add a top level key `"activities"` with an object which for each activity has a key with the name of the activity and a configuration object as data.

This configuration object has the following keys:

* `"href"`: Path to the HTML file with the app. For apps in inline mode this should be different from the normal path (at least by a query string).
* `"disposition"`: Either `"window"` (default) or `"inline"`. Inline apps will be shown above the calling app, there may be multiple instances of the app running at the same time, while there will only be one app in window mode.
* `"returnValue"`: Either `true` or `false` (default), depending on whether there will be a returned value or not.
* `"filters"`: Optional object with filter definitions.

Filter definitions are objects. Each key contains the constraints for the entry in `activityData` with the same name. The constraints are usually an object with the following optional keys:

* `"required"`: Either `true` or `false` (default), wether the property must exist or not.
* `"value"`: A string or a number or an array of strings or numbers. When the property exists, the value must be equal, or contained in the array. This also seems to work the other way round: A string filter matches a data array when it is contained in it.
* `"pattern"`: A string with a regular expression. When the property exists, it must be a string, and the regular expression must match the whole value.
* `"patternFlags"`: Set to `"i"` for case insensitive pattern.
* `"regexp"`: Almost the same as `"pattern"`, but only for old versions of Firefox OS, and the regular expression need only match part of the string.
* `"min"`: A number. When the property exists, its value must be a number at least as large.
* `"max"`: As above, but with the maximal value.

In the JS code add something like this:

```js
navigator.mozSetMessageHandler('activity', function (request) {
	handleActivitv(
		request.source.name, //the name of the activity
		request.source.data //the data of the activity
	).then(function (result) {
		request.postResult(result); //call this with the result
	}, function (error) {
		request.postError(error); //call this with the error
	}).finally(function () {
		window.close();
	});
});
```

As indicated the original data of the activity is in `request.source`. For apps that handle more than one activity check `request.source.name` for the name.

For activities that return a result, use `request.postResult` (or `request.postError`) to do so.

Especially for inline activities you should call `window.close()` when done.

## Common activities

To view the definitions of activities in standard apps use this search: https://github.com/search?q=repo%3Amozilla-b2g%2Fgaia+activities+path%3A*.webapp&type=code

| Name | Data | Result | Description |
|------|------|--------|-------------|
| `open` | `type`, `blob` | none | Open a file, standard apps exist for images, audio, and video |
| `view` | `type`, `url`  | none | View a file (`type: 'url'` for a webpage), alternatively with `blob` instead of `url` like `open` |
| `share` | `type`, `blobs`, `number`, `filenames`, `filepaths` | none | Share files, `type` is the common type (may be something like `'image/*'`), `number` is their count, the rest are arrays with the files, their names and their paths. |
| `share` | `type: 'url'`, `url` | none | Share an URL |
| `save-bookmark` | `type: 'url'`, `url` | none | Save a bookmark on the homescreen |
| `pick` | `type` | `type`, `blob` | Pick a file, standard apps exist for images (including camera and wallpaper), audio, and video |
| `pick` | `type: 'webcontacts/contact'` or `type: 'webcontacts/email'` | `number` or `email`, `name` (as array with one string) | Pick a contact, return either the phone number or the email; with `type: 'webcontacts/tel'` you get all data of the contact in a complicated format (even though the documentation says you have to add `fullContact: 'true'` for this) |
| `dial` | `type: 'webtelephony/number'`, `number` | none | Dial a number (given as string) |
| `new` | `type: 'websms/sms'`, `number` | none | Send an SMS, text may be given in `body` |
| `new` | `type: 'mail'` | none | Send an Email optional parameters are `url` (with a `mailto:` URI), and `blobs` and `filenames` arrays for attachments |
| `new` | `type: 'webcontacts/contact'`, `params` | none | Create a new contact, `params` can contain keys for `givenName`, `lastName`, `tel`, `email`, and `company` |