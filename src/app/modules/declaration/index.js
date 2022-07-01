const { VERSION } = require("lodash");

(function() {
    const mod = angular.module('ndoc.module.declaration', []);

    mod.config(function($stateProvider) {
        $stateProvider.state('app.declaration', {
            url: '/declaration',
            data: {
                nav: {
                    title: ('Декларации'),
                    order: 15
                }
            },
            templateUrl: 'modules/declaration/template.html'
        });
    });

    mod.controller('DeclarationCtrl', function($state, Store, Banks, Alert, Electron, moment, Currencies, NBG) {
        const vm = this;

        const TAX_MULTIPLIER = 0.01;

        vm.init = init;
        vm.getBankName = getBankName;
        vm.loadTransactions = loadTransactions;
        vm.createDeclaration = createDeclaration;
        vm.getDate = getDate;
        vm.getCurSymb = Currencies.getSymbol;
        vm.calcTax = calcTax;
        vm.calcSumTax = calcSumTax;
        vm.calcSum = calcSum;


        init();

        function init() {
            const settings = Store.get('settings', {});
            vm.settings = settings;

            if (!settings.bankId || !settings.bankLogin || !settings.bankPassword ||
                !settings.rsLogin || !settings.rsPassword || !settings.account) {
                vm.notReady = true;
            }
        }

        function getBankName() {
            return Banks.getValue(vm.settings.bankId);
        }

        function getDate(ts) {
            return moment(ts).format('DD.MM.YYYY');
        }

        function round(x) {
            return Math.round(x * 100) / 100;
        }

        function calcTax(item, inGel) {
            const tax = round(item.payment * TAX_MULTIPLIER);

            if (inGel) {
                return round(tax * item.rate);
            }

            return tax;
        }

        function calcSum(items, inGel) {
            items = items || [];

            let acc;
            if (inGel) {
                acc = (a, b) => b.payment * (b.rate || 0) + a;
            } else {
                acc = (a, b) => b.payment + a;
            }

            const sum = items.reduce(acc, 0) || 0;

            return round(sum);
        }

        function calcSumTax(items, inGel) {
            return round(calcSum(items, inGel) * TAX_MULTIPLIER);
        }

        function loadTransactions() {
            const date = moment().subtract(1, 'month').toISOString();

            vm.transactionsLoading = true;
            Electron
                .call('ndoc.LoadTransactions',
                    vm.settings.bankId,
                    vm.settings.account,
                    vm.settings.bankLogin,
                    vm.settings.bankPassword,
                    date
                ).then((res) => {
                    vm.transactions = res.month || [];
                    vm.transactionsYear = res.year || [];

                    vm.transactions.forEach((item) => {
                        NBG.get(item.currency, item.timestamp)
                            .then((v) => {
                                item.rate = v;
                                item.paymentGel = item.rate * item.payment;
                            })
                            .catch(alert);
                    });

                    vm.transactionsYear.forEach((item) => {
                        NBG.get(item.currency, item.timestamp)
                            .then((v) => {
                                item.rate = v;
                                item.paymentGel = item.rate * item.payment;
                            })
                            .catch(alert);
                    });
                })
                .catch(alert)
                .finally(() => vm.transactionsLoading = false)
        }

        function createDeclaration() {
            const monthIncome = calcSum(vm.transactions, true);
            const accumIncome = calcSum(vm.transactionsYear, true);
            vm.declarationLoading = true;
            Electron
                .call('ndoc.CreateDeclaration',
                    vm.settings.rsLogin,
                    vm.settings.rsPassword,
                    monthIncome.toFixed(2),
                    accumIncome.toFixed(2),
                    vm.autoSubmit
                ).then((res) => {
                    alert('Декларация заполнена, теперь надо отправить вручную (пока так)')
                })
                .catch(Alert.error)
                .finally(() => vm.declarationLoading = false);
        }
    });
})();
