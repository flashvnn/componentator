const Fs = require('fs');
const FLAGS = ['get', 'dnscache'];

NEWSCHEMA('Component').make(function(schema) {

	schema.setQuery(function(error, controller, callback) {

		var output = [];
		var db = F.global.database;
		var options = controller.query;
		var page = U.parseInt(options.page) - 1;

		if (options.q)
			options.q = options.q.toSearch();

		for (var i = 0, length = db.length; i < length; i++) {
			var item = db[i];

			if (options.color && options.color != item.color)
				continue;

			if (options.response && !item.responsive)
				continue;

			if (options.q && item.search.indexOf(options.q) === -1)
				continue;

			output.push(item);
		}

		callback(output.skip(page * 20).take(20));
	});

	schema.addWorkflow('init', function(error, model, options, callback) {
		F.global.database = [];

		TRY(() => Fs.mkdirSync(F.path.public('/components/')));

		Fs.readFile(F.path.public('/components/database.json'), function(err, data) {

			if (data)
				F.global.database = data.toString('utf8').parseJSON();

			if (!F.global.database.length) {
				console.log('Please wait, the database is downloading ...');
				schema.workflow2('download');
			}

			callback(SUCCESS(true));
		});
	});

	schema.addWorkflow('download', function(error, model, options, callback) {

		var url = CONFIG('repository');
		var database = [];

		U.request(url + 'components.json', FLAGS, function(err, response) {

			JSON.parse(response).wait(function(item, next) {

				var target = url + encodeURIComponent(item) + '/';
				var detail = {};
				var current = F.global.database.findItem('name', item);
				var arr = [];
				var skip = false;

				arr.push(target + 'component.json');
				arr.push(target + 'readme.md');
				arr.push(target + 'example.html');
				arr.push(target + 'dependencies.html');
				arr.push(target + 'component.css');
				arr.push(target + 'component.js');

				detail.dateupdated = new Date();

				arr.wait(function(item, next) {

					U.request(item, FLAGS, function(err, response, status) {

							if (err || status !== 200)
								return next();

							switch (U.getName(item)) {
								case 'component.json':
									U.extend(detail, response.parseJSON());
									detail.token = response.md5();
									detail.search = detail.name.toSearch() + ' ' + detail.tags.join(' ').toSearch();
									detail.linker = detail.name.slug();
									detail.id = detail.linker.hash();
									detail.depends = detail.dependencies;
									detail.dateimported = F.datetime;

									var picture = '/components/{0}.{1}'.format(detail.id, U.getExtension(detail.picture));
									var filename = F.path.public(picture);

									if (current && current.token === detail.token) {
										arr.length = 0;
										skip = true;
									} else
										U.download(target + detail.picture, ['get'], (err, response) => !err && response.pipe(Fs.createWriteStream(filename)));

									detail.picture = picture;
									database.push({ id: detail.id, linker: detail.linker, search: detail.search, name: detail.name, tags: detail.tags, color: detail.color, author: detail.author, responsive: detail.responsive, version: detail.version, picture: detail.picture.replace('/public/', ''), datecreated: detail.datecreated, dateupdated: detail.dateupdated, token: detail.token });
									break;
								case 'example.html':
									detail.html = response;
									break;
								case 'dependencies.html':
									detail.dependencies = response;
									break;
								case 'component.css':
									detail.css = response;
									break;
								case 'component.js':
									detail.js = response;
									break;
								case 'readme.md':
									detail.body = response;
									break;
							}

						next();
					});

				}, function() {
					skip ? next() : Fs.writeFile(F.path.public('/components/{0}.json'.format(detail.id)), JSON.stringify(detail), 'utf8', next);
				});
			}, function() {
				database.quicksort('datecreated', false);
				Fs.writeFile(F.path.public('/components/database.json'), JSON.stringify(database), 'utf8', NOOP);
				F.global.database = database;
				F.touch();
				callback(SUCCESS(true));
			});
		});
	});
});
