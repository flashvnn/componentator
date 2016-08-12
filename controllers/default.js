exports.install = function() {
	// Routes
	F.route('/');
	F.route('/', view_homepage, ['*Component', 'robot']);
	F.route('/api/components/', json_query, ['*Component']);
	F.route('/api/ping/', json_ping);

	// Templates
	F.localize('/templates/*.html', ['compress'])
};

function json_query() {
	var self = this;
	self.$query(self, self.callback());
}

function view_homepage() {
	var self = this;
	self.$query(self, self.callback('index'));
}

function json_ping() {
	this.plain('null');
}