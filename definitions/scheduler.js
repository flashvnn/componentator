var schema = GETSCHEMA('Component');

F.on('ready', function() {
	schema.workflow2('init');
});

// Registers scheduler
F.schedule('08:00', '1 day', () => schema.workflow2('download'));