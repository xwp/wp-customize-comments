<?php
/**
 * Plugin Name: Customize Comments
 * Description: Edit comments with live preview and bundle edits in changesets.
 * Plugin URI: https://github.com/xwp/wp-customize-comments/
 * Version: 0.1.0
 * Author: XWP
 * Author URI: https://make.xwp.co/
 * License: GPLv2+
 * Text Domain: customize-comments
 *
 * Copyright (c) 2017 XWP (https://xwp.co/)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 * @package Customize_Comments
 */

namespace Customize_Comments;

require_once __DIR__ . '/php/class-plugin.php';
$customize_comments_plugin = new Plugin();
add_action( 'plugins_loaded', array( $customize_comments_plugin, 'init' ) );
