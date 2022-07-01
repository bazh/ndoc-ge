const app = angular.module('ndoc', [
    // libraries
    'ui.router',
    'angular-spinkit',
    // modules
    'ndoc.module.core',
    'ndoc.module.navigation',
    'ndoc.module.settings',
    'ndoc.module.signatures',
    'ndoc.module.index',
    'ndoc.module.invoice',
    'ndoc.module.declaration',
])
.config(function($locationProvider, $stateProvider, $urlRouterProvider) {
    $locationProvider.hashPrefix('!');
    $stateProvider
        .state('app', {
            abstract: true,
            views: {
                navigation: {
                    templateUrl: 'modules/navigation/template.html'
                },
                main: {
                    template: '<ui-view></ui-view>'
                }
            }
        });

    // Default redirect state, for 404
    // https://github.com/Narzerus/angular-permission/wiki/Installation-guide-for-ui-router#known-issues
    $urlRouterProvider.otherwise(function($injector) {
        $injector
            .get('$state')
            .go('app.index');
    });
});
