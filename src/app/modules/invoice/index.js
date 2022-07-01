(function() {
    const mod = angular.module('ndoc.module.invoice', []);

    mod.config(function($stateProvider) {
        $stateProvider
            .state('app.invoice', {
                url: '/invoice?id',
                templateUrl: 'modules/invoice/template.html'
            })
            .state('app.email', {
                url: '/email?id&filename',
                templateUrl: 'modules/invoice/email.html'
            });
    });

    mod.controller('InvoiceCtrl', function($scope, $state, $stateParams, Store, uuid, _, moment) {
        const vm = this;
        vm.onSubmit = onSubmit;
        vm.isFormInvalid = isFormInvalid;
        vm.prevInvoicePlus = prevInvoicePlus;
        vm.setDate = setDate;
        vm.setRangeDate = setRangeDate;

        init();

        function init() {
            vm.isEdit = $stateParams.id;
            vm.invoices = Store.get('invoices') || [];

            if (vm.isEdit) {
                return loadInvoice();
            }

            const settings = Store.get('settings') || {};
            vm.invoice = {
                id: uuid(),
                settings: settings,
                data: {
                    includeBankComission: !!settings.bankComission
                    // invoiceNo: 1,
                    // invoiceSendDate: '06.07.2019',
                    // periodStart: '01.07.2019',
                    // periodEnd: '31.07.2019'
                }
            };
        }

        function save() {
            try {
                Store.set('invoices', vm.invoices);
            } catch (err) {
                alert('Не могу сохранить инвойс:', err.toString());
            }
        }

        function isFormInvalid() {
            if (vm.invoiceForm.$invalid) {
                return 'Не все поля заполнены!';
            }

            // Check date range
            const gte = moment(vm.invoice.data.periodStart, 'DD.MM.YYYY');
            const lte = moment(vm.invoice.data.periodEnd, 'DD.MM.YYYY');

            if (lte - gte <= 0) {
                return 'Неверный диапазон дат периода у инвойса';
            }

            if (lte.subtract(45, 'day') > gte) {
                return 'Максимальный период - 45 дней. Соррян!';
            }

            return false;
        }

        $scope.$watch('vm.isFormInvalid()', (val) => {
            if (val) {
                delete vm.invoice.timesheet;
            }
        });

        function prevInvoicePlus() {
            vm.invoice.data.invoiceNo = vm.invoices.length ?
                _.last(vm.invoices).data.invoiceNo + 1 : 1;
        }

        function setDate(v) {
            switch (v) {
                case 'today':
                    return vm.invoice.data.invoiceSendDate = moment().format('DD.MM.YYYY');
                case 'yesterday':
                    return vm.invoice.data.invoiceSendDate = moment()
                        .subtract(1, 'day').format('DD.MM.YYYY');
                case 'tomorrow':
                    return vm.invoice.data.invoiceSendDate = moment()
                        .add(1, 'day').format('DD.MM.YYYY');
            }
        }

        function setRangeDate(v) {
            switch (v) {
                case 'prevInvoice':
                    vm.invoice.data.periodEnd = moment().subtract(moment().weekday(), 'day')
                        .format('DD.MM.YYYY');

                    if (vm.invoices.length) {
                        const prev = _.last(vm.invoices).data;
                        vm.invoice.data.periodStart = moment(prev.periodEnd, 'DD.MM.YYYY')
                            .add(1, 'day').format('DD.MM.YYYY');
                    } else {
                        // fallback to month
                        vm.invoice.data.periodStart = moment().subtract(1, 'month')
                            .format('DD.MM.YYYY');
                    }
                    break;

                case 'month':
                    vm.invoice.data.periodStart = moment().startOf('month').format('DD.MM.YYYY');
                    vm.invoice.data.periodEnd = moment().endOf('month').format('DD.MM.YYYY');
                    break;
                case 'week':
                    vm.invoice.data.periodStart = moment().startOf('week').format('DD.MM.YYYY');
                    vm.invoice.data.periodEnd = moment().endOf('week').format('DD.MM.YYYY');
                    break;
            }
        }

        function loadInvoice() {
            console.warn('loadInvoice');
        }

        function getTotals(invoice) {
            const data = _.get(invoice, 'timesheet.days', [])
                .filter((item) => item.type === 'work');

            const payRate = _.get(invoice, 'settings.payRate', 0);
            const total = _.sumBy(data, 'hours');

            invoice.timesheet.totalHours = total;
            invoice.timesheet.totalMoney = Math.round(total * payRate * 100) / 100;
        }

        function onSubmit(invoice) {
            if (!vm.isEdit) {
                invoice.created = moment().toISOString();
                getTotals(invoice);
                vm.invoices.push(invoice);
                save();
                $state.go('app.index');
            } else {
                console.warn('save/edit invoice');
            }
        }
    });

    mod.controller('EmailCtrl', function($stateParams, Store, _, moment) {
        const vm = this;

        init();

        function init() {
            vm.id = $stateParams.id;
            const invoices = Store.get('invoices', []);
            vm.invoice = _.find(invoices, {id: vm.id});
            if (!vm.invoice) {
                return;
            }

            const emails = [];

            if (vm.invoice.settings.emailManager) {
                emails.push(vm.invoice.settings.emailManager);
            }

            const text = vm.invoice.settings.emailBody;
            vm.email = {
                filename: $stateParams.filename,
                recipients: emails.join('; '),
                title: vm.invoice.settings.emailTitle || 'Invoice for approval - ???',
                body: text
                    .replace('#{periodStart}', vm.invoice.data.periodStart)
                    .replace('#{periodEnd}', vm.invoice.data.periodEnd)

            };
        }
    });
})();
