from zope.app.form.browser.widget import SimpleInputWidget
from zope.app.form.browser import TextAreaWidget
from zope.app.pagetemplate import ViewPageTemplateFile

from Products.CMFCore.utils import getToolByName

import logging
logger = logging.getLogger('CMFPlone')

class WysiwygWidget(TextAreaWidget):
	def __init__(self, field, request):
		SimpleInputWidget.__init__(self, field, request)
		self.portal_state = getMultiAdapter((self.context.context, self.request), name=u'plone_portal_state')
		
	template = ViewPageTemplateFile('wysiwyg_widget.pt')
	
	def __call__(self):
		return self.template()
	
	def inputname(self):
		return self.name
		
	def inputvalue(self):
		return self._getFormValue()
	
	def portal_url(self):
		return self.portal_state.portal_url()
	
	def tmplcontext(self):
		return self.context.context
		
	def index(self):
		# Find out what this does.
		return None