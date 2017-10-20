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
    transform: function (data, panel, model) {
        var i, y, z;
        for (i = 0; i < panel.columns.length; i++) {
            model.columns.push({text: panel.columns[i].text});
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

function getColumnInterchange(panel) {
    if (panel.interchange) {
        var array = panel.interchange.split(":");
        if(array.length!=2){
            return null;
        }
        return {
            names:array[0].split(","),
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

function getTotalColumns(panel) {
    if (panel.total) {
        var expressions =  panel.total.split(";");
        if(expressions.length <1){
            return null;
        }

        var totalColumns = {
            "columns":[],
            "expressions":[]
        };

        for(var i=0; i< expressions.length; i++){
          var parameters =  expressions[i].split("=");
          if(parameters.length!=2){
              continue;
          }

         var operators = parameters[1].split("+");
          if(operators.length>1){
              totalColumns.columns.push(parameters[0]);
              for(var j = 0; j < operators.length; j++){
                  totalColumns.columns.push(operators[j]);
              }

              totalColumns.expressions.push({
                  "summay":parameters[0],
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
    groupby(data, panel);

    transformer.transform(data, panel, model);
    return model;
}

function getInterchangeColummnName(interchange,dp){
    var columnsName = [];
    for(var w = 0; w < interchange.names.length; w++){
        columnsName.push(dp[interchange.names[w]]);
    }
   return columnsName.join("_");
}

function groupby(data, panel) {
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
                            if (interchange!=null && interchange.values.indexOf(name)>=0) {
                                if (!shouldHidden(hiddenValues, name, dp[name])) {
                                    var columnName = getInterchangeColummnName(interchange,dp);
                                    if ($.isNumeric(row[columnName])) {
                                        row[columnName] = row[columnName] + dp[name];
                                    } else {
                                        if (row[columnName]) {
                                            row[columnName] = row[columnName] + ", " + dp[name];
                                        } else {
                                            row[columnName] = dp[name];
                                        }

                                    }
                                }
                            } else if (interchange ==null || (interchange!=null && interchange.names.indexOf(name)<0)) {
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
                    if(totals!=null){
                        for (var x = 0; x < totals.columns.length; x++) {
                            row[totals.columns[x]] = 0;
                        }
                    }

                    map[key] = row;
                    for (var name1 in dp) {
                        if (groupBys.indexOf(name1) > -1) {
                            row[name1] = dp[name1];
                        } else if (interchange != null && interchange.values.indexOf(name1)>=0 ) {
                            if (!shouldHidden(hiddenValues, name1, dp[interchange[1]])) {
                                row[getInterchangeColummnName(interchange,dp)] = dp[name1];
                            }
                        }else if(interchange ==null || (interchange!=null && interchange.names.indexOf(name1)<0)) {
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
                if(totals!=null&&totals.expressions!=null){
                    for (var z = 0; z < totals.expressions.length; z++) {
                        for (var a = 0; a < totals.expressions[z].operators.length; a++) {
                            newRow[totals.expressions[z].summay] += newRow[totals.expressions[z].operators[a]];
                        }
                    }
                }
                series.datapoints.push(newRow);
            }
        }


    }
}

export {transformers, transformDataToTable};
