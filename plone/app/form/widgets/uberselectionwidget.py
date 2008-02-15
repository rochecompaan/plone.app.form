from zope.schema.interfaces import ValidationError
from zope.component import getMultiAdapter

from zope.app.form.interfaces import WidgetInputError
from zope.app.form.browser.interfaces import \
    ISourceQueryView, ITerms, IWidgetInputErrorView
from zope.app.form.browser.widget import SimpleInputWidget
from zope.app.pagetemplate.viewpagetemplatefile import ViewPageTemplateFile

from zope.formlib import form as formlib

from plone.app.vocabularies.interfaces import IBrowsableTerm

from kss.core import kssaction
from plone.app.kss.plonekssview import PloneKSSView

from Acquisition import aq_inner

class UberSelectionWidget(SimpleInputWidget):
    _error = None

    template = ViewPageTemplateFile('uberselectionwidget.pt')

    def __init__(self, field, request):
        SimpleInputWidget.__init__(self, field, request)
        self.source = field.source
        self.terms = getMultiAdapter((self.source, self.request), ITerms)
        self.queryview = getMultiAdapter((self.source, self.request), ISourceQueryView)

    def _value(self):
        if self._renderedValueSet():
            value = self._data
        else:
            token = self.request.form.get(self.name)

            if token is not None and token != '':
                if not isinstance(token, basestring):
                    token = token[-1]
                try:
                    value = self.terms.getValue(str(token))
                except LookupError:
                    value = self.context.missing_value
            else:
                value = self.context.missing_value

        return value

    def _getRenderValue(self):
        value = self._value()
        if value is not None:
            value = self.terms.getTerm(value)
        return value

    def hidden(self):
        value = self._value()
        if value == self.context.missing_value:
            return '' # Nothing to hide ;)

        try:
            term = self.terms.getTerm(value)
        except LookupError:
            # A value was set, but it's not valid.  Treat
            # it as if it was missing and return nothing.
            return ''

        return '<input type="hidden" name="%s" value="%s" />' % (self.name, term.token)

    def error(self):
        if self._error:
            return getMultiAdapter((self._error, self.request),
                                   IWidgetInputErrorView).snippet()
        return ""

    def __call__(self):
        value = self._getRenderValue()
        field = self.context
        results = []
        results_truncated = False
        qresults = self.queryview.results(self.name)
        if qresults is not None:
            for index, item in enumerate(qresults):
                if index >= 20:
                    results_truncated = True
                    break
                results.append(self.terms.getTerm(item))
        return self.template(field=field,
                             results=results,
                             results_truncated=results_truncated,
                             name=self.name,
                             value=value)

    def getInputValue(self):
        value = self._value()

        field = self.context

        # Remaining code copied from SimpleInputWidget

        # value must be valid per the field constraints
        try:
            field.validate(value)
        except ValidationError, err:
            self._error = WidgetInputError(field.__name__, self.label, err)
            raise self._error

        return value

    def hasInput(self):
        if self.name in self.request or self.name+'.displayed' in self.request:
            return True

        token = self.request.form.get(self.name)
        if token is not None:
            return True

        return False

class UberMultiSelectionWidget(UberSelectionWidget):
    template = ViewPageTemplateFile('ubermultiselectionwidget.pt')

    def __init__(self, field, request):
        SimpleInputWidget.__init__(self, field, request)
        self.source = field.value_type.source
        self.terms = getMultiAdapter((self.source, self.request), ITerms)
        self.queryview = getMultiAdapter((self.source, self.request), ISourceQueryView)

    def _value(self):
        if self._renderedValueSet():
            value = self._data
        else:
            tokens = self.request.form.get(self.name)

            if tokens is not None:
                value = []
                for token in tokens:
                    try:
                        v = self.terms.getValue(str(token))
                    except LookupError:
                        pass # skip invalid values
                    else:
                        value.append(v)
                # only keep unique items
                r = []
                seen = {}
                for s in value:
                    if s not in seen:
                        r.append(s)
                        seen[s] = 1
                value = r
            else:
                if self.name+'.displayed' in self.request:
                    value = []
                else:
                    value = self.context.missing_value

        return value

    def _getRenderValue(self):
        value = self._value()
        if value is not None:
            value = [self.terms.getTerm(x) for x in value]
        return value

class UberSelectionKSSView(PloneKSSView):
    """This view contains KSS actions to support the uber-selection widget
    """

    template = ViewPageTemplateFile('uberselectionwidget-results.pt')

    def search_and_insert_html(self, widget, fieldname):
        """ perform search and insert rendered results into widget space """
        results = widget.queryview.results(widget.name)
        if results is not None:
            results = [ widget.terms.getTerm(item) for item in results ]
        return self.template(results=results, name=fieldname)

    def refresh_search(self, formname, fieldname, searchterm):
        """Given a form (view) name, a widget name and the submitted
        search term, perform the search as the widget would and refresh the
        results area with this information.
        """
        widget = self._get_widget(formname, fieldname)
        self.request.form[widget.name + '.search'] = 'fakebutton'
        self.request.form[widget.name + '.query'] = searchterm
        return self.search_and_insert_html(widget, fieldname)

    def refresh_browse(self, formname, fieldname, target):
        """Given a form (view) name, a widget name and a target folder, 
        refresh the results area with the contents of the given target.
        """
        widget = self._get_widget(formname, fieldname)
        self.request.form[widget.name + '.browse.' + target] = 'fakebutton'
        self.request.form[widget.name + '.omitbrowsedfolder'] = 'true'
        return self.search_and_insert_html(widget, fieldname)

    def search_and_insert(self, widget, fieldname):
        """ perform search and insert rendered results into widget space """
        html = self.search_and_insert_html(widget, fieldname)
        core = self.getCommandSet('core')
        fieldid = 'uberselectionwidget-%s' % fieldname
        area = core.getCssSelector('div[id=%s] .uberselectionWidgetResults' % fieldid)
        core.replaceHTML(area, html)

    @kssaction
    def kss_refresh_search(self, formname, fieldname, searchterm):
        """Given a form (view) name, a widget name and the submitted
        search term, perform the search as the widget would and refresh the
        results area with this information.
        """
        widget = self._get_widget(formname, fieldname)
        self.request.form[widget.name + '.search'] = 'fakebutton'
        self.request.form[widget.name + '.query'] = searchterm
        self.search_and_insert(widget, fieldname)

    @kssaction
    def kss_refresh_browse(self, formname, fieldname, target):
        """Given a form (view) name, a widget name and a target folder, 
        refresh the results area with the contents of the given target.
        """
        widget = self._get_widget(formname, fieldname)
        self.request.form[widget.name + '.browse.' + target] = 'fakebutton'
        self.search_and_insert(widget, fieldname)

    def _get_widget(self, formname, fieldname):
        context = aq_inner(self.context)
        
        form = getMultiAdapter((context, self.request), name=formname)
        form = form.__of__(context)
        
        fieldname = fieldname[len(form.prefix)+1:]
        field = form.form_fields[fieldname]
        
        widgets = formlib.setUpWidgets((field,), form.prefix, context, 
            self.request, form=form, adapters={}, ignore_request=True)
            
        return widgets[fieldname]