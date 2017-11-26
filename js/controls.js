/* eslint no-magic-numbers: [ "error", { "ignore": [0,1] } ] */
/* exported customizeCommentsControls */

var customizeCommentsControls = (function( api, $ ) {
	'use strict';

	var component = {
		l10n: {},
		currentPage: new api.Value( 1 ),
		loading: new api.Value( false ),
		allLoaded: new api.Value( false )
	};

	/**
	 * Init.
	 *
	 * @param {object} data - Exports from PHP.
	 * @param {object} data.l10n - Translations.
	 * @returns {void}
	 */
	component.init = function init( data ) {
		if ( data && data.l10n ) {
			_.extend( component.l10n, data.l10n );
		}
		api.bind( 'ready', component.ready );
	};

	/**
	 * Ready.
	 *
	 * @todo Auto-load the comments for the current post instead of most recent comments for every post?
	 *
	 * @returns {void}
	 */
	component.ready = function ready() {
		wp.api.loadPromise.done( function() {

			component.collection = new wp.api.collections.Comments();

			// Supply default params to fetch requests.
			component.collection.fetch = (function( fetch ) {
				return function( options ) {
					var opts = _.extend( {}, options );
					opts.data = _.extend(
						{
							context: 'edit',
							_embed: true,
							customize_changeset_uuid: api.settings.changeset.uuid
						},
						options.data || {}
					);
					return fetch.call( this, opts );
				};
			})( component.collection.fetch );

			api.section( 'comments', component.configureSection );

			// Ensure there are controls created for every comment_content setting created.
			api.each( component.ensureControl );
			api.bind( 'add', component.ensureControl );
		} );

		api.previewer.bind( 'edit-comment', component.handleEditCommentMessage );
	};

	/**
	 * Ensure a comment_content setting exists.
	 *
	 * @param {object} comment - Comment resource from REST API.
	 * @return {wp.customize.Setting} Added setting.
	 */
	component.ensureSetting = function ensureSetting( comment ) {
		var customizeId, setting;
		customizeId = 'comment_content[' +  String( comment.id ) + ']';

		setting = wp.customize( customizeId );
		if ( ! setting ) {
			setting = new wp.customize.Setting( customizeId, comment.content.raw, {
				transport: 'postMessage'
			} );
			wp.customize.add( setting );
		}
		return setting;

		// Create control for comment content.
		// control = wp.customize.control( customizeId );
		// if ( ! control ) {
		// 	control = new wp.customize.Control( customizeId, {
		// 		section: 'comments',
		// 		type: 'textarea',
		// 		label: wp.template( 'comment-content-control-label' )( comment ),
		// 		description: wp.template( 'comment-content-control-description' )( comment ),
		// 		setting: setting,
		// 		input_attrs: {
		// 			'class': 'control-focus' // Make sure focus goes in input and not the link in description.
		// 		},
		// 		priority: -( new Date( comment.date_gmt ) ).valueOf() // Sort by date.
		// 	} );
		// 	wp.customize.control.add( control );
		//
		// 	// Load a comment's post into the preview when clicking on the post permalink in the description.
		// 	control.container.on( 'click', '.comment-post-link', function( event ) {
		// 		event.preventDefault();
		// 		wp.customize.previewer.previewUrl.set( this.href );
		// 	} );
		// }
		//
		// return {
		// 	control: control,
		// 	setting: setting
		// };
	};

	/**
	 * Ensure comment_content control for a setting if it is a comment_content setting.
	 *
	 * @param {wp.customize.Setting} setting - Setting.
	 * @returns {jQuery.Promise} Promise resolving with control for comment_content setting.
	 */
	component.ensureControl = function ensureControl( setting ) {
		var idParts, comment, commentId, controlId, deferred = $.Deferred();
		idParts = setting.id.replace( /]/g, '' ).split( /\[/ );
		if ( 'comment_content' !== idParts[0] ) {
			return deferred.reject().promise();
		}
		controlId = setting.id; // Named the same by convention/convenience.

		// Short-circuit if the control already exists.
		if ( api.control.has( controlId ) ) {
			deferred.resolve( api.control( controlId ) );
			return deferred.promise();
		}

		commentId = parseInt( idParts[1], 10 );
		if ( isNaN( commentId ) ) {
			throw new Error( 'Bad setting ID.' );
		}

		/**
		 * Create control for comment content.
		 *
		 * @param {wp.api.models.Comment[]} comments - Fetched comments (only one should be included here).
		 * @returns {void}
		 */
		function onFetched( comments ) {
			if ( 1 === comments.length ) {
				deferred.resolve( component.createCommentContentControl( comments[0] ) );
			} else {
				deferred.reject();
			}
		}

		comment = component.collection.get( commentId );
		if ( comment ) {
			onFetched( [ comment ] );
		} else {
			component.collection.fetch( {
				data: {
					include: commentId
				}
			} ).done( onFetched ).fail( function() {
				deferred.reject();
			} );
		}
		return deferred.promise();
	};

	/**
	 * Create a comment content control for a given comment.
	 *
	 * @param {object} comment - Comment as returned by REST API.
	 * @returns {wp.customize.Control} Comment content control.
	 */
	component.createCommentContentControl = function createCommentContentControl( comment ) {
		var control, customizeId;
		customizeId = 'comment_content[' + String( comment.id ) + ']';
		if ( api.control.has( customizeId ) ) {
			return api.control( customizeId );
		}
		control = new api.Control( customizeId, {
			section: 'comments',
			type: 'textarea',
			label: wp.template( 'comment-content-control-label' )( comment ),
			description: wp.template( 'comment-content-control-description' )( comment ),
			setting: customizeId,
			input_attrs: {
				'class': 'control-focus' // Make sure focus goes in input and not the link in description.
			},
			priority: -( new Date( comment.date_gmt ) ).valueOf() // Sort by date.
		} );
		api.control.add( control );

		// Load a comment's post into the preview when clicking on the post permalink in the description.
		control.container.on( 'click', '.comment-post-link', function( event ) {
			event.preventDefault();
			api.previewer.previewUrl.set( this.href );
		} );

		return control;
	};

	/**
	 * Handle edit-comment message from preview.
	 *
	 * @param {int} commentId - Comment ID.
	 * @returns {void}
	 */
	component.handleEditCommentMessage = function handleEditCommentMessage( commentId ) {
		var controlId, request;

		// @todo Make sure the setting is added.
		component.collection.fetch( {
			data: {
				include: commentId
			}
		} ).done( function( comments ) {
			var comment = comments.shift();
			component.ensureSetting( comment );
			api.control( 'comment_content[' + String( commentId ) + ']', function( control ) {
				control.focus();
			} );
		} );

		// component.ensureControl();

		//controlId = 'comment_content[' + String( commentId ) + ']';

		return;

		// Focus on the control immediately if it has already been added.
		if ( api.control.has( controlId ) ) {
			api.control( controlId ).focus();
			return;
		}

		// Otherwise, fetch the comment from the REST API.
		request = component.collection.fetch( {
			data: {
				include: commentId
			}
		} );
		request.done( function( comments ) {
			var added = component.add( comments[0] );
			if ( added ) {
				added.control.focus();
			}
		} );
		request.fail( function() {
			var section = api.section( 'comments' );
			section.expand();
			section.notifications.add( new api.Notification( 'comment_add_failure', {
				message: component.l10n.unableToFetchComment,
				type: 'error',
				dismissible: true
			} ) );
		} );
	};

	/**
	 * Add load more button.
	 *
	 * @todo Let this be a control template?
	 *
	 * @returns {void}
	 */
	component.addLoadMoreButton = function addLoadMoreButton() {
		var control;
		control = new api.Control( 'load_more_comments', {
			section: 'comments',
			type: 'button',
			input_attrs: {
				value: component.l10n.loadMoreComments
			},
			settings: [],
			priority: 10
		} );
		api.control.add( control );

		// Manage UI state of control.
		control.deferred.embedded.done( function() {
			var button = control.container.find( ':button' );
			button.on( 'click', component.loadMoreComments );

			// Disable button while loading.
			function onLoadingChange() {
				button.prop( 'disabled', component.loading.get() );
			}
			component.loading.bind( onLoadingChange );
			onLoadingChange();

			// Deactivate button when all pages of commentsa are loaded.
			function onAllLoadedChange() {
				control.active.set( ! component.allLoaded.get() );
			}
			component.allLoaded.bind( onAllLoadedChange );
			onAllLoadedChange();
		} );
	};

	/**
	 * Load more comments.
	 *
	 * @returns {void}
	 */
	component.loadMoreComments = function loadMoreComments() {
		var request;
		component.loading.set( true ); // Disables load-more button.
		request = component.collection.fetch( {
			data: {
				page: component.currentPage.get()
			}
		} );
		request.always( function() {
			component.loading.set( false );
		} );
		request.done( function( comments ) {

			// Register setting & control for each comment.
			_.each( comments, component.ensureSetting );

			// Update state for next page of comments.
			component.currentPage.set( component.currentPage.get() + 1 );
			component.allLoaded.set( 0 === comments.length );
		} );
	};

	/**
	 * Configure section, auto-loading comments when the section is expanded.
	 *
	 * @param {wp.customize.Section} section - Section.
	 * @returns {void}
	 */
	component.configureSection = function configureSection( section ) {
		component.addLoadMoreButton();

		function onSectionExpanded() {
			if ( section.expanded() ) {
				section.expanded.unbind( onSectionExpanded );
				component.loadMoreComments(); // Load initial page.
			}
		}
		section.expanded.bind( onSectionExpanded );
		onSectionExpanded();
	};

	return component;
})( wp.customize, jQuery );
