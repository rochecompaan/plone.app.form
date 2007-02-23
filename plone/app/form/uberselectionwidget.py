from zope import interface, schema
from zope.component import getMultiAdapter, provideAdapter
from zope.formlib import form
from zope.publisher.interfaces.browser import IBrowserRequest

from zope.app.form.interfaces import WidgetInputError, MissingInputError
from zope.app.form.browser.interfaces import \
    ISourceQueryView, ITerms, IWidgetInputErrorView
from zope.app.form.browser.widget import SimpleInputWidget
from zope.app.pagetemplate.viewpagetemplatefile import ViewPageTemplateFile

from Products.CMFCore import utils as cmfutils
from Products.Five.browser import pagetemplatefile

from pprint import pprint


class MySource(object):
    interface.implements(schema.interfaces.ISource)
    interface.classProvides(schema.interfaces.IContextSourceBinder)

    def __init__(self, context):
        self.context = context
        self.catalog = cmfutils.getToolByName(context, "portal_catalog")

    def __contains__(self, value):
        """Return whether the value is available in this source
        """
        if self.catalog.getrid(value) is None:
            return False
        return True

    def search(self, query):
        context = self.context
        for char in '?-+*()':
            query = query.replace(char, ' ')
        query = query.split()
        query = " AND ".join(x+"*" for x in query)
        return (x.getPath() for x in self.catalog(SearchableText=query))


class MyTerms(object):
    interface.implements(ITerms)

    def __init__(self, source, request):
        self.source = source
        self.request = request

    def getTerm(self, value):
        rid = self.source.catalog.getrid(value)
        brain = self.source.catalog._catalog[rid]
        title = brain.Title
        token = value
        return schema.vocabulary.SimpleTerm(value, token=token, title=title)

    def getValue(self, token):
        if token not in self.source:
            LookupError(token)

        return token


class QueryMySourceView(object):
    interface.implements(ISourceQueryView)

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def results(self, name):
        if not name+".search" in self.request.form:
            return None
        query_fieldname = name+".query"
        if query_fieldname in self.request.form:
            query = self.request.form[query_fieldname]
            if query != '':
                return self.context.search(query)


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

            if token is not None:
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
        except schema.interfaces.ValidationError, err:
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


class IUberSelectionDemoForm(interface.Interface):
    selection = schema.Choice(title=u'Single select',
                         description=u'Select just one item',
                         required=False,
                         source=MySource)

    multiselection = schema.List(title=u'Multi select',
                         description=u'Select multiple items',
                         required=False,
                         value_type=schema.Choice(source=MySource))


class UberSelectionDemoForm(form.PageForm):
    form_fields = form.FormFields(IUberSelectionDemoForm)
    form_fields['selection'].custom_widget = UberSelectionWidget
    form_fields['multiselection'].custom_widget = UberMultiSelectionWidget

    @form.action("dskljfhsd")
    def action_search(self, action, data):
        catalog = cmfutils.getToolByName(self.context, 'portal_catalog')

        return repr(data)