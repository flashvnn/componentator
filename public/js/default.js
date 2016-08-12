PING('GET /api/ping/');

var MONTHS = ['January', 'February', 'March', 'April', 'May', 'Juny', 'July', 'August', 'September', 'October', 'November', 'December'];
var XS;
var grid = {};
var common = {};
var detail = null;
var last = '';

grid.datasource = [];
grid.filter = { page: 1, q: jC.parseQuery().q || '' };
grid.filter.page = 1;

if (window.matchMedia)
	XS = window.matchMedia('(max-width:768px)');

$('.noscroll').on('touchmove', function(e) {
	e.preventDefault();
});

jC.ready(function() {
	hljs.configure({ tabReplace: '    ' });
	location.hash && setTimeout(function() {
		show_detail(location.hash.substring(1));
	}, 1000);
});

ON('#grid', function(component) {
	component.next = function(page) {
		grid.filter.page = page;
		AJAX('GET /api/components/', grid.filter, '+grid.datasource');
	};
});

WATCH('common.window', function(path, value) {
	if (!value)
		location.hash = '';
});

WATCH('grid.filter.q', function(path, value) {
	$('.search-clean').toggleClass('hidden', !value);
});

WATCH('grid.filter.q', function(path, value) {
	var search = (value || '').split(' ');
	var filter = grid.filter;
	var words = [];

	filter.page = 1;
	delete filter.color;
	delete filter.responsive;

	for (var i = 0, length = search.length; i < length; i++) {
		var key = search[i].trim().toLowerCase();
		switch (key) {
			case 'responsive':
				filter.responsive = 1;
				break;
			case 'red':
			case 'blue':
			case 'green':
			case 'black':
			case 'silver':
			case 'yellow':
			case 'orange':
			case 'white':
			case 'purple':
			case 'transparent':
				filter.color = key;
				break;
			case 'gray':
				filter.color = 'silver';
				break;
			default:
				words.push(key);
				break;
		}
	}

	filter.q = words.join(' ');
	var current = JSON.stringify(filter);
	if (current === last)
		return;
	last = current;
	AJAXCACHE('GET /api/components/', filter, function(response) {
		SET('grid.datasource', response);
		loading(false, 1000);
	}, '5 minutes');
}, true);

$(document).ready(function() {

	isMOBILE && $('.search').find('input').on('keyup', function(e) {
		if (e.keyCode === 13)
			$(this).blur();
	});

	$(document).on('click', '.search-clean', function() {
		SET('grid.filter.q', '');
	});

	$(document).on('click', '.component', function() {
		var el = $(this);
		var linker = el.attr('data-id');
		location.hash = linker;
		show_detail(linker);
		loading(true);
	});

	$(window).on('keydown', function(e) {
		if (e.keyCode === 27)
			SET('common.window', '');
	});

	setTimeout(function() {
		loading(false);
	}, 500);

	on_resize();
	$(window).on('resize', on_resize);

	if (!window.hljs)
		return;

	$('pre code').each(function(i, block) {
		hljs.highlightBlock(block);
	});
});

function on_resize() {

	var container = $('#container-scroll');
	var body = $('#body-scroll');
	var $w = $(window);
	var w = $w.width();
	var h = $w.height();

	if (!XS.matches) {
		container.css({ height: 'auto' });
		body.css({ height: h });
		return;
	}

	var top = container.offset().top;
	container.css({ height: h - top });
	body.css({ height: 'auto' });
}

function copyclipboard(type) {
	var range = document.createRange();
	range.selectNode($('.copyclipboard' + type).get(0));
	window.getSelection().addRange(range);
	document.execCommand('copy');
	window.getSelection().removeAllRanges();
	range = null;
}

