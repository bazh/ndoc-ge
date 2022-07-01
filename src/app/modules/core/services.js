(function() {
    const mod = angular.module('ndoc.module.core', []);
    const Store = require('../lib/store');
    const electron = require('electron');
    const _ = require('lodash');
    const moment = require('moment');
    const uuid = require('uuid');

    // Shortcuts
    mod.service('Store', function() {
        return Store;
    });

    mod.service('_', function() {
        return _;
    });

    mod.service('moment', function() {
        return moment;
    });

    mod.service('uuid', function() {
        return uuid.v1;
    });

    mod.factory('Electron', function($q) {
        return {
            call: function(chan, ...args) {
                const defer = $q.defer();
                electron.ipcRenderer
                    .invoke(chan, ...args)
                    .then(defer.resolve)
                    .catch(defer.reject);

                return defer.promise;
            }
        }
    });

    mod.factory('Currencies', function() {
        const c = [{
            id: 'usd',
            val: 'USD',
            sym: '$'
        }, {
            id: 'eur',
            val: 'EUR',
            sym: '€'
        }];

        return {
            get: function() {
                return c;
            },
            getSymbol: function(v) {
                for (let i = 0; i < c.length; i++) {
                    if (v.toLowerCase() === c[i].id) {
                        return c[i].sym;
                    }
                }
                return v;
            }
        }
    });

    mod.factory('Banks', function() {
        const c = [{
            id: 'liberty',
            val: 'Liberty',
        }];

        return {
            get: function() {
                return c;
            },
            getValue: function(v) {
                for (let i = 0; i < c.length; i++) {
                    if (v == c[i].id) {
                        return c[i].val;
                    }
                }
                return v;
            }
        }
    });

    mod.service('NBG', function(Electron, moment) {
        function get(cur, date) {
            return Electron
                .call('ndoc.GetCurrencyRates', date)
                .then((res) => {
                    return res[cur] || 0;
                })
        }

        return {
            get
        };
    });

    mod.service('Signatures', function() {
        function convert(item) {
            return `data:${item.mime};${item.encoding},${item.data}`;
        }

        return {
            convert
        };
    });

    mod.service('Alert', function() {
        return {
            error: function(msg) {
                alert(msg.toString());
            },
            info: function(msg) {
                alert(msg.toString());
            }
        };
    });
})();
