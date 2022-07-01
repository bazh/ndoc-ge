(function() {
    const mod = angular.module('ndoc.module.navigation', []);

    mod.controller('NavigationCtrl', ['Navigation', function(Navigation) {
        const vm = this;
        vm.menu = Navigation.getMenu();
        vm.title = Navigation.getTitle();
        vm.onDblClick = onDblClick;
        function onDblClick() {
            vm.title = Navigation.getTitle();
        }
    }]);

    mod.factory('Navigation', function($state) {
        const titles = [
            'easy breezy lemon squeezy invoice generator',
            'easy breezy invoice generator'
        ];
        return {
            getTitle: function() {
                const index = _.random(0, titles.length - 1);
                return titles[index];
            },
            getMenu: function() {
                const states = $state.get();

                return _(states)
                    .filter(function(item) {
                        return item.data && item.data.nav;
                    })
                    .sortBy('data.nav.order')
                    .value();
            }
        };
    });
})();
