/* exported customizeCommentsPreview */

var customizeCommentsPreview = (function( api, $ ) {
	'use strict';

	var component = {};

	/**
	 * Init.
	 *
	 * @returns {void}
	 */
	component.init = function() {
		api.bind( 'preview-ready', component.ready );
	};

	/**
	 * Ready.
	 *
	 * @returns {void}
	 */
	component.ready = function ready() {
		api.each( component.ensurePartial );
		api.bind( 'add', function( setting ) {
			var partial = component.ensurePartial( setting );
			if ( partial ) {
				partial.refresh();
			}
		} );
	};

	/**
	 * Autop.
	 *
	 * There is a fuller implementation of this in editor.js which we could use instead if we want to.
	 * In any case, this is just for instant preview while waiting for server-rendered value.
	 *
	 * @param {string} text - Text to add paragraphs and breaks to.
	 * @returns {string} Paragraphed text.
	 */
	function autop( text ) {
		return text.split( /\n\n+/ ).map( function( paragraph ) {
			return '<p>' + paragraph.replace( /\n/g, '<br>' ) + '</p>';
		} ).join( '' );
	}

	/**
	 * A Customizer Comment Content Partial.
	 *
	 * @class
	 * @augments wp.customize.Class
	 * @augments wp.customize.selectiveRefresh.Partial
	 */
	component.CommentContentPartial = api.selectiveRefresh.Partial.extend({

		/**
		 * Defaults.
		 *
		 * @var {object}
		 */
		defaults: _.extend(
			{},
			api.selectiveRefresh.Partial.prototype.defaults,
			{
				containerInclusive: false,
				fallbackRefresh: false
			}
		),

		/**
		 * No-op the createEditShortcutForPlacement method since there is an edit comment link.
		 *
		 * @returns {void}
		 */
		createEditShortcutForPlacement: function() {},

		/**
		 * Refresh partial with instant low-fidelity preview while waiting for selective refresh request to respond.
		 *
		 * @return {jQuery.Promise} Promise.
		 */
		refresh: function refresh() {
			var partial = this, setting; // eslint-disable-line consistent-this
			setting = api( _.first( partial.settings() ) );

			// Render instant low-fidelity preview.
			_.each( partial.placements(), function( placement ) {
				placement.container.html( autop( setting() ) );
			} );

			// Return resolved promise since no server-side selective refresh will be requested.
			return api.selectiveRefresh.Partial.prototype.refresh.call( partial );
		}
	});

	/**
	 * Ensure comment_content partial for a setting if it is a comment_content setting.
	 *
	 * @param {wp.customize.Value} setting - Setting.
	 * @returns {wp.customize.selectiveRefresh.Partial|null} Partial for comment_content setting, or null if not such a setting.
	 */
	component.ensurePartial = function ensurePartial( setting ) {
		var idParts, commentId, partialId, partial;
		idParts = setting.id.replace( /]/g, '' ).split( /\[/ );
		if ( 'comment_content' !== idParts[0] ) {
			return null;
		}
		partialId = setting.id; // Named the same by convention/convenience.
		if ( api.selectiveRefresh.partial.has( partialId ) ) {
			return api.selectiveRefresh.partial( partialId );
		}
		commentId = parseInt( idParts[1], 10 );
		if ( isNaN( commentId ) ) {
			throw new Error( 'Bad setting ID.' );
		}

		partial = new component.CommentContentPartial( partialId, {
			selector: '#comment-' + String( commentId ) + ' .comment-content',
			settings: [ setting.id ]
		} );
		api.selectiveRefresh.partial.add( partial );
		return partial;
	};

	// Prevent edit comment links from being classified as un-previewable. See https://github.com/xwp/wordpress-develop/pull/161.
	api.isLinkPreviewable = ( function( isLinkPreviewable ) {
		return function( element, options ) {
			if ( $( element ).closest( 'a' ).hasClass( 'comment-edit-link' ) ) {
				return true;
			}
			return isLinkPreviewable.call( this, element, options );
		};
	} )( api.isLinkPreviewable );

	// Override behavior for clicking on edit comment links to send edit-comment message to controls app.
	api.Preview.prototype.handleLinkClick = ( function( handleLinkClick ) {
		return function( event ) {
			var commentId, matches, link = $( event.target );

			if ( ! link.is( 'a.comment-edit-link' ) ) {
				handleLinkClick.call( this, event );
				return;
			}

			event.preventDefault();
			matches = link.prop( 'search' ).match( /(?:&|\?)c=(\d+)/ );
			if ( matches ) {
				commentId = parseInt( matches[1], 10 );
				if ( commentId ) {
					api.preview.send( 'edit-comment', commentId );
				}
			}
		};
	} )( api.Preview.prototype.handleLinkClick );

	return component;
})( wp.customize, jQuery );
