/*global MozActivity: true*/
/*global Promise, URL, Blob, Event*/
MozActivity =
(function () {
"use strict";

function mixinEventTarget (Class) {
	var el = document.createElement('span');
	function copyMethod (name) {
		Class.prototype[name] = function () {
			return el[name].apply(el, arguments);
		};
	}
	copyMethod('addEventListener');
	copyMethod('removeEventListener');
	copyMethod('dispatchEvent');
}

function openUrl (url) {
	var a = document.createElement('a'), body = document.getElementsByTagName('body')[0];
	a.href = url;
	a.target = '_blank';
	a.style.display = 'none';
	body.appendChild(a);
	a.click();
	body.removeChild(a);
	return Promise.resolve();
}

function pickFile (init) {
	return new Promise(function (resolve, reject) {
		var input = document.createElement('input'), body = document.getElementsByTagName('body')[0];
		input.type = 'file';
		init(input);
		input.style.display = 'none';
		body.appendChild(input);
		input.addEventListener('change', function () {
			var file = input.files[0];
			body.removeChild(input);
			if (file) {
				resolve({
					blob: file,
					type: file.type
				});
			} else {
				reject('No file selected');
			}
		}, false);
		input.click();
	});
}

function createVCard (data) {
	var lines = [];
	lines.push('BEGIN:VCARD');
	lines.push('VERSION:3.0');
	lines.push('N:' + data.lastName + ';' + data.givenName + ';;;;');
	lines.push('FN:' + data.givenName + ' ' + data.lastName);
	if (data.bday) {
		lines.push('BDAY:' + data.bday);
	}
	if (data.note) {
		lines.push('NOTE:' + data.note);
	}
	if (data.tel) {
		lines.push('TEL:' + data.tel);
	}
	if (data.email) {
		lines.push('EMAIL:' + data.email);
	}
	if (data.url) {
		lines.push('URL:' + data.url);
	}
	if (data.address) {
		lines.push('ADDRESS:' + data.address);
	}
	if (data.title) {
		lines.push('TITLE:' + data.title);
	}
	if (data.company) {
		lines.push('COMPANY:' + data.company);
	}
	lines.push('END:VCARD');
	return lines.join('\n\r');
}

var activity = {};

activity.dial = function (data) {
	return data.number ? openUrl('tel:' + data.number) : Promise.reject('Missing number');
};

activity['new'] = function (data) {
	switch (data.type) {
	case 'mail':
		return data.url ? openUrl(data.url) : Promise.reject('Missing url');
	case 'webcontacts/contact':
		return data.params ?
			openUrl(URL.createObjectURL(new Blob([createVCard(data.params)], {type: 'text/vcard'}))) :
			Promise.reject('Missing params');
	case 'websms/sms':
		return data.number ?
			openUrl('sms:' + data.number + (data.body ? ':' + data.body : '')) :
			Promise.reject('Missing number');
	default:
		return Promise.reject('Unsupported type');
	}
};

activity.open = function (data) {
	if (data.url) {
		return openUrl(data.url);
	}
	if (data.blob) {
		return openUrl(URL.createObjectURL(data.blob));
	}
	return Promise.reject('Missing url/blob');
};

activity.pick = function (data) {
	return pickFile(function (input) {
		if (data.type) {
			input.accept = data.type.join(',');
		}
	});
};

activity.record = function () {
	return pickFile(function (input) {
		input.accept = 'image/*';
		input.capture = 'environment';
	});
};

activity.share = function (data) {
	var url;
	if (data.url) {
		url = data.url;
	} else if (data.blob) {
		url = URL.createObjectURL(data.blob);
	} else {
		return Promise.reject('Missing url/blob');
	}
	return navigator.share ? navigator.share({url: url}) : Promise.reject('Unsupported activity');
};

activity.view = function (data) {
	return data.url ? openUrl(data.url) : Promise.reject('Missing url');
};

function MozActivity (options) {
	var promise;

	function triggerEvent (target, type) {
		var e = new Event(type), passOn;
		target.readyState = 'done';
		passOn = target.dispatchEvent(e);
		if (passOn && target['on' + type]) {
			target['on' + type].call(target, e);
		}
	}

	if (options && activity[options.name]) {
		promise = activity[options.name](options.data || {});
	} else {
		promise = Promise.reject('Unsupported activity');
	}
	promise.then(function (result) {
		this.result = result;
		triggerEvent(this, 'success');
	}.bind(this), function (error) {
		this.error = error instanceof Error ? error : new Error(error);
		triggerEvent(this, 'error');
	}.bind(this));
}

mixinEventTarget(MozActivity);
MozActivity.prototype.onsuccess = null;
MozActivity.prototype.onerror = null;
MozActivity.prototype.readyState = 'pending';
MozActivity.prototype.result = undefined;
MozActivity.prototype.error = undefined;

return MozActivity;
})();

/*
var a = new MozActivity({name: 'pick'});
a.onsuccess = function () {
    console.log(a.result.blob.name);
};
*/