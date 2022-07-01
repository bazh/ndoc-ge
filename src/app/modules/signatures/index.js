(function() {
    const mod = angular.module('ndoc.module.signatures', []);

    mod.config(function($stateProvider) {
        $stateProvider.state('app.signatures', {
            url: '/signatures',
            data: {
                nav: {
                    title: ('Подписи'),
                    order: 30
                }
            },
            templateUrl: 'modules/signatures/template.html'
        });
    });


    mod.controller('SignaturesCtrl', function(Store, Electron, Signatures, uuid, Alert) {
        const vm = this;
        vm.init = init;
        vm.onUploadFiles = onUploadFiles;
        vm.onDelete = onDelete;
        vm.getImage = Signatures.convert;

        init();

        function init() {
            vm.signatures = Store.get('signatures', []);
        }

        function save() {
            Store.set('signatures', vm.signatures);
        }

        function onDelete(id) {
            _.remove(vm.signatures, {id});
            save();
        }

        function onUploadFiles() {
            Electron
                .call('ndoc.GetSignatureFiles')
                .then((files) => {
                    files.forEach((item) => {
                        item.id = uuid();
                        vm.signatures.push(item);
                    });

                    save();
                })
                .catch(Alert.err);
        }
    });
})();
