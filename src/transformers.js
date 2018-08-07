import _ from 'lodash';
import moment from 'moment';
import flatten from 'app/core/utils/flatten';
import TimeSeries from 'app/core/time_series2';
import TableModel from 'app/core/table_model';

var transformers = {};

transformers.timeseries_to_rows = {
    description: 'Time series to rows',
    getColumns: function () {
        return [];
    },
    transform: function (data, panel, model) {
        model.columns = [
            {text: 'Time', type: 'date'},
            {text: 'Metric'},
            {text: 'Value'},
        ];

        for (var i = 0; i < data.length; i++) {
            var series = data[i];
            for (var y = 0; y < series.datapoints.length; y++) {
                var dp = series.datapoints[y];
                model.rows.push([dp[1], series.target, dp[0]]);
            }
        }
    },
};

transformers.timeseries_to_columns = {
    description: 'Time series to columns',
    getColumns: function () {
        return [];
    },
    transform: function (data, panel, model) {
        model.columns.push({text: 'Time', type: 'date'});

        // group by time
        var points = {};

        for (var i = 0; i < data.length; i++) {
            var series = data[i];
            model.columns.push({text: series.target});

            for (var y = 0; y < series.datapoints.length; y++) {
                var dp = series.datapoints[y];
                var timeKey = dp[1].toString();

                if (!points[timeKey]) {
                    points[timeKey] = {time: dp[1]};
                    points[timeKey][i] = dp[0];
                } else {
                    points[timeKey][i] = dp[0];
                }
            }
        }

        for (var time in points) {
            var point = points[time];
            var values = [point.time];

            for (let i = 0; i < data.length; i++) {
                var value = point[i];
                values.push(value);
            }

            model.rows.push(values);
        }
    }
};

