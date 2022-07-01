(function() {
    const mod = angular.module('ndoc.module.core');

    mod.directive('ndocDatePicker', function() {
        return {
            controllerAs: 'vm',
            bindToController: true,
            scope: {
                ngModel: '=ngModel'
            },
            template: `<input type="date" data-ng-model="vm.val">`,
            controller: function($element, $scope, moment, Alert) {
                const vm = this;
                vm.$onInit = () => {
                    vm.val = new Date(moment(vm.ngModel, 'DD.MM.YYYY'));
                };

                $scope.$watch('vm.ngModel', (val) => {
                    vm.$onInit();
                });

                $element.on('change', (e) => {
                    try {
                        const val = moment(vm.val).format('DD.MM.YYYY');
                        vm.ngModel = val;
                        $scope.$apply();
                    } catch (err) {
                        Alert.error(err);
                    }
                });
            }
        }
    });

    mod.directive('invoiceTimesheet', function() {
        return {
            bindToController: true,
            scope: {
                invoice: '=invoice'
            },
            templateUrl: 'modules/invoice/timesheet.html',
            controllerAs: 'vm',
            controller: function($scope, moment, _, Currencies) {
                const vm = this;
                vm.$onInit = init;
                vm.onMouseOver = onMouseOver;
                vm.onMouseDown = onMouseDown;
                vm.generateTimesheet = generateTimesheet;
                vm.getTotal = getTotal;


                const weekdays = ['', 'M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

                function init() {
                    $scope.$watch('vm.invoice.data.periodStart', generateTimesheet, true);
                    $scope.$watch('vm.invoice.data.periodEnd', generateTimesheet, true);

                    angular.element(document).bind('mouseup', function(e) {
                        vm.mouseDown = false;
                        e.stopPropagation();
                    });

                    vm.cur = Currencies.getSymbol(vm.invoice.settings.currency);
                    vm.customWorkHours = vm.invoice.settings.workHours || 8;
                }

                function onMouseDown(item) {
                    vm.mouseDown = true;
                    onMouseOver(item);
                }

                function onMouseOver(item) {
                    if (!vm.mouseDown) {
                        return;
                    }

                    switch (vm.mouseMode) {
                        case 'holiday':
                            item.type = 'holiday';
                            break;

                        case 'work':
                            item.type = 'work';
                            item.hours = vm.customWorkHours;
                            break;
                    }
                }

                function generateTimesheet() {
                    const gte = moment(vm.invoice.data.periodStart, 'DD.MM.YYYY');
                    const lte = moment(vm.invoice.data.periodEnd, 'DD.MM.YYYY');
                    const totalDays = lte.diff(gte, 'days') + 1;

                    // Generate days
                    vm.invoice.timesheet = {
                        month: lte.format('YYYY-MMMM'),
                        days: []
                    };

                    const workHours = vm.invoice.settings.workHours || 8;
                    const items = vm.invoice.timesheet.days;
                    const day = gte;
                    for (let i = 0; i < totalDays; i++) {
                        const item = {
                            day: day.format('D'),
                            month: day.format('MMMM'),
                            weekday: weekdays[day.isoWeekday()]
                        };

                        // Labour days
                        if (day.isoWeekday() < 6) {
                            item.type = 'work';
                            item.hours = workHours;
                        } else {
                            item.type = 'eow';
                        }

                        items.push(item);
                        day.add(1, 'day');
                    }
                }

                function getTotal(mode) {
                    const data = _.get(vm.invoice, 'timesheet.days', [])
                        .filter((item) => item.type === 'work');

                    const payRate = _.get(vm.invoice, 'settings.payRate', 0);
                    const total = _.sumBy(data, 'hours');

                    switch (mode) {
                        case 'hours':
                            return total + 'h';

                        case 'money':
                            return Math.round(total * payRate * 100) / 100;
                    }
                }
            }
        }
    });
})();
