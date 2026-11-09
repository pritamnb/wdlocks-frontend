<?php
/**
 * Plugin Name: WD Locks – Headless cart handoff
 * Description: Lets the headless frontend pass a multi-line basket into the WooCommerce checkout in one request.
 * Version:     1.0.0
 * Author:      WD Locks
 *
 * INSTALL: copy this file to wp-content/mu-plugins/wd-cart-handoff.php (create the folder if needed).
 *          Must-use plugins activate automatically — nothing to click in wp-admin.
 *
 * WHY: the headless frontend holds the basket in a Store API session (Cart-Token). The shopper's browser has
 *      no WooCommerce session cookie for wdlocks.co.uk, so the frontend re-adds the lines on arrival:
 *
 *        /checkout/?add-to-cart=<id>&quantity=<n>&wd_items=<id>:<qty>,<id>:<qty>
 *
 *      WooCommerce core only handles ONE add-to-cart per request. This plugin handles every line (the first
 *      one too), then redirects to a clean /checkout/ URL so a refresh can't double-add.
 *
 * SECURITY: IDs/quantities are absint'd, capped at 50 lines × 99 units, and only purchasable in-stock
 *           products are added. This is no more powerful than WooCommerce's own ?add-to-cart= URLs.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_loaded', 'wdl_headless_cart_handoff', 10 ); // before WC_Form_Handler::add_to_cart_action (20)

function wdl_headless_cart_handoff() {
	if ( empty( $_GET['wd_items'] ) || ! function_exists( 'WC' ) || ! WC()->cart ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}

	$lines = array();

	// First line arrives in WooCommerce's native params.
	if ( ! empty( $_GET['add-to-cart'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$lines[] = array(
			absint( wp_unslash( $_GET['add-to-cart'] ) ), // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			isset( $_GET['quantity'] ) ? absint( wp_unslash( $_GET['quantity'] ) ) : 1, // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		);
	}

	// Remaining lines: "id:qty,id:qty"
	$raw   = sanitize_text_field( wp_unslash( $_GET['wd_items'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$pairs = array_slice( array_filter( explode( ',', $raw ) ), 0, 50 );
	foreach ( $pairs as $pair ) {
		if ( preg_match( '/^(\d{1,8}):(\d{1,2})$/', trim( $pair ), $m ) ) {
			$lines[] = array( absint( $m[1] ), absint( $m[2] ) );
		}
	}

	foreach ( $lines as list( $id, $qty ) ) {
		$qty = min( max( $qty, 1 ), 99 );
		if ( ! $id ) {
			continue;
		}
		$product = wc_get_product( $id );
		if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
			continue;
		}
		if ( $product->is_type( 'variation' ) ) {
			WC()->cart->add_to_cart( $product->get_parent_id(), $qty, $id, $product->get_variation_attributes() );
		} else {
			WC()->cart->add_to_cart( $id, $qty );
		}
	}

	// Stop WooCommerce from adding the first line a second time at priority 20.
	unset( $_REQUEST['add-to-cart'], $_GET['add-to-cart'] );

	wc_nocache_headers();
	wp_safe_redirect( wc_get_checkout_url() );
	exit;
}
