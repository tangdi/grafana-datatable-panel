;(function (window, document, $) {
    // On DT Initialization
    $(document).on('init.dt', function (e, dtSettings) {
        if (e.namespace !== 'dt')
            return;

        // Check for either hideEmptyCols or hideEmptyColumns
        var options = dtSettings.oInit.hideEmptyCols || dtSettings.oInit.hideEmptyColumns;

        // If neither of the above settings are found, then call it quits
        if (!options)
            return;

        // Helper function to get the value of a config item
        var _cfgItem = function (item, def) {
            if ($.isPlainObject(options) && typeof options[item] !== 'undefined')
                return options[item];

            return def;
        };

        // Gather all the setting values which will be used
        var api = new $.fn.dataTable.Api(dtSettings),
            emptyCount = 0,
            colList = [],
            isWhiteList = !_cfgItem('whiteList', false),
            perPage = _cfgItem('perPage'),
            trimData = _cfgItem('trim', true),
            onStateLoad = _cfgItem('onStateLoad', true);

        // Helper function to determine if a cell is empty (including processing custom empty values)
        var _isEmpty = function (colData) {
            // Trim the data (unless its set to false)
            if (trimData)
                colData = $.trim(colData);

            // Basic check
            if (colData === null || colData.length === 0)
                return true;

            // Default to false, any empty matches will reset to true
            var retVal = false;

            var emptyVals = _cfgItem('emptyVals');

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
        };

        // If the hideEmptyCols setting is an Array (of column indexes to target)
        if ($.isArray(options)) {
            // And its populated..
            if (options.length !== 0) {
                $.each(options, function (k, i) {
                    // Try to get the real column index from whatever was configured
                    var indx = api.column(i).index();

                    colList.push(typeof indx !== 'undefined' ? indx : i);
                });
            }
            else {
                // Otherwise, quit! since its just an empty array
                return;
            }
        }

        // If hideEmptyCols setting is an Object (of plugin settings)
        else if ($.isPlainObject(options)) {
            // If options.columns isnt specifically
            if (typeof options.columns === 'undefined' || options.columns === true) {
                // Set colList to true, enabling every column as a target
                colList = api.columns().indexes().toArray();
            }

            // If its an array, then it should contain the column indexs, so use that
            else if ($.isArray(options.columns)) {
                // Otherwise, set the colList
                colList = options.columns;
            }

            // If `options.columns` isn't an array (of indexes) or a boolean (disable/enable all columns),
            // then throw a hissy fit
            else if (typeof options.columns !== 'boolean') {
                console.error('[Hide Empty Columns]: Expected typeof `columns` setting value to be an array, boolean or undefined, but received value type "%s"', typeof options.columns);
                return;
            }

            // The only thing left could be if its false, so just stop all together
            else {
                return;
            }
        }

        // If its just a basic 'true' targeting all columns..
        else if (options === true) {
            // .. Then get the list of all column indexes
            colList = api.columns().indexes().toArray();
        }

        // Anything else should just go away
        else {
            return;
        }

        // Function to check the column rows
        var _checkColumns = function () {
            var info = api.page.info(),
                colFilter = (perPage ? {search: 'applied'} : undefined);

            // Iterate through the table, column by column
            //api.columns({ search: 'applied' }).every(function () {
            api.columns(colFilter).every(function () {
                emptyCount = 0;

                // If the current column is *not* found in the list..
                if ($.inArray(this.index(), colList) === -1 &&
                    $.inArray(api.column(this.index()).dataSrc(), colList) === -1)
                {
                    // .. And the list type is whitelist, then skip this loop
                    if (isWhiteList === true) return;
                }
                // If the current column *is* found in the list..
                else {
                    // .. And the list type is blacklist, then skip this loop
                    if (isWhiteList === false) return;
                }

                // This gets ALL data in current column.. Need just the visible rows
                var data = this.data().toArray(),
                    isVis = false,
                    intStart = (perPage === true && info.serverSide === false ? info.start : 0),
                    intStop = (perPage === true && info.serverSide === false ? info.end : data.length),
                    dtState = api.state.loaded();

                //for( var i = 0; i < data.length; i ++ ) {
                for (var i = intStart; i < intStop; i++) {
                    if (!_isEmpty(data[i])) {
                        isVis = true;
                        break;
                    }
                }

                // If the # of empty is the same as the length, then no values in col were found
                api.column(this.index()).visible(isVis);
            });
        };

        // If stateSave is enabled in this DT instance, then toggle the column visibility afterwords
        if (onStateLoad === true)
            api.on('stateLoadParams.dt', _checkColumns);

        // If were checking for each page, then attach functions to any events that may introduce or remove new
        // columns/rows from the table (page, order, search and length)
        if (perPage === true)
            api
                .on('page.dt', _checkColumns)
                .on('search.dt', _checkColumns)
                .on('order.dt', _checkColumns)
                .on('length.dt', _checkColumns)
                .on('draw.dt', _checkColumns); // trigge;rs after data loaded with AJAX

        // Run check for the initial page load
        _checkColumns();
    });
})(window, document, jQuery);