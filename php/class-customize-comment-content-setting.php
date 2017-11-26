<?php
/**
 * Customize_Comment_Content_Setting class.
 *
 * @package Customize_Comments
 */

namespace Customize_Comments;

/**
 * Class Customize_Comment_Content_Setting
 *
 * @package Customize_Comments
 */
class Customize_Comment_Content_Setting extends \WP_Customize_Setting {

	/**
	 * Comment ID.
	 *
	 * @var int
	 */
	public $comment_id;

	/**
	 * Capability.
	 *
	 * @var string
	 */
	public $capability = 'moderate_comments';

	/**
	 * Getter for comment content.
	 *
	 * @return string Comment content.
	 */
	public function value() {
		$comment = get_comment( $this->comment_id );
		if ( $comment instanceof \WP_Comment ) {
			return $comment->comment_content;
		}
		return $this->default;
	}

	/**
	 * Sanitize and validate.
	 *
	 * @param string $value Comment content.
	 * @return string|\WP_Error Sanitized string or WP_Error if invalid.
	 */
	public function sanitize( $value ) {
		if ( ! is_string( $value ) ) {
			return new \WP_Error( 'invalid_type', __( 'Comment content must be a string.', 'customize-comments' ) );
		}
		$value = apply_filters( 'pre_comment_content', $value );
		$value = apply_filters( 'comment_save_pre', $value );
		$value = wp_unslash( $value ); // So sad.
		return $value;
	}

	/**
	 * Add filter for previewing customized comment content.
	 */
	public function preview() {
		add_filter( 'get_comment', function( \WP_Comment $comment ) {
			if ( (int) $comment->comment_ID === $this->comment_id ) {
				$customized_comment_content = $this->post_value( null );
				if ( null !== $customized_comment_content ) {
					$comment->comment_content = $customized_comment_content;
				}
			}
			return $comment;
		} );
	}

	/**
	 * Update comment content in database.
	 *
	 * @param string $value Comment content.
	 * @return bool Result of updating comment.
	 */
	protected function update( $value ) {
		return (bool) wp_update_comment( wp_slash( array(
			'comment_ID' => $this->comment_id,
			'comment_content' => $value,
		) ) );
	}
}