transformers.timeseries_aggregations = {
    description: 'Time series aggregations',
    getColumns: function () {
        return [
            {text: 'Avg', value: 'avg'},
            {text: 'Min', value: 'min'},
            {text: 'Max', value: 'max'},
            {text: 'Total', value: 'total'},
            {text: 'Current', value: 'current'},
            {text: 'Count', value: 'count'},
        ];
    },
    transform: function (data, panel, model) {
        var i, y;
        model.columns.push({text: 'Metric'});

        if (panel.columns.length === 0) {
            panel.columns.push({text: 'Avg', value: 'avg'});
        }

        for (i = 0; i < panel.columns.length; i++) {
            model.columns.push({text: panel.columns[i].text});
        }

        for (i = 0; i < data.length; i++) {
            var series = new TimeSeries({
                datapoints: data[i].datapoints,
                alias: data[i].target,
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
    getColumns: function () {
        return [];
    },
    transform: function (data, panel, model) {
        model.columns.push({text: 'Time', type: 'date'});
        model.columns.push({text: 'Title'});
        model.columns.push({text: 'Text'});
        model.columns.push({text: 'Tags'});

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
    getColumns: function (data) {
        if (!data || data.length === 0) {
            return [];
        }
    },
    transform: function (data, panel, model) {
        if (!data || data.length === 0) {
            return;
        }

        if (data[0] === undefined) {
            throw {message: 'Query result is not in table format, try using another transform.'};
        }
        if (data[0].type === undefined) {
            throw {message: 'Query result is not in table format, try using another transform.'};
        }
        if (data[0].type !== 'table') {
            throw {message: 'Query result is not in table format, try using another transform.'};
        }
        model.columns = data[0].columns;
        model.rows = data[0].rows;
    }
};

transformers.json = {
    description: 'JSON Data',
    getColumns: function (data) {
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
            return {text: key, value: key};
        });
    },
    isEmpty: function(colData,trimData,emptyVals) {
        // Trim the data (unless its set to false)
        if (trimData)
            colData = $.trim(colData);

        // Basic check
        if (colData === null || colData.length === 0)
            return true;

        // Default to false, any empty matches will reset to true
        var retVal = false;

        // Internal helper function to check the value against a custom defined empty value (which can be a
        // regex pattern or a simple string)
        var _checkEmpty = function (val, emptyVal) {
            var objType = Object.prototype.toString.call(emptyVal);

            var match = objType.match(/^\[object\s(.*)\]$/);

            // If its a regex pattern, then handle it differently
            if (match[1] === 'RegExp')
                return val.match(emptyVal);

            // Note: Should this comparison maybe use a lenient/loose comparison operator? hmm..
            return val == emptyVal;
        };

        // If multiple custom empty values are defined in an array, then check each
        if ($.isArray(emptyVals)) {
            $.each(emptyVals, function (i, ev) {
                if (_checkEmpty(colData, ev))
                    retVal = true;
            });
        }

        // Otherwise, just check the one, if set
        else if (typeof emptyVals !== 'undefined') {
            if (_checkEmpty(colData, emptyVals))
                retVal = true;
        }

        return retVal;
    },
    transform: function (data, panel, model) {
        var i, y, z;
        var hideEmptyCols = panel.hideEmptyCols;
        var emptyVals = "N/A";
        if(hideEmptyCols && hideEmptyCols.enable && hideEmptyCols.emptyVals){
            emptyVals = hideEmptyCols.emptyVals.split(",");
        }
        for (i = 0; i < panel.columns.length; i++) {
            model.columns.push({text: panel.columns[i].text});
            if(hideEmptyCols && hideEmptyCols.enable){
                panel.columns[i].visible = false;
            }else{
                panel.columns[i].visible = true;
            }

        }

        if (model.columns.length === 0) {
            model.columns.push({text: 'JSON'});
        }

        for (i = 0; i < data.length; i++) {
            var series = data[i];

            for (y = 0; y < series.datapoints.length; y++) {
                var dp = series.datapoints[y];
                var values = [];

                if (_.isObject(dp) && panel.columns.length > 0) {
                    var flattened = flatten(dp, null);
                    for (z = 0; z < panel.columns.length; z++) {
                        let cellValue = flattened[panel.columns[z].value];
                        if(hideEmptyCols && hideEmptyCols.enable &&  !panel.columns[z].visible){
                           if(!this.isEmpty(cellValue,hideEmptyCols.trim,emptyVals)){
                               panel.columns[z].visible =  true;
                           }
                        }
                        values.push(cellValue);
                    }
                } else {
                    values.push(JSON.stringify(dp));
                }

                model.rows.push(values);
            }
        }
    }
};

function getColumnInterchange(panel) {
    if (panel.interchange) {
        var array = panel.interchange.split(":");
        if (array.length != 2) {
            return null;
        }
        return {
            names: array[0].split(","),
            values: array[1].split(",")
        };

    } else {
        return null;
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

function getCalculateColumns(expression, operator) {
    if (expression) {
        var expressions = expression.split(";");
        if (expressions.length < 1) {
            return null;
        }

        var totalColumns = {
            "columns": [],
            "expressions": []
        };

        for (var i = 0; i < expressions.length; i++) {
            var parameters = expressions[i].split("=");
            if (parameters.length != 2) {
                continue;
            }

            var operators = parameters[1].split(operator);
            if (operators.length > 1) {
                totalColumns.columns.push(parameters[0]);
                for (var j = 0; j < operators.length; j++) {
                    totalColumns.columns.push(operators[j]);
                }

                totalColumns.expressions.push({
                    "result": parameters[0],
                    "operators": operators
                });
            }
        }
        return totalColumns;
    } else {
        return null;
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

function splitColumn(dataPoint, panel) {
    if (panel.splitColumn && panel.splitColumn.length > 0 && panel.splitChar) {
        for (var i = 0; i < panel.splitColumn.length; i++) {
            var columnName = panel.splitColumn[i].value;
            var columnValue = dataPoint[columnName];
            if (columnValue) {
                var splitValues = columnValue.split(panel.splitChar);
                if (splitValues.length > 0) {
                    for (var z = 0; z < splitValues.length; z++) {
                        dataPoint[columnName + "_" + z] = splitValues[z];
                    }
                }
            }
        }
    }
}

function transformDataToTable(data, panel) {
    var model = new TableModel();

    if (!data || data.length === 0) {
        return model;
    }

    var transformer = transformers[panel.transform];
    if (!transformer) {
        throw {message: 'Transformer ' + panel.transformer + ' not found'};
    }

    //group by
    groupby(data, panel, splitColumn);

    transformer.transform(data, panel, model);
    return model;
}

function getInterchangeColummnName(interchange, dp) {
    var columnsName = [];
    for (var w = 0; w < interchange.names.length; w++) {
        columnsName.push(dp[interchange.names[w]]);
    }
    return columnsName.join("_");
}

function appendValues(oldValue, newValue) {
    if (!oldValue) {
        return newValue;
    }
    if ($.isNumeric(newValue)) {
        return oldValue + newValue;
    } else {
        if (oldValue.indexOf(newValue + ",") < 0 && oldValue.indexOf("," + newValue)) {
            return oldValue + ", " + newValue;
        } else {
            return oldValue;
        }
    }
}

function initRow(row, expressions) {
    if (expressions != null) {
        for (var x = 0; x < expressions.columns.length; x++) {
            if (!row[expressions.columns[x]]) {
                row[expressions.columns[x]] = 0;
            }
        }
    }
}

function calculateRow(row, expressions, operator) {
    if (expressions != null && expressions.expressions != null) {
        for (var z = 0; z < expressions.expressions.length; z++) {
            row[expressions.expressions[z].result] = row[expressions.expressions[z].operators[0]];
            for (var a = 1; a < expressions.expressions[z].operators.length; a++) {
                if (operator === "+") {
                    if (row[expressions.expressions[z].operators[a]]) {
                        if (row[expressions.expressions[z].result]) {
                            row[expressions.expressions[z].result] += row[expressions.expressions[z].operators[a]];
                        } else {
                            row[expressions.expressions[z].result] = row[expressions.expressions[z].operators[a]];
                        }

                    }
                } else if (operator === "-") {
                    if (row[expressions.expressions[z].result] && row[expressions.expressions[z].operators[a]]) {
                        row[expressions.expressions[z].result] -= row[expressions.expressions[z].operators[a]];
                    }
                } else if (operator === "/") {
                    if (row[expressions.expressions[z].result] && row[expressions.expressions[z].operators[a]]) {
                        if (row[expressions.expressions[z].operators[a]] === 0) {
                            row[expressions.expressions[z].result] = 0;
                        } else {
                            row[expressions.expressions[z].result] /= row[expressions.expressions[z].operators[a]];
                        }
                    }
                }
            }
        }
    }
}

function groupby(data, panel, dataPointCallBack) {
    if (panel.groupBy && panel.groupBy.length > 0) {
        var interchange = getColumnInterchange(panel);
        var groupBys = getGroupByColumns(panel);
        var totals = getCalculateColumns(panel.total, "+");
        var diffs = getCalculateColumns(panel.difference, "-");
        var rates = getCalculateColumns(panel.rate, "/");
        var hiddenValues = getHiddenValues(panel);

        for (var i = 0; i < data.length; i++) {
            var series = data[i];
            var map = {};
            for (var y = 0; y < series.datapoints.length; y++) {
                const dp = series.datapoints[y];

                var key = "";
                for (var n = 0; n < groupBys.length; n++) {
                    key += dp[groupBys[n]] + ",";
                }

                var row = map[key];
                if (!row)  {
                    //first create key
                    row = {};
                    map[key] = row;
                    for (var m = 0; m < groupBys.length; m++){
                        var groupBy = groupBys[m];
                        if (groupBy in dp){
                            row[groupBy] = dp[groupBy];
                        }
                    }
                }
                for (var name in dp) {
                    if (groupBys.indexOf(name) < 0) {
                        //need interchange row and column
                        if (interchange != null && interchange.values.indexOf(name) >= 0) {
                            if (!shouldHidden(hiddenValues, name, dp[name])) {
                                var columnName = getInterchangeColummnName(interchange, dp);
                                if(columnName in row){
                                    row[columnName] = appendValues(row[columnName], dp[name]);
                                }else{
                                    row[columnName] = dp[name];
                                }
                            }
                        } else if (interchange == null || interchange.names.indexOf(name) < 0) {
                            if (!shouldHidden(hiddenValues, name, dp[name])) {
                                if(name in row){
                                    row[name] = appendValues(row[name], dp[name]);
                                }else{
                                    row[name] = dp[name];
                                }
                            }
                        }
                    }
                }
            }
            series.datapoints = [];
            for (var name2 in map) {
                var newRow = map[name2];
                calculateRow(newRow, totals, "+");
                calculateRow(newRow, rates, "/");
                calculateRow(newRow, diffs, "-");
                dataPointCallBack(newRow, panel);
                series.datapoints.push(newRow);
            }
        }
    }
}

export {transformers, transformDataToTable};