function show_detail(linker) {

	var component = grid.datasource.findItem('linker', linker);
	if (!component)
		return;

	loading(true);

	AJAX('GET /components/{0}.json'.format(component.id), function(response) {

		FIND('#detail', function(component) {
			component.element.find('.ui-form-title b').html(response.name);
		});

		var tags = response.tags.join(' ').toLowerCase();
		var plus = [];

		tags.indexOf('jcomponent') !== -1 && plus.push('- download [jComponent library](https://github.com/totaljs/components/tree/master/0dependencies)');
		tags.indexOf('bootstrap') !== -1 && plus.push('- download the [Bootstrap Grid System](https://github.com/totaljs/components/tree/master/0dependencies) (only CSS)');

		if (plus.length)
			response.body += '\n\n---\n\n__Dependencies:__\n' + plus.join('\n') + '\n\njComponent is a component library for jQuery. With jComponent you can create reusable and powerful web components for your web applications. It doesn\'t contain any dependencies (with except jQuery) and the library contains many features like number/date/string formatting, async operations, template engine and many more.';

		response.dependencies = (response.dependencies || '').replace(/\"\/\//g, '\"https://');

		var html_dep = '';
		var html_css = '';
		var html_js = '';
		var html_body = '';

		response.dependencies.split('\n').forEach(function(line) {
			html_dep += '\t' + line + '\n';
		});

		Tangular.helpers.children.call(response, response.css || '', 'css', true).split('\n').forEach(function(line) {
			html_css += '\t\t' + line + '\n';
		});

		Tangular.helpers.children.call(response, response.js || '', 'js', true).split('\n').forEach(function(line) {
			html_js += '\t\t' + line + '\n';
		});

		response.html.split('\n').forEach(function(line) {
			html_body += '\t' + line + '\n';
		});

		response.code = ('<!DOCTYPE html>\n<html>\n<head>\n\t<title>{0}</title>\n\t<meta charset="utf-8" />\n\t<meta http-equiv="X-UA-Compatible" content="IE=10" />\n\t<meta name="robots" content="all,follow" />{1}\n\t<style>\n\t\tbody{padding:50px;margin:0;background-color:white;font-family:Arial;}\n\t\t{2}\n\t</style>\n</head>\n<body>\n\n\t<scr' + 'ipt>\n\t\t{3}\n\t</scr' + 'ipt>\n\n\t{4}\n</body>\n</html>').format(response.name, html_dep.trim(), html_css.trim(), html_js.trim(), html_body.trim());

		SET('detail', response);

		FIND('#detail', function(component) {

			setTimeout(function() {
				var ifrm = $('.preview').get(0);
				ifrm.contentWindow.document.open();
				ifrm.contentWindow.document.write(response.code);
				ifrm.contentWindow.document.close();
			}, 500);

			$('pre code').each(function(i, block) {
				hljs.highlightBlock(block);
			});

			loading(false, 200);
		});

		SET('common.window', 'detail');

	});
}

function download() {
	var blob = new Blob([detail.code], { type: 'text/plain;charset=utf-8' });
	saveAs(blob, detail.linker + '.html');
}

COMPONENT('click', function() {
	var self = this;
	self.readonly();
	self.make = function() {
		self.element.on('click', function() {
			self.get()(self);
		});
	};
});

COMPONENT('form', function() {

	var self = this;

	if (!MAN.$$form) {
		MAN.$$form = true;
		$(document).on('click touchend', '.ui-form-button-close', function(e) {
			var com = $(this).parent().parent().parent().parent().component();

			if (e.type === 'click') {
				com.set('');
				return;
			}


			setTimeout(function() {
				com.set('');
			}, 500);
		});
	}

	var hide = function() {
		self.set('');
	};

	self.readonly();
	self.cancel = function(hide) { hide(); };

	self.make = function() {
		var content = self.element.html();
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
		var color = self.attr('data-color');

		self.condition = self.attr('data-if');
		self.element.remove();

		$(document.body).append('<div id="' + self._id + '" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form' + (color ? ' ui-form-' + color : '') + '" style="max-width:' + width + '"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-id="' + self._id + '"></span><b>' + self.attr('data-title') + '</b></div>' + content + '</div></div>');

		self.element = $('#' + self._id);
		self.element.data(COM_ATTR, self);

		self.element.on('click', 'button', function(e) {

			switch (this.name) {
				case 'submit':
					self.get(submit)(hide);
					break;
				case 'cancel':
					if (!this.disabled)
						self[this.name](hide);
					break;
			}
		});

		return true;
	};

	self.setter = function(value) {
		var isHidden = !EVALUATE(self.path, self.condition);
		self.element.toggleClass('hidden', isHidden);
		if (!isHidden)
			self.element.find('input:first-child').focus();
	};
});

COMPONENT('visible', function() {
	var self = this;
	self.readonly();
	self.watch(function(path, value) {

		var condition = self.attr('data-if');

		if (condition) {
			self.element.toggleClass('hidden', !EVALUATE(self.path, condition));
			return;
		}

		if (value)
			self.element.removeClass('hidden');
		else
			self.element.addClass('hidden');
	}, true);
});

COMPONENT('grid', function() {

	var self = this;
	var button;
	var element;
	var lastpage = -1;

	self.next = function(page) {};

	self.hidemore = function() {
		button.toggleClass('hidden', true);
	};

	self.make = function(template) {

		element = self.element.find('script');
		self.template = Tangular.compile(element.html());

		self.element.on('click', 'tr', function() {});
		self.element.addClass('ui-grid');

		element.replaceWith('<div></div>');
		element = self.element.find('div:first-child');
		self.element.append('<div class="row"><div class="col-md-4"></div><div class="col-xs-12 col-md-4"><button class="hidden" name="ui-grid-more">' + self.attr('data-options-button') + '</button><br /><br /></div></div>');

		button = self.element.find('button');

		self.element.on('click', 'button', function() {
			switch (this.name) {
				case 'ui-grid-more':
					loading(true);
					setTimeout(function() {
						var page = getPages(self.get().length, self.max) + 1;
						self.next(page);
						setTimeout(function() {
							var el = $('.ui-grid-page:last');
							var off = el.offset();
							var scroll = $('#body-scroll');
							scroll.animate({ scrollTop: (off.top + scroll.scrollTop() - 50) }, 500);
							setTimeout(function() {
								loading(false);
							}, 500);
						}, 500);
					}, 100);
					break;
				default:
					var index = parseInt($(this).parent().parent().attr('data-index'));
					self.click(index, self.get()[index], this);
					break;
			}
		});

		self.max = parseInt(self.attr('data-max') || 20);
	};

	self.refresh = function() {
		self.set(self.get());
	};

	self.setter = function(value) {

		if (value === null || value === undefined){
			button.toggleClass('hidden', true);
			return;
		}

		var pages = getPages(value.length, self.max);
		var output = '';

		button.toggleClass('hidden', value.length === 0 || value.length % self.max !== 0);

		for (var i = 0; i < pages; i++) {

			var skip = i * self.max;
			var items = '';

			for (var j = skip; j < skip + self.max; j++) {
				if (value[j])
					items += self.template(value[j]);
			}

			if (items.length > 0)
				output += '<div class="ui-grid-page"><div>' + self.attr('data-options-page').replace('#', i + 1) + '</div></div><div class="row">' + items + '</div>';
		}

		element.html(output);
	};

});

COMPONENT('template', function() {

	var self = this;
	var old = '';

	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.element.find('script');
		self.template = Tangular.compile(script.html());
		script.remove();
	};

	self.setter = function(value) {
		var n = JSON.stringify(value);
		if (old === n)
			return;
		old = n;
		if (value === null)
			return self.element.hide();
		self.element.html(self.template(value)).show();
	};
});

