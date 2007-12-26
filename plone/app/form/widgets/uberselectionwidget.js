/* uberselection widget */

kukit.actionsGlobalRegistry.register("uberselectionwidget-arrowup", function(oper) {
    oper.evaluateParameters(['fieldname'], {}, 'uberselectionwidget-arrowup action');
    var fieldname = oper.parms.fieldname;
    var results = cssQuery('ul.uberselectionWidgetResults li, #uberselectionwidget-' + fieldname);
    var hlclass = 'highlight';
    var i;
    if (results.length == 0) {
      return;
    }
    for (i = 0; i < results.length; i++) {
        if (hasClassName(results[i], hlclass)) {
            removeClassName(results[i], hlclass);
            i = i - 1;
            break;
        }
    }
    if (i < 0 || i >= results.length) {
        i = results.length - 1;
    }
    addClassName(results[i], hlclass);
    /* fix scroll position */
    var top = results[i].offsetTop;
    var bottom = top + results[i].offsetHeight;
    var parent = results[i].parentNode;
    parent.scrollTop = Math.min(top, parent.scrollTop);
    parent.scrollTop = Math.max(bottom - parent.offsetHeight, parent.scrollTop);
    var param = results[i].getAttribute('usw-parent');
    kukit.engine.stateVariables['usw-parent'] = (param == null ? '' : param);
    param = results[i].getAttribute('usw-browse');
    kukit.engine.stateVariables['usw-browse'] = (param == null ? '' : param);
});
kukit.commandsGlobalRegistry.registerFromAction('uberselectionwidget-arrowup',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register("uberselectionwidget-arrowdown", function(oper) {
    oper.evaluateParameters(['fieldname'], {}, 'uberselectionwidget-arrowdown action');
    var fieldname = oper.parms.fieldname;
    var results = cssQuery('ul.uberselectionWidgetResults li, #uberselectionwidget-' + fieldname);
    var hlclass = 'highlight';
    var i;
    if (results.length == 0) {
      return;
    }
    for (i = 0; i < results.length; i++) {
        if (hasClassName(results[i], hlclass)) {
            removeClassName(results[i], hlclass);
            i = i + 1;
            break;
        }
    }
    if (i >= results.length) {
        i = 0;
    }
    addClassName(results[i], hlclass);
    /* fix scroll position */
    var top = results[i].offsetTop;
    var bottom = top + results[i].offsetHeight;
    var parent = results[i].parentNode;
    parent.scrollTop = Math.min(top, parent.scrollTop);
    parent.scrollTop = Math.max(bottom - parent.offsetHeight, parent.scrollTop);
    var param = results[i].getAttribute('usw-parent');
    kukit.engine.stateVariables['usw-parent'] = (param == null ? '' : param);
    param = results[i].getAttribute('usw-browse');
    kukit.engine.stateVariables['usw-browse'] = (param == null ? '' : param);
});
kukit.commandsGlobalRegistry.registerFromAction('uberselectionwidget-arrowdown',
    kukit.cr.makeSelectorCommand);

