=== Customize Comments ===
Contributors: xwp, westonruter
Requires at least: 4.9
Tested up to: 4.9
Stable tag: 0.1.0
Requires PHP: 5.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Tags: customizer, customize, comments

Edit comments with live preview and bundle edits in changesets.

== Description ==

This plugin is a proof of concept for how comment editing might be added to the Customizer, with edits to comments being staged in changesets along with any other changes made in customziation session. It demonstrates scalable lazy-loading of controls/settings via the REST API. It demonstrates both dynamic settings and dynamic partials.

A new Comments section is added to the Customizer, and when this section is expanded the most recent comments are fetched from the REST API and then are added as textarea controls in the section. A button appears at the bottom of the section for loading subsequent pages of comments.

The comments are listed with the comment author and publish date along with the post it was commented on. Only the comment's content is currently editable. When you do edit a comment that appears in the preview, then the comment will be previewed with selective refresh after a low-fidelity instant preview.

When you navigate to a post and see the comment list, clicking the "Edit Comment" link in the Customizer preview will cause the comment to be loaded into a new textarea control in the section, and the control will then be focused for editing.
