from zope.interface import Interface
from zope import schema

from zope.formlib import form
from Products.Five.formlib import formbase

from Acquisition import aq_inner
from Products.statusmessages.interfaces import IStatusMessage

from plone.app.vocabularies.catalog import SearchableTextSourceBinder
from plone.app.form.widgets.uberselectionwidget import UberSelectionWidget
from plone.app.form.widgets.uberselectionwidget import UberMultiSelectionWidget

class ITestForm(Interface):
    
    usw_single_test = schema.Choice(
                        title=u"USW Single",
                        source=SearchableTextSourceBinder(
                            {},
                            default_query='path:'
                        ),
                        required=False
                      )
                             
    usw_multiple_test = schema.List(
                            title=u"USW Multiple",
                            required=False,
                            value_type=schema.Choice(
                                title=u"Test",
                                source=SearchableTextSourceBinder(
                                    {},
                                    default_query='path:'
                                )
                            )
                        )
                
class TestForm(formbase.PageForm):
    form_fields = form.FormFields(ITestForm)
    form_fields['usw_single_test'].custom_widget = UberSelectionWidget
    form_fields['usw_multiple_test'].custom_widget = UberMultiSelectionWidget
    
    label = u"Test form"
    
    @form.action("OK")
    def action_ok(self, action, data):
        """Send the email to the site administrator and redirect to the
        front page, showing a status message to say the message was received.
        """
        context = aq_inner(self.context)
        status = IStatusMessage(self.request)
        status.addStatusMessage("You sent " + str(data), type="info")
        self.request.response.redirect(context.absolute_url())
        return ''