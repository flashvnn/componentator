var schema = GETSCHEMA('Component');

schema.workflow2('init');
F.schedule('08:00', '1 day', () => schema.workflow2('download'));