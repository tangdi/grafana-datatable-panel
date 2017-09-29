'use strict';

System.register(['lodash', 'moment', 'app/core/utils/flatten', 'app/core/time_series2', 'app/core/table_model'], function (_export, _context) {
    "use strict";

    var _, moment, flatten, TimeSeries, TableModel, transformers;

    function getColumnInterchange(panel) {
        if (panel.interchange) {
            return panel.interchange.split(":");
        } else {
            return [];
        }
    }

    function getGroupByColumns(panel) {
        var groupBys = [];
        if (panel.groupBy) {
            for (var m = 0; m < panel.groupBy.length; m++) {
                groupBys.push(panel.groupBy[m].text);
            }
        }
        return groupBys;
    }

    function getTotalColumns(panel) {
        if (panel.total) {
            return panel.total.split(";");
        } else {
            return [];
        }
    }

    function getHiddenValues(panel) {
        if (panel.hiddenValues) {
            return panel.hiddenValues.split(";");
        } else {
            return [];
        }
    }

    function shouldHidden(hiddenValues, name, value) {
        return hiddenValues.indexOf(name + ":" + value) >= 0;
    }

    function transformDataToTable(data, panel) {
        var model = new TableModel();

        if (!data || data.length === 0) {
            return model;
        }

        var transformer = transformers[panel.transform];
        if (!transformer) {
            throw { message: 'Transformer ' + panel.transformer + ' not found' };
        }

        //group by
        if (panel.groupBy && panel.groupBy.length > 0) {
            var map = {};
            var interchange = getColumnInterchange(panel);
            var groupBys = getGroupByColumns(panel);
            var totals = getTotalColumns(panel);
            var hiddenValues = getHiddenValues(panel);

            for (var i = 0; i < data.length; i++) {
                var series = data[i];
                for (var y = 0; y < series.datapoints.length; y++) {
                    var dp = series.datapoints[y];

                    var key = "";
                    for (var n = 0; n < groupBys.length; n++) {
                        key += dp[groupBys[n]] + ",";
                    }

                    var row = map[key];
                    if (row) {
                        //append to key
                        for (var name in dp) {
                            if (groupBys.indexOf(name) < 0) {
                                if (interchange.length == 2 && interchange[0] === name) {
                                    if (!shouldHidden(hiddenValues, dp[name], dp[interchange[1]])) {
                                        if ($.isNumeric(row[dp[name]])) {
                                            row[dp[name]] = row[dp[name]] + dp[interchange[1]];
                                        } else {
                                            if (row[dp[name]]) {
                                                row[dp[name]] = row[dp[name]] + ", " + dp[interchange[1]];
                                            } else {
                                                row[dp[name]] = dp[interchange[1]];
                                            }
                                        }
                                    }
                                } else if (interchange.length == 2 && interchange[1] != name) {
                                    if (!shouldHidden(hiddenValues, name, dp[name])) {
                                        if ($.isNumeric(row[dp[name]])) {
                                            row[name] = row[name] + dp[name];
                                        } else {
                                            if (row[name]) {
                                                row[name] = row[name] + ", " + dp[name];
                                            } else {
                                                row[name] = dp[name];
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        //first create key
                        row = {};
                        for (var x = 0; x < totals.length; x++) {
                            row[totals[x]] = 0;
                        }
                        map[key] = row;
                        for (var name1 in dp) {
                            if (groupBys.indexOf(name1) > -1) {
                                row[name1] = dp[name1];
                            } else if (interchange.length == 2 && interchange[0] === name1) {
                                if (!shouldHidden(hiddenValues, dp[name1], dp[interchange[1]])) {
                                    row[dp[name1]] = dp[interchange[1]];
                                }
                            } else if (interchange.length == 2 && interchange[1] != name1) {
                                if (!shouldHidden(hiddenValues, name1, dp[name1])) {
                                    row[name1] = dp[name1];
                                }
                            }
                        }
                    }
                }
                series.datapoints = [];
                for (var name2 in map) {
                    var newRow = map[name2];
                    newRow._total = 0;
                    for (var z = 0; z < totals.length; z++) {
                        newRow._total += newRow[totals[z]];
                    }
                    series.datapoints.push(newRow);
                }
            }
        }

        transformer.transform(data, panel, model);
        return model;
    }

    return {
        setters: [function (_lodash) {
            _ = _lodash.default;
        }, function (_moment) {
            moment = _moment.default;
        }, function (_appCoreUtilsFlatten) {
            flatten = _appCoreUtilsFlatten.default;
        }, function (_appCoreTime_series) {
            TimeSeries = _appCoreTime_series.default;
        }, function (_appCoreTable_model) {
            TableModel = _appCoreTable_model.default;
        }],
        execute: function () {
            _export('transformers', transformers = {});

            transformers.timeseries_to_rows = {
                description: 'Time series to rows',
                getColumns: function getColumns() {
                    return [];
                },
                transform: function transform(data, panel, model) {
                    model.columns = [{ text: 'Time', type: 'date' }, { text: 'Metric' }, { text: 'Value' }];

                    for (var i = 0; i < data.length; i++) {
                        var series = data[i];
                        for (var y = 0; y < series.datapoints.length; y++) {
                            var dp = series.datapoints[y];
                            model.rows.push([dp[1], series.target, dp[0]]);
                        }
                    }
                }
            };

            transformers.timeseries_to_columns = {
                description: 'Time series to columns',
                getColumns: function getColumns() {
                    return [];
                },
                transform: function transform(data, panel, model) {
                    model.columns.push({ text: 'Time', type: 'date' });

                    // group by time
                    var points = {};

                    for (var i = 0; i < data.length; i++) {
                        var series = data[i];
                        model.columns.push({ text: series.target });

                        for (var y = 0; y < series.datapoints.length; y++) {
                            var dp = series.datapoints[y];
                            var timeKey = dp[1].toString();

                            if (!points[timeKey]) {
                                points[timeKey] = { time: dp[1] };
                                points[timeKey][i] = dp[0];
                            } else {
                                points[timeKey][i] = dp[0];
                            }
                        }
                    }

                    for (var time in points) {
                        var point = points[time];
                        var values = [point.time];

                        for (var _i = 0; _i < data.length; _i++) {
                            var value = point[_i];
                            values.push(value);
                        }

                        model.rows.push(values);
                    }
                }
            };

            transformers.timeseries_aggregations = {
                description: 'Time series aggregations',
                getColumns: function getColumns() {
                    return [{ text: 'Avg', value: 'avg' }, { text: 'Min', value: 'min' }, { text: 'Max', value: 'max' }, { text: 'Total', value: 'total' }, { text: 'Current', value: 'current' }, { text: 'Count', value: 'count' }];
                },
                transform: function transform(data, panel, model) {
                    var i, y;
                    model.columns.push({ text: 'Metric' });

                    if (panel.columns.length === 0) {
                        panel.columns.push({ text: 'Avg', value: 'avg' });
                    }

                    for (i = 0; i < panel.columns.length; i++) {
                        model.columns.push({ text: panel.columns[i].text });
                    }

                    for (i = 0; i < data.length; i++) {
                        var series = new TimeSeries({
                            datapoints: data[i].datapoints,
                            alias: data[i].target
                        });

                        series.getFlotPairs('connected');
                        var cells = [series.alias];

                        for (y = 0; y < panel.columns.length; y++) {
                            cells.push(series.stats[panel.columns[y].value]);
                        }

                        model.rows.push(cells);
                    }
                }
            };

            transformers.annotations = {
                description: 'Annotations',
                getColumns: function getColumns() {
                    return [];
                },
                transform: function transform(data, panel, model) {
                    model.columns.push({ text: 'Time', type: 'date' });
                    model.columns.push({ text: 'Title' });
                    model.columns.push({ text: 'Text' });
                    model.columns.push({ text: 'Tags' });

                    if (!data || data.length === 0) {
                        return;
                    }

                    for (var i = 0; i < data.length; i++) {
                        var evt = data[i];
                        model.rows.push([evt.min, evt.title, evt.text, evt.tags]);
                    }
                }
            };

            transformers.table = {
                description: 'Table',
                getColumns: function getColumns(data) {
                    if (!data || data.length === 0) {
                        return [];
                    }
                },
                transform: function transform(data, panel, model) {
                    if (!data || data.length === 0) {
                        return;
                    }

                    if (data[0] === undefined) {
                        throw { message: 'Query result is not in table format, try using another transform.' };
                    }
                    if (data[0].type === undefined) {
                        throw { message: 'Query result is not in table format, try using another transform.' };
                    }
                    if (data[0].type !== 'table') {
                        throw { message: 'Query result is not in table format, try using another transform.' };
                    }
                    model.columns = data[0].columns;
                    model.rows = data[0].rows;
                }
            };

            transformers.json = {
                description: 'JSON Data',
                getColumns: function getColumns(data) {
                    if (!data || data.length === 0) {
                        return [];
                    }

                    var names = {};
                    for (var i = 0; i < data.length; i++) {
                        var series = data[i];
                        if (series.type !== 'docs') {
                            continue;
                        }

                        // only look at 100 docs
                        var maxDocs = Math.min(series.datapoints.length, 100);
                        for (var y = 0; y < maxDocs; y++) {
                            var doc = series.datapoints[y];
                            var flattened = flatten(doc, null);
                            for (var propName in flattened) {
                                names[propName] = true;
                            }
                        }
                    }

                    return _.map(names, function (value, key) {
                        return { text: key, value: key };
                    });
                },
                transform: function transform(data, panel, model) {
                    var i, y, z;
                    for (i = 0; i < panel.columns.length; i++) {
                        model.columns.push({ text: panel.columns[i].text });
                    }

                    if (model.columns.length === 0) {
                        model.columns.push({ text: 'JSON' });
                    }

                    for (i = 0; i < data.length; i++) {
                        var series = data[i];

                        for (y = 0; y < series.datapoints.length; y++) {
                            var dp = series.datapoints[y];
                            var values = [];

                            if (_.isObject(dp) && panel.columns.length > 0) {
                                var flattened = flatten(dp, null);
                                for (z = 0; z < panel.columns.length; z++) {
                                    values.push(flattened[panel.columns[z].value]);
                                }
                            } else {
                                values.push(JSON.stringify(dp));
                            }

                            model.rows.push(values);
                        }
                    }
                }
            };
            _export('transformers', transformers);

            _export('transformDataToTable', transformDataToTable);
        }
    };
});
//# sourceMappingURL=transformers.js.map