COMPONENT('importer', function() {
	var self = this;
	var imported = false;
	self.readonly();
	self.setter = function(value) {

		if (imported) {
			self.setter = null;
			return;
		}

		if (!self.evaluate(self.attr('data-if')))
			return;

		imported = true;
		IMPORT(self.attr('data-url'));
		self.remove();
	};
});

function loading(visible, cb) {
	var el = $('#loading');
	var timeout = 0;

	if (typeof(cb) === 'number') {
		timeout = cb;
		cb = NOOP;
	}

	setTimeout(function() {
		visible ? el.show() : el.fadeOut(300, cb);
	}, timeout);
}

function getPages(length, max) {
	var pages = (length - 1) / max;
	if (pages % max !== 0)
		pages = Math.floor(pages) + 1;
	if (pages === 0)
		pages = 1;
	return pages;
}

Tangular.register('marked', function(value) {
	return marked(value);
});

Tangular.register('duplicate', function(value, type) {

	var items = {};
	var output = [];
	var lib = { jquery: false, bootstrap: false, bootstrap: false, jc: false };

	value.split('\n').forEach(function(line) {
		if (items[line])
			return;

		if (type !== 'css') {
			if (line.indexOf('jquery') !== -1) {
				if (lib.jquery)
					return;
				lib.jquery = true;
			}

			if (line.indexOf('awesome') !== -1) {
				if (lib.font)
					return;
				lib.font = true;
			}

			if (line.indexOf('bootstrap') !== -1) {
				if (lib.bootstrap)
					return;
				lib.bootstrap = true;
			}

			if (line.indexOf('jcta') !== -1) {
				if (lib.jc)
					return;
				lib.jc = true;
			}
		}

		items[line] = true;
		output.push(line);
	});

	return output.join('\n');
});

Tangular.register('children', function(value, type, noencode) {

	if (!this.children)
		return noencode ? value : Tangular.helpers.encode(value);

	var builder = [''];

	this.children.forEach(function(item) {
		builder.push(item[type]);
		builder.push('');
	});

	return noencode ? value + '\n' + builder.join('\n') : Tangular.helpers.encode(value + '\n' + builder.join('\n'));
});

Tangular.register('github', function(value) {
	return 'https://github.com/totaljs/components/tree/master/{0}'.format(encodeURIComponent(value));
});

Tangular.register('date', function(value) {
	var dt = value.parseDate();
	return ((Date.now() - dt.getTime()) / 1000 / 60000 < 5 ? '<span class="badge badge-green mr5">HOT NEW</span>' : '') + dt.format('dd. {0} yyyy').format(MONTHS[dt.getMonth()]);
});

Tangular.register('changelog', function(value) {
	if (value)
		return (Date.now() - value.parseDate().getTime()) / 1000 / 60000 < 5 ? '<span class="badge badge-red mr5">UPDATED</span>' : '';
	return '';
});

Tangular.register('tags', function(value) {
	if (!value)
		return '';
	var arr = value instanceof Array ? value : value.split(',');
	var builder = '';
	for (var i = 0, length = arr.length; i < length; i++)
		builder += '<span class="tag">' + arr[i].trim() + '</span>';
	return builder;
});

Tangular.register('color', function(value) {
	return value === 'transparent' ? 'background:url(/img/transparent.png) no-repeat 50% 50%' : 'background-color:' + value;
});
