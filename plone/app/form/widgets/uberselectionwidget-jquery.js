var uberselectionwidget = function() {
    // Delay in milliseconds until the search starts after the last key was
    // pressed. This keeps the number of requests to the server low.
    var _search_delay = 400;
    // Delay in milliseconds until the results window closes after the
    // searchbox looses focus.
    var _hide_delay = 400;

    // stores information for each searchbox on the page
    var _search_handlers = {};

    function _searchfactory($form, $widget, $inputnode) {
        // returns the search functions in a dictionary.
        // we need a factory to get a local scope for the event, this is
        // necessary, because IE doesn't have a way to get the target of
        // an event in a way we need it.
        var $lastsearch = null;
        var $request = null;

        function _hide() {
            // hides the result window
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $$result.hide();
            $lastsearch = null;
        };

        function _show($data) {
            // shows the result
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            if (!$$result || $$result.length < 1) {
                $widget.append($data);
            } else {
                if ($data) {
                    $$result.replaceWith($data);
                } else {
                    $$result.show();
                };
            };
            $$result.show();
        };

        function _search() {
            // does the actual search
            if ($lastsearch == $inputnode.value) {
                // do nothing if the input didn't change
                return;
            }
            $lastsearch = $inputnode.value;
            
            if ($request && $request.readyState < 4)
                // abort any pending request
                $request.abort();
                
            // Do nothing as long as we have less then two characters - 
            // the search results makes no sense, and it's harder on the server.
            if ($inputnode.value.length < 2 && $inputnode.value != '') {
                _hide();
                return;
            }
            
            var $$query = {
                formname: 'test_form',
                fieldname: 'form.usw_single_test',
                searchterm: $inputnode.value
            };
            // turn into a string for use as a cache key
            $$query = $.param($$query);

            // the search request (retrieve as text, not a document)
            $request = $.get('uberselectionwidget_refresh_search2', $$query, function($data) {
                // show results if there are any and cache them
                _show($data);
            }, 'text');
        };

        function _browse($target) {
            if (!$target)
                $target = '';

            $lastsearch = null;

            var $$query = {
                formname: 'test_form',
                fieldname: 'form.usw_single_test',
                target: $target
            };
            // turn into a string for use as a cache key
            $$query = $.param($$query);

            // the search request (retrieve as text, not a document)
            $request = $.get('uberselectionwidget_refresh_browse2', $$query, function($data) {
                // show results if there are any and cache them
                _show($data);
            }, 'text');
        };

        function _search_delayed() {
            // search after a small delay, used by onfocus
            window.setTimeout(
                'uberselectionwidget.search("' + $widget.attr('id') + '")', 
                _search_delay);
        };

        return {
            hide: _hide,
            search: _search,
            browse: _browse,
            search_delayed: _search_delayed
        };
    };

    function _keyhandlerfactory($widget) {
        // returns the key event handler functions in a dictionary.
        // we need a factory to get a local scope for the event, this is
        // necessary, because IE doesn't have a way to get the target of
        // an event in a way we need it.
        var $timeout = null;

        function _keyUp() {
            // select the previous element
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight').removeClass('highlight');
            $prev = $cur.prev('li');
            if (!$prev.length) $prev = $$result.find('li:last');
            $prev.addClass('highlight');
            return false;
        };

        function _keyDown() {
            // select the next element
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight').removeClass('highlight');
            $next = $cur.next('li');
            if (!$next.length) $next = $$result.find('li:first');
            $next.addClass('highlight');
            return false;
        };

        function _keyLeft() {
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight');
            if (!$cur || $cur.length < 1)
                return true;
            var $target = $cur[0].attributes['usw-parent'];
            if (!$target)
                return true;
            _search_handlers[$widget.attr('id')].browse($target.nodeValue);
            return false;
        };

        function _keyRight() {
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight');
            if (!$cur || $cur.length < 1)
                return true;
            var $target = $cur[0].attributes['usw-browse'];
            if (!$target)
                return true;
            _search_handlers[$widget.attr('id')].browse($target.nodeValue);
            return false;
        };

        function _keyEscape() {
            // hide results window
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $$result.find('li.highlight').removeClass('highlight');
            $$result.hide();
        };

        function _handler($event) {
            // dispatch to specific functions and handle the search timer
            window.clearTimeout($timeout);
            switch ($event.keyCode) {
                case 38: return _keyUp();
                case 40: return _keyDown();
                case 27: return _keyEscape();
                case 37: return _keyLeft();
                case 39: return _keyRight();
                case 9: break; // Tab
                default: {
                    console.log($event.keyCode);
                    $timeout = window.setTimeout(
                        'uberselectionwidget.search("' + $widget.attr('id') + '")',
                        _search_delay);
                }
            }
        };

        function _submit() {
            // check whether a search result was selected with the keyboard
            // and open it
            var $$result = $widget.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            var $target = null;//$$result.find('li.highlight a').attr('href');
            if (!$target) return;
            window.location = $target;
            return false;
        };

        return {
            handler: _handler,
            submit: _submit
        }
    };

    function _setup(i) {
        // add an id which is used by other functions to find the correct node
        var $id = 'uberselectionwidget' + i;
        console.log($id);
        var $form = $(this).parents('form:first');
        var $widget = $(this).parents('div.widget:first');
        var $key_handler = _keyhandlerfactory($widget);
        _search_handlers[$id] = _searchfactory($form, $widget, this);
        console.log(_search_handlers);

        $widget.attr('id', $id);
        $(this).attr('autocomplete','off')
               .keydown($key_handler.handler)
               .focus(_search_handlers[$id].search_delayed)
               .blur(_search_handlers[$id].hide);
    };

    $(function() {
        $('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults')
            .each(function () {
                // the "hide" function doesn't work on Safari
                this.style.display = "none";
            });
        $('input.uberSelectionWidgetInput').each(_setup);
    });

    return {
        search: function(id) {
            console.log('search '+id);
            _search_handlers[id].search();
        },
        hide: function(id) {
            console.log('hide '+id);
            _search_handlers[id].hide();
        }
    };
}();