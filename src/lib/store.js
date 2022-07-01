const Store = require('electron-store');
const moment = require('moment');

const ROOT = 'ndocgeo'
const store = new Store();

exports.get = function(name, def) {
    return store.get(`${ROOT}.${name}`, def);
};

exports.set = function(name, val) {
    return store.set(`${ROOT}.${name}`, val);
};

exports.clear = function(name) {
    return store.set(`${ROOT}.${name}`, undefined);
};


exports.setCache = function(name, val, ttl) {
    ttl = ttl || moment().add(1, 'month');
    store.set(`${ROOT}Cache.${name}`, {
        value: val,
        ttl: ttl
    });
};

exports.getCache = function(name, def) {
    const data = store.get(`${ROOT}Cache.${name}`);
    if (data === undefined || data.ttl > moment()) {
        return def;
    }

    return data.value;
};

exports.resetCache = function() {
    return store.delete(`${ROOT}Cache`);
};
