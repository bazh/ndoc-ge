(function() {
    const mod = angular.module('ndoc.module.index', []);

    mod.config(function($stateProvider) {
        $stateProvider.state('app.index', {
            url: '/index',
            data: {
                nav: {
                    title: ('Инвойсы'),
                    order: 10
                }
            },
            templateUrl: 'modules/index/template.html'
        });
    });

    mod.controller('IndexCtrl', function($state, Store, Electron, moment, Currencies) {
        const vm = this;

        vm.init = init;
        vm.getTotal = getTotal;
        vm.onRemove = onRemove;
        vm.toArchive = toArchive;
        vm.onDownload = onDownload;

        init();

        function init() {
            vm.invoices = Store.get('invoices', []);
            vm.showHidden = false;

            const settings = Store.get('settings', {});
            const signatures = Store.get('signatures', []);

            if (!settings.payRate || !settings.account || !signatures.length) {
                vm.notReady = true;
            }
        }

        function getTotal(item, mode) {
            const data = _.get(item, 'timesheet.days', [])
                .filter((item) => item.type === 'work');

            const payRate = _.get(item, 'settings.payRate', 0);
            const total = _.sumBy(data, 'hours');
            const cur = Currencies.getSymbol(item.settings.currency);

            switch (mode) {
                case 'hours':
                    return total + 'h';

                case 'money':
                    return cur + (Math.round(total * payRate * 100) / 100).toFixed(2);

                case 'bank':
                    if (item.data.includeBankComission) {
                        return cur + item.settings.bankComission;
                    }

                    return '-';

                case 'everything':
                    let val = Math.round(total * payRate * 100) / 100;
                    if (item.data.includeBankComission) {
                        val += item.settings.bankComission;
                    }
                    return cur + val.toFixed(2);
            }
        }

        function onRemove(item) {
            _.remove(vm.invoices, {id: item.id});
            save();
        }

        function toArchive(item) {
            item.hidden = !item.hidden;
            save();
        }

        function onDownload(item) {
            const uname = (item.settings.name || '__').split(' ').join('_');
            const date = moment(item.created).format('YYYY_MM_DD');
            const path = `${date}_${uname}_invoice.zip`;

            vm.isLoading = true;
            Electron
                .call('ndoc.SaveInvoice', path)
                .then((res) => {
                    if (!res.filePath) {
                        return;
                    }

                    return Electron
                        .call('ndoc.GenerateInvoice', {
                            invoice: item,
                            filename: res.filePath
                        }, item)
                        .then(() => {
                            return res.filePath
                        });
                })
                .then((filename) => {
                    $state.go('app.email', {
                        id: item.id,
                        filename
                    });
                })
                .catch(alert)
                .finally(() => {
                    vm.isLoading = false;
                });
        }

        function save() {
            Store.set('invoices', vm.invoices);
        }
    });
})();
