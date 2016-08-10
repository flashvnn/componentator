exports.install = function() {
	F.route('/api/components/',      json_query, ['*Component']);
};

function json_query() {
	var self = this;
	self.$query(self, self.callback());
}