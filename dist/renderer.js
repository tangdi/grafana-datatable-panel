'use strict';

System.register(['jquery', 'app/core/utils/kbn', 'moment', './libs/datatables.net/js/jquery.dataTables.min.js'], function (_export, _context) {
    "use strict";

    var $, kbn, moment, DataTable, _createClass, DatatableRenderer;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_jquery) {
            $ = _jquery.default;
        }, function (_appCoreUtilsKbn) {
            kbn = _appCoreUtilsKbn.default;
        }, function (_moment) {
            moment = _moment.default;
        }, function (_libsDatatablesNetJsJqueryDataTablesMinJs) {
            DataTable = _libsDatatablesNetJsJqueryDataTablesMinJs.default;
        }],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            _export('DatatableRenderer', DatatableRenderer = function () {
                function DatatableRenderer(panel, table, isUtc, sanitize, linkSrv) {
                    _classCallCheck(this, DatatableRenderer);

                    this.formatters = [];
                    this.colorState = {};
                    this.panel = panel;
                    this.table = table;
                    this.isUtc = isUtc;
                    this.sanitize = sanitize;
                    this.linkSrv = linkSrv;
                }

                /**
                 * Given a value, return the color corresponding to the threshold set
                 * @param  {[Float]} value [Value to be evaluated]
                 * @param  {[Array]} style [Settings containing colors and thresholds]
                 * @return {[String]}       [color]
                 */


                _createClass(DatatableRenderer, [{
                    key: 'getColorForValue',
                    value: function getColorForValue(value, style) {
                        if (!style.thresholds) {
                            return null;
                        }
                        for (var i = style.thresholds.length; i > 0; i--) {
                            if (value >= style.thresholds[i - 1]) {
                                return style.colors[i];
                            }
                        }
                        return _.first(style.colors);
                    }
                }, {
                    key: 'getColorIndexForValue',
                    value: function getColorIndexForValue(value, style) {
                        if (!style.thresholds) {
                            return null;
                        }
                        for (var i = style.thresholds.length; i > 0; i--) {
                            if (value >= style.thresholds[i - 1]) {
                                return i;
                            }
                        }
                        return 0;
                    }
                }, {
                    key: 'defaultCellFormatter',
                    value: function defaultCellFormatter(v, style) {
                        if (v === null || v === void 0 || v === undefined) {
                            return '';
                        }
                        if (_.isArray(v)) {
                            v = v.join(', ');
                        }
                        if (style && style.sanitize) {
                            return this.sanitize(v);
                        } else {
                            return _.escape(v);
                        }
                    }
                }, {
                    key: 'createColumnFormatter',
                    value: function createColumnFormatter(style, column) {
                        var _this2 = this;

                        if (!style) {
                            return this.defaultCellFormatter;
                        }
                        if (style.type === 'hidden') {
                            return function (v) {
                                return undefined;
                            };
                        }
                        if (style.type === 'date') {
                            return function (v) {
                                if (v === undefined || v === null) {
                                    return '-';
                                }
                                if (_.isArray(v)) {
                                    v = v[0];
                                }
                                var date = moment(v);
                                if (_this2.isUtc) {
                                    date = date.utc();
                                }
                                return date.format(style.dateFormat);
                            };
                        }
                        if (style.type === 'number') {
                            var valueFormatter = kbn.valueFormats[column.unit || style.unit];
                            return function (v) {
                                if (v === null || v === void 0) {
                                    return '-';
                                }
                                if (_.isString(v)) {
                                    return _this2.defaultCellFormatter(v, style);
                                }
                                if (style.colorMode) {
                                    _this2.colorState[style.colorMode] = _this2.getColorForValue(v, style);
                                }
                                return valueFormatter(v, style.decimals, null);
                            };
                        }
                        return function (value) {
                            return _this2.defaultCellFormatter(value, style);
                        };
                    }
                }, {
                    key: 'formatColumnValue',
                    value: function formatColumnValue(colIndex, value) {
                        if (this.formatters[colIndex]) {
                            return this.formatters[colIndex](value);
                        }

                        for (var i = 0; i < this.panel.styles.length; i++) {
                            var style = this.panel.styles[i];
                            var column = this.table.columns[colIndex];
                            var regex = kbn.stringToJsRegex(style.pattern);
                            if (column.text.match(regex)) {
                                this.formatters[colIndex] = this.createColumnFormatter(style, column);
                                return this.formatters[colIndex](value);
                            }
                        }

                        this.formatters[colIndex] = this.defaultCellFormatter;
                        return this.formatters[colIndex](value);
                    }
                }, {
                    key: 'generateFormattedData',
                    value: function generateFormattedData(rowData) {
                        var formattedRowData = [];
                        for (var y = 0; y < rowData.length; y++) {
                            var row = this.table.rows[y];
                            var cellData = [];
                            //cellData.push('');
                            for (var i = 0; i < this.table.columns.length; i++) {
                                var value = this.formatColumnValue(i, row[i]);
                                if (value === undefined) {
                                    this.table.columns[i].hidden = true;
                                } else {
                                    //this.table.columns[i].text
                                    value = this.formatDrilldown(this.table.columns, row, i, value, this.panel, this.linkSrv);
                                }
                                cellData.push(value);
                            }
                            if (this.panel.rowNumbersEnabled) {
                                cellData.unshift('rowCounter');
                            }
                            formattedRowData.push(cellData);
                        }
                        return formattedRowData;
                    }
                }, {
                    key: 'getStyleForColumn',
                    value: function getStyleForColumn(columnNumber) {
                        var colStyle = null;
                        for (var i = 0; i < this.panel.styles.length; i++) {
                            var style = this.panel.styles[i];
                            var column = this.table.columns[columnNumber];
                            if (column === undefined) break;
                            var regex = kbn.stringToJsRegex(style.pattern);
                            if (column.text.match(regex)) {
                                colStyle = style;
                                break;
                            }
                        }
                        return colStyle;
                    }
                }, {
                    key: 'getCellColors',
                    value: function getCellColors(colorState, columnNumber, cellData) {
                        var items = cellData.split(/(\s+)/);
                        // only color cell if the content is a number?
                        var bgColor = null;
                        var bgColorIndex = null;
                        var color = null;
                        var colorIndex = null;
                        var colStyle = null;
                        var value = null;
                        // check if the content has a numeric value after the split
                        if (!isNaN(items[0])) {
                            // run value through threshold function
                            value = parseFloat(items[0].replace(",", "."));
                            colStyle = this.getStyleForColumn(columnNumber);
                        }
                        if (colStyle !== null) {
                            // check color for either cell or row
                            if (colorState.cell || colorState.row || colorState.rowcolumn) {
                                // bgColor = _this.colorState.cell;
                                bgColor = this.getColorForValue(value, colStyle);
                                bgColorIndex = this.getColorIndexForValue(value, colStyle);
                                color = 'white';
                            }
                            // just the value color is set
                            if (colorState.value) {
                                //color = _this.colorState.value;
                                color = this.getColorForValue(value, colStyle);
                                colorIndex = this.getColorIndexForValue(value, colStyle);
                            }
                        }
                        return {
                            bgColor: bgColor,
                            bgColorIndex: bgColorIndex,
                            color: color,
                            colorIndex: colorIndex
                        };
                    }
                }, {
                    key: 'render',
                    value: function render() {
                        var tableHolderId = '#datatable-panel-table-' + this.panel.id;
                        try {
                            if ($.fn.dataTable.isDataTable(tableHolderId)) {
                                var aDT = $(tableHolderId).DataTable();
                                aDT.destroy();
                                $(tableHolderId).empty();
                            }
                        } catch (err) {
                            console.log("Exception: " + err.message);
                        }

                        if (this.panel.emptyData) {
                            return;
                        }
                        if (this.table.columns.length === 0) return;
                        var columns = [];
                        var columnDefs = [];
                        var _this = this;
                        var rowNumberOffset = 0;
                        if (this.panel.rowNumbersEnabled) {
                            rowNumberOffset = 1;
                            columns.push({
                                title: '',
                                type: 'number'
                            });
                            columnDefs.push({
                                "searchable": false,
                                "orderable": false,
                                "targets": 0,
                                "width": "1%"
                            });
                        }
                        for (var _i = 0; _i < this.table.columns.length; _i++) {
                            /* jshint loopfunc: true */
                            var style = this.getStyleForColumn(_i);

                            columns.push({
                                title: style != void 0 && style.header != void 0 ? style.header : this.table.columns[_i].text,
                                type: this.table.columns[_i].type
                            });
                            columnDefs.push({
                                "targets": _i + rowNumberOffset,
                                "visible": this.panel.columns[_i] && this.panel.columns[_i].visible ? true : false,
                                "createdCell": function createdCell(td, cellData, rowData, row, col) {
                                    // hidden columns have null data
                                    if (cellData === null) return;
                                    // set the fontsize for the cell
                                    $(td).css('font-size', _this.panel.fontSize);
                                    // undefined types should have numerical data, any others are already formatted
                                    var actualColumn = col;
                                    if (_this.panel.rowNumbersEnabled) {
                                        actualColumn -= 1;
                                    }
                                    if (_this.table.columns[actualColumn].type !== undefined) return;
                                    // for coloring rows, get the "worst" threshold
                                    var rowColor = null;
                                    var color = null;
                                    var rowColorIndex = null;
                                    var rowColorData = null;
                                    if (_this.colorState.row) {
                                        // run all of the rowData through threshold check, get the "highest" index
                                        // and use that for the entire row
                                        if (rowData === null) return;
                                        rowColorIndex = -1;
                                        rowColorData = null;
                                        rowColor = _this.colorState.row;
                                        // this should be configurable...
                                        color = 'white';
                                        for (var columnNumber = 0; columnNumber < _this.table.columns.length; columnNumber++) {
                                            // only columns of type undefined are checked
                                            if (_this.table.columns[columnNumber].type === undefined) {
                                                rowColorData = _this.getCellColors(_this.colorState, columnNumber, rowData[columnNumber + rowNumberOffset]);
                                                if (rowColorData.bgColorIndex !== null) {
                                                    if (rowColorData.bgColorIndex > rowColorIndex) {
                                                        rowColorIndex = rowColorData.bgColorIndex;
                                                        rowColor = rowColorData.bgColor;
                                                    }
                                                }
                                            }
                                        }
                                        // style the entire row (the parent of the td is the tr)
                                        // this will color the rowNumber and Timestamp also
                                        $(td.parentNode).children().css('color', color);
                                        $(td.parentNode).children().css('background-color', rowColor);
                                    }

                                    if (_this.colorState.rowcolumn) {
                                        // run all of the rowData through threshold check, get the "highest" index
                                        // and use that for the entire row
                                        if (rowData === null) return;
                                        rowColorIndex = -1;
                                        rowColorData = null;
                                        rowColor = _this.colorState.rowcolumn;
                                        // this should be configurable...
                                        color = 'white';
                                        for (var _columnNumber = 0; _columnNumber < _this.table.columns.length; _columnNumber++) {
                                            // only columns of type undefined are checked
                                            if (_this.table.columns[_columnNumber].type === undefined) {
                                                rowColorData = _this.getCellColors(_this.colorState, _columnNumber, rowData[_columnNumber + rowNumberOffset]);
                                                if (rowColorData.bgColorIndex !== null) {
                                                    if (rowColorData.bgColorIndex > rowColorIndex) {
                                                        rowColorIndex = rowColorData.bgColorIndex;
                                                        rowColor = rowColorData.bgColor;
                                                    }
                                                }
                                            }
                                        }
                                        // style the rowNumber and Timestamp column
                                        // the cell colors will be determined in the next phase
                                        if (_this.table.columns[0].type !== undefined) {
                                            var children = $(td.parentNode).children();
                                            var aChild = children[0];
                                            $(aChild).css('color', color);
                                            $(aChild).css('background-color', rowColor);
                                            // the 0 column contains the row number, if they are enabled
                                            // then the above just filled in the color for the row number,
                                            // now take care of the timestamp
                                            if (_this.panel.rowNumbersEnabled) {
                                                aChild = children[1];
                                                $(aChild).css('color', color);
                                                $(aChild).css('background-color', rowColor);
                                            }
                                        }
                                    }

                                    // Process cell coloring
                                    // Two scenarios:
                                    //    1) Cell coloring is enabled, the above row color is skipped
                                    //    2) RowColumn is enabled, the above row color is process, but we also
                                    //    set the cell colors individually
                                    var colorData = _this.getCellColors(_this.colorState, actualColumn, cellData);
                                    if (_this.colorState.cell || _this.colorState.rowcolumn) {
                                        if (colorData.color !== undefined) {
                                            $(td).css('color', colorData.color);
                                        }
                                        if (colorData.bgColor !== undefined) {
                                            $(td).css('background-color', colorData.bgColor);
                                        }
                                    } else if (_this.colorState.value) {
                                        if (colorData.color !== undefined) {
                                            $(td).css('color', colorData.color);
                                        }
                                    }
                                }
                            });

                            if (this.panel.lengthChangeEnabled && this.panel.responsive.hiddenColumns) {
                                for (var j = 0; j < this.panel.responsive.hiddenColumns.length; j++) {
                                    if (this.panel.responsive.hiddenColumns[j].text === this.table.columns[_i].text) {
                                        if (this.panel.rowNumbersEnabled) {
                                            columnDefs.push({ responsivePriority: 10000 + j, targets: _i + 1 });
                                        } else {
                                            columnDefs.push({ responsivePriority: 10000 + j, targets: _i });
                                        }
                                    }
                                }
                            }
                        }

                        // sanity check
                        // annotations come back as 4 items in an array per row. If the first row content is undefined, then modify to empty
                        // since datatables.net throws errors
                        if (this.table.rows[0].length === 4) {
                            if (this.table.rows[0][0] === undefined) {
                                // detected empty annotations
                                this.table.rows = [];
                            }
                        }
                        // pass the formatted rows into the datatable
                        var formattedData = this.generateFormattedData(this.table.rows);

                        if (this.panel.rowNumbersEnabled) {
                            // shift the data to the right
                        }
                        var panelHeight = this.panel.panelHeight;
                        var orderSetting = [[0, 'desc']];
                        if (this.panel.sortField !== null) {
                            for (var i = 0; i < this.panel.columns.length; i++) {
                                if (this.panel.columns[i].value === this.panel.sortField) {
                                    if (this.panel.rowNumbersEnabled) {
                                        orderSetting = [[i + 1, this.panel.sortDirection]];
                                    } else {
                                        orderSetting = [[i, this.panel.sortDirection]];
                                    }
                                    break;
                                }
                            }
                        } else if (this.panel.rowNumbersEnabled) {
                            // when row numbers are enabled, show them ascending
                            orderSetting = [[0, 'asc']];
                        }

                        var tableOptions = {
                            dom: "lBfrtip",
                            stateSave: true,
                            "lengthMenu": [[5, 10, 15, 25, 50, 75, 100, -1], [5, 10, 15, 25, 50, 75, 100, "All"]],
                            searching: this.panel.searchEnabled,
                            info: this.panel.infoEnabled,
                            lengthChange: this.panel.lengthChangeEnabled,
                            scrollCollapse: false,
                            saveState: true,
                            data: formattedData,
                            columns: columns,
                            columnDefs: columnDefs,
                            "search": {
                                "regex": true
                            },
                            "order": orderSetting,
                            responsive: this.panel.responsive.enable,
                            buttons: [],
                            fixedColumns: {
                                leftColumns: 0,
                                rightColumns: 0
                            }
                        };

                        if (this.panel.scroll) {
                            tableOptions.paging = false;
                            tableOptions.scrollY = panelHeight;
                            tableOptions.scrollCollapse = true;
                        } else {
                            tableOptions.paging = true;
                            tableOptions.pagingType = this.panel.datatablePagingType;
                        }

                        if (this.panel.scrollx) {
                            tableOptions.scrollX = this.panel.scrollx;
                        }

                        if (this.panel.leftColumns) {
                            tableOptions.fixedColumns.leftColumns = this.panel.leftColumns;
                        }

                        if (this.panel.rightColumns) {
                            tableOptions.fixedColumns.rightColumns = this.panel.rightColumns;
                        }

                        if (this.panel.buttons.collection) {
                            tableOptions.buttons.push("collection");
                        }

                        if (this.panel.buttons.columnsToggle) {
                            tableOptions.buttons.push("columnsToggle");
                        }

                        if (this.panel.buttons.columnsVisibility) {
                            tableOptions.buttons.push("columnsVisibility");
                        }

                        if (this.panel.buttons.columnToggle) {
                            tableOptions.buttons.push("columnToggle");
                        }

                        if (this.panel.buttons.columnVisibility) {
                            tableOptions.buttons.push("columnVisibility");
                        }

                        if (this.panel.buttons.colvis) {
                            tableOptions.buttons.push("colvis");
                        }

                        if (this.panel.buttons.colvisGroup) {
                            tableOptions.buttons.push("colvisGroup");
                        }

                        if (this.panel.buttons.colvisRestore) {
                            tableOptions.buttons.push("colvisRestore");
                        }

                        if (this.panel.buttons.copy) {
                            tableOptions.buttons.push("copy");
                        }

                        if (this.panel.buttons.copyHtml5) {
                            tableOptions.buttons.push("copyHtml5");
                        }

                        if (this.panel.buttons.print) {
                            tableOptions.buttons.push("print");
                        }

                        if (this.panel.buttons.pageLength) {
                            tableOptions.buttons.push("pageLength");
                        }

                        if (this.panel.buttons.csv) {
                            tableOptions.buttons.push("csv");
                        }

                        if (this.panel.buttons.csvHtml5) {
                            tableOptions.buttons.push("csvHtml5");
                        }

                        if (this.panel.buttons.excel) {
                            tableOptions.buttons.push("excel");
                        }

                        if (this.panel.buttons.excelHtml5) {
                            tableOptions.buttons.push("excelHtml5");
                        }

                        if (this.panel.buttons.pdf) {
                            tableOptions.buttons.push("pdf");
                        }

                        if (this.panel.buttons.pdfHtml5) {
                            tableOptions.buttons.push("pdfHtml5");
                        }

                        if (this.panel.buttons.selectAll) {
                            tableOptions.buttons.push("selectAll");
                        }

                        if (this.panel.buttons.selectNone) {
                            tableOptions.buttons.push("selectNone");
                        }

                        if (this.panel.buttons.selectCells) {
                            tableOptions.buttons.push("selectCells");
                        }

                        if (this.panel.buttons.selectColumns) {
                            tableOptions.buttons.push("selectColumns");
                        }

                        if (this.panel.buttons.selectRows) {
                            tableOptions.buttons.push("selectRows");
                        }

                        //Hide Empty Columns
                        if (this.panel.hideEmptyCols.enable) {
                            var hideEmptyCols = {
                                trim: this.panel.hideEmptyCols.trim,
                                perPage: this.panel.hideEmptyCols.perPage,
                                emptyVals: "N/A"
                            };
                            if (this.panel.hideEmptyCols.emptyVals != null) {
                                hideEmptyCols.emptyVals = this.panel.hideEmptyCols.emptyVals.split(",");
                            }
                            tableOptions.hideEmptyCols = hideEmptyCols;
                        }

                        var newDT = $('#datatable-panel-table-' + this.panel.id).DataTable(tableOptions);

                        // hide columns that are marked hidden
                        for (var _i2 = 0; _i2 < this.table.columns.length; _i2++) {
                            if (this.table.columns[_i2].hidden) {
                                newDT.column(_i2 + rowNumberOffset).visible(false);
                            }
                        }

                        // enable compact mode
                        if (this.panel.compactRowsEnabled) {
                            $('#datatable-panel-table-' + this.panel.id).addClass('compact');
                        }
                        // enable striped mode
                        if (this.panel.stripedRowsEnabled) {
                            $('#datatable-panel-table-' + this.panel.id).addClass('stripe');
                        }
                        if (this.panel.hoverEnabled) {
                            $('#datatable-panel-table-' + this.panel.id).addClass('hover');
                        }
                        if (this.panel.orderColumnEnabled) {
                            $('#datatable-panel-table-' + this.panel.id).addClass('order-column');
                        }
                        // these two are mutually exclusive
                        if (this.panel.showCellBorders) {
                            $('#datatable-panel-table-' + this.panel.id).addClass('cell-border');
                        } else {
                            if (this.panel.showRowBorders) {
                                $('#datatable-panel-table-' + this.panel.id).addClass('row-border');
                            }
                        }
                        if (!this.panel.scroll) {
                            // set the page size
                            var page_length = $("select[name=datatable-panel-table-" + this.panel.id + "_length]")[0];
                            if (page_length !== null && page_length.value !== null) {
                                newDT.page.len(page_length.value).draw();
                            } else if (this.panel.rowsPerPage !== null) {
                                newDT.page.len(this.panel.rowsPerPage).draw();
                            }
                        }
                        // function to display row numbers
                        if (this.panel.rowNumbersEnabled) {
                            newDT.on('order.dt search.dt', function () {
                                newDT.column(0, { search: 'applied', order: 'applied' }).nodes().each(function (cell, i) {
                                    cell.innerHTML = i + 1;
                                });
                            }).draw();
                        }
                    }
                }, {
                    key: 'shortenText',
                    value: function shortenText(text, lenth) {
                        if (!text || text.length <= 0 || !lenth || length < 0 || text.length < lenth) {
                            return text;
                        }
                        var size = lenth / 2;
                        return text.substr(0, size) + '...' + text.substr(text.length - size);
                    }
                }, {
                    key: 'formatText',
                    value: function formatText(text, lenth) {
                        if (!text || text.length <= 0 || !lenth || length < 0) {
                            return text;
                        }
                        return '<div title="' + text + '">' + this.shortenText(text, lenth) + '</div>';
                    }
                }, {
                    key: 'formatDrilldown',
                    value: function formatDrilldown(columnHeader, row, columnIndex, value, panel, linkSrv) {
                        var style = this.getStyleForColumn(columnIndex);
                        var textLength = style.maxLength;

                        if (!panel.drilldowns || !linkSrv) {
                            return this.formatText(value, textLength);
                        }

                        for (var y = 0; y < panel.drilldowns.length; y++) {
                            var drilldown = panel.drilldowns[y];
                            var regexp = new RegExp(drilldown.alias);
                            var columnText = columnHeader[columnIndex].text;
                            if (regexp.test(columnText)) {

                                var scopedVars = {};
                                for (var j = 0; j < columnHeader.length; j++) {
                                    scopedVars[columnHeader[j].text] = { "value": row[j] };
                                }

                                if (drilldown.separator && drilldown.separator.trim().length > 0) {
                                    var values = value.split(new RegExp(drilldown.separator));
                                    for (var i = 0; i < values.length; i++) {
                                        scopedVars["alias" + i] = { "value": values[i] };
                                    }
                                }

                                //add panel.scopedVars for repeat var
                                if (panel.repeat && panel.scopedVars[panel.repeat] && panel.scopedVars[panel.repeat].value) {
                                    scopedVars[panel.repeat] = panel.scopedVars[panel.repeat].value;
                                }

                                var link = linkSrv.getPanelLinkAnchorInfo(drilldown, scopedVars);

                                return '<a class="panel-menu-link" style="color:#33B5E5;" target="' + link.target + '" href="' + link.href + '" title="' + link.title + '">' + this.shortenText(link.title, textLength) + '</a>';
                            }
                        }

                        return this.formatText(value, textLength);
                    }
                }, {
                    key: 'render_values',
                    value: function render_values() {
                        var rows = [];

                        for (var y = 0; y < this.table.rows.length; y++) {
                            var row = this.table.rows[y];
                            var new_row = [];
                            for (var i = 0; i < this.table.columns.length; i++) {
                                new_row.push(this.formatColumnValue(i, row[i]));
                            }
                            rows.push(new_row);
                        }
                        return {
                            columns: this.table.columns,
                            rows: rows
                        };
                    }
                }]);

                return DatatableRenderer;
            }());

            _export('DatatableRenderer', DatatableRenderer);
        }
    };
});
//# sourceMappingURL=renderer.js.map
