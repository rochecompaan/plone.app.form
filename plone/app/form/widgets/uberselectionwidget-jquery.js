var uberselectionwidget = function() {
    // Delay in milliseconds until the search starts after the last key was
    // pressed. This keeps the number of requests to the server low.
    var _search_delay = 400;
    // Delay in milliseconds until the results window closes after the
    // searchbox looses focus.
    var _hide_delay = 400;

    // stores information for each searchbox on the page
    var _search_handlers = {};

    function _searchfactory($form, $$field, $inputnode) {
        // returns the search functions in a dictionary.
        // we need a factory to get a local scope for the event, this is
        // necessary, because IE doesn't have a way to get the target of
        // an event in a way we need it.
        var $lastsearch = null;
        var $request = null;

        function _hide() {
            // hides the result window
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $$result.remove();
            $lastsearch = null;
        };

        function _show($data) {
            // shows the result
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            if (!$$result || $$result.length < 1) {
                var $widget = $$field.find('div.widget');
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

            var formname = $.grep($form.attr('class').split(' '),
                                  function(v) {
                                      return v.indexOf('kssattr-formname-') == 0;
                                  }).join('').slice(17);
            var fieldname = $.grep($$field.attr('class').split(' '),
                                  function(v) {
                                      return v.indexOf('kssattr-fieldname-') == 0;
                                  }).join('').slice(18);
            var $$query = {
                formname: formname,
                fieldname: fieldname,
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

            var formname = $.grep($form.attr('class').split(' '),
                                  function(v) {
                                      return v.indexOf('kssattr-formname-') == 0;
                                  }).join('').slice(17);
            var fieldname = $.grep($$field.attr('class').split(' '),
                                  function(v) {
                                      return v.indexOf('kssattr-fieldname-') == 0;
                                  }).join('').slice(18);
            var $$query = {
                formname: formname,
                fieldname: fieldname,
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
                'uberselectionwidget.search("' + $$field.attr('id') + '")', 
                _search_delay);
        };

        return {
            hide: _hide,
            search: _search,
            browse: _browse,
            search_delayed: _search_delayed
        };
    };

    function _keyhandlerfactory($$field) {
        // returns the key event handler functions in a dictionary.
        // we need a factory to get a local scope for the event, this is
        // necessary, because IE doesn't have a way to get the target of
        // an event in a way we need it.
        var $timeout = null;

        function _keyUp() {
            // select the previous element
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight').removeClass('highlight');
            $prev = $cur.prev('li');
            if (!$prev.length) $prev = $$result.find('li:last');
            $prev.addClass('highlight');
            return false;
        };

        function _keyDown() {
            // select the next element
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight').removeClass('highlight');
            $next = $cur.next('li');
            if (!$next.length) $next = $$result.find('li:first');
            $next.addClass('highlight');
            return false;
        };

        function _keyLeft() {
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight');
            if (!$cur || $cur.length < 1)
                return true;
            var $target = $cur[0].attributes['usw-parent'];
            if (!$target)
                return true;
            _search_handlers[$$field.attr('id')].browse($target.nodeValue);
            return false;
        };

        function _keyRight() {
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            $cur = $$result.find('li.highlight');
            if (!$cur || $cur.length < 1)
                return true;
            var $target = $cur[0].attributes['usw-browse'];
            if (!$target)
                return true;
            _search_handlers[$$field.attr('id')].browse($target.nodeValue);
            return false;
        };

        function _keyEscape() {
            // hide results window
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
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
                case 13: return _submit();
                case 9: break; // Tab
                default: {
                    console.log($event.keyCode);
                    $timeout = window.setTimeout(
                        'uberselectionwidget.search("' + $$field.attr('id') + '")',
                        _search_delay);
                }
            }
        };

        function _submit() {
            // check whether a search result was selected with the keyboard
            // and open it
            var $$result = $$field.find('fieldset.uberselectionWidgetResults, ul.uberselectionWidgetResults');
            var $target = $$result.find('li.highlight');
            if (!$target || $target.length < 1) {
                return true;
            }
            var $fieldname = $target.find('input').attr('name');
            var $value = $target.find('input').attr('value');
            var $$title = $target.find('span.title').text();
            var $description = $target.find('span.description').text();
            var $selection = $$field.find('fieldset.uberselectionWidgetSelection, ul.uberselectionWidgetSelection');
            if (!$selection || $selection.length < 1) {
                var $widget = $$field.find('div.widget');
                $selection = $(document.createElement('ul')).addClass('uberselectionWidgetSelection');
                $widget.prepend($selection);
                console.log($selection);
            }
            if ($selection.find('input').is('[value='+$value+']')) {
                return false;
            }
            $selection.append(
                $(document.createElement('div'))
                    .append(
                        $(document.createElement('input'))
                            .attr('type', 'checkbox')
                            .attr('name', $fieldname)
                            .attr('value', $value)
                            .attr('checked', 'checked')
                        )
                    .append(
                        $(document.createElement('span'))
                            .text($$title)
                            .attr('title', $description)
                        )
                );
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
        var $form = $(this).parents('form:first');
        var $$field = $(this).parents('div.field:first');
        var $key_handler = _keyhandlerfactory($$field);
        _search_handlers[$id] = _searchfactory($form, $$field, this);

        $$field.attr('id', $id);
        $(this).attr('autocomplete','off')
               .keydown($key_handler.handler)
               .focus(_search_handlers[$id].search_delayed)
               .blur(_search_handlers[$id].hide);
        // make sure there is only ever one of our submit handlers bound
        $form.unbind('submit',$key_handler.submit);
        $form.submit($key_handler.submit);
        // shut up the double submit warning
        $$field.find(":submit").addClass('allowMultiSubmit');
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
            _search_handlers[id].search();
        },
        hide: function(id) {
            _search_handlers[id].hide();
        }
    };
}();