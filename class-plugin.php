<?php
/**
 * Plugin class.
 *
 * @package Customize_Comments
 */

namespace Customize_Comments;

/**
 * Class Plugin
 *
 * @package Customize_Comments
 */
class Plugin {

	/**
	 * Add hooks.
	 */
	public function init() {
		add_action( 'customize_register', array( $this, 'register_section' ) );
		add_filter( 'customize_dynamic_setting_args', array( $this, 'filter_dynamic_setting_args' ), 10, 2 );
		add_filter( 'customize_dynamic_setting_class', array( $this, 'filter_dynamic_setting_class' ), 10, 3 );
		add_filter( 'customize_dynamic_partial_args', array( $this, 'filter_dynamic_partial_args' ), 10, 2 );

		add_action( 'customize_controls_enqueue_scripts', array( $this, 'enqueue_controls_scripts' ) );
		add_action( 'customize_controls_print_footer_scripts', array( $this, 'print_controls_templates' ) );
		add_action( 'customize_preview_init', function() {
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_preview_scripts' ) );
		} );
	}

	/**
	 * Enqueue scripts needed by the controls app.
	 */
	public function enqueue_controls_scripts() {
		$handle = 'customize-comments-controls';
		$src = plugin_dir_url( __FILE__ ) . '/controls.js';
		wp_enqueue_script( $handle, $src, array( 'customize-controls', 'wp-api' ) );
		$exports = array(
			'l10n' => array(
				'unableToFetchComment' => __( 'Unable to fetch comment for editing.', 'customize-comments' ),
				'loadMoreComments' => __( 'Load More Comments@', 'customize-comments' ),
				/* translators: 1 is comment author, and 2 is comment date */
				'labelFormat' => __( 'By %1$s on %2$s', 'customize-comments' ),
			),
		);
		wp_add_inline_script( $handle, sprintf( 'customizeCommentsControls.init( %s );', wp_json_encode( $exports ) ) );
	}

	/**
	 * Enqueue scripts needed by the preview app.
	 */
	public function enqueue_preview_scripts() {
		$handle = 'customize-comments-preview';
		$src = plugin_dir_url( __FILE__ ) . '/preview.js';
		wp_enqueue_script( $handle, $src, array( 'customize-selective-refresh' ) );
		wp_add_inline_script( $handle, 'customizeCommentsPreview.init();' );
	}

	/**
	 * Register Comments section.
	 *
	 * @param \WP_Customize_Manager $wp_customize Manager.
	 */
	public function register_section( \WP_Customize_Manager $wp_customize ) {
		$wp_customize->add_section( 'comments', array(
			'title' => __( 'Comments', 'default' ),
			'capability' => 'moderate_comments',
		) );
	}

	/**
	 * Filter dynamic setting args.
	 *
	 * @param false|array $args Setting args.
	 * @param string      $id   Setting ID.
	 * @return false|array Args or false if setting ID does not match pattern.
	 */
	public function filter_dynamic_setting_args( $args, $id ) {
		if ( preg_match( '/^comment_content\[(?P<comment_id>\d+)\]$/', $id, $matches ) ) {
			$args = array(
				'type' => 'comment_content',
				'comment_id' => intval( $matches['comment_id'] ),
				'transport' => 'postMessage',
			);
		}
		return $args;
	}

	/**
	 * Filter dynamic setting class.
	 *
	 * @param string      $class Setting class.
	 * @param string      $id    Setting ID.
	 * @param false|array $args  Setting args.
	 * @return string WP_Customize_Setting class name.
	 */
	public function filter_dynamic_setting_class( $class, $id, $args ) {
		if ( isset( $args['type'] ) && 'comment_content' === $args['type'] ) {
			require_once ABSPATH . '/wp-includes/class-wp-customize-setting.php';
			require_once __DIR__ . '/class-customize-comment-content-setting.php';
			$class = __NAMESPACE__ . '\Customize_Comment_Content_Setting';
		}
		return $class;
	}

	/**
	 * Filter dynamic partial args.
	 *
	 * @param false|array $args Setting args.
	 * @param string      $id   Setting ID.
	 * @return false|array Args or false if setting ID does not match pattern.
	 */
	public function filter_dynamic_partial_args( $args, $id ) {
		if ( preg_match( '/^comment_content\[(?P<comment_id>\d+)\]$/', $id, $matches ) ) {
			$args = array(
				'render_callback' => function() use ( $matches ) {
					comment_text( intval( $matches['comment_id'] ) );
				},
			);
		}
		return $args;
	}

	/**
	 * Print templates for controls.
	 */
	public function print_controls_templates() {
		?>
		<script type="text/template" id="tmpl-comment-content-control-label">
			<?php
			printf(
				/* translators: 1 is comment author and 2 is comment date. */
				__( 'By %1$s on %2$s', 'customize-comments' ),
				'{{ data.author_name }}',
				'{{ ( new Date( data.date ) ).toLocaleString() }}'
			);
			?>
		</script>
		<script type="text/template" id="tmpl-comment-content-control-description">
			<?php
			printf(
				/* translators: 1 is post URL and 2 is post title. */
				__( 'Commented on <a class="comment-post-link" href="%1$s">%2$s</a>.', 'customize-comments' ),
				'{{data._embedded.up[0].link}}',
				'{{data._embedded.up[0].title.rendered}}'
			);
			?>
		</script>
		<?php
	}
}
