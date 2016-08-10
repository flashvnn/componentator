exports.install = function() {
	F.route('/');
	F.localize('/tamplates/*.html', ['compress'])
};