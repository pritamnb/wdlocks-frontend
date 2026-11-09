<?php
/**
 * Plugin Name: WD Locks – Headless cart handoff
 * Description: Lets the headless frontend pass a basket into the WooCommerce checkout in one idempotent request.
 * Version:     1.1.0
 * Author:      WD Locks
 *
 * INSTALL: copy this file to wp-content/mu-plugins/wd-cart-handoff.php (create the folder if needed).
 *          Must-use plugins activate automatically — nothing to click in wp-admin.
 *          Then set NEXT_PUBLIC_CART_HANDOFF_PLUGIN=true on the frontend.
 *
 * WHY: the headless frontend holds the basket in a Store API session (Cart-Token). The shopper's browser has
 *      no WooCommerce session cookie for wdlocks.co.uk, so the frontend sends the lines in the URL:
 *
 *        /checkout/?wd_items=<id>:<qty>,<id>:<qty>
 *
 *      This plugin REPLACES the WooCommerce basket with exactly those lines and redirects to a clean
 *      /checkout/ URL. Replacing (not appending) and redirecting makes refresh / back / re-visit safe:
 *      the shopper always ends up with precisely the basket they saw on the frontend.
 *
 * SECURITY: IDs/quantities are absint'd, capped at 50 lines × 99 units, and only purchasable in-stock
 *           products are added. This is no more powerful than WooCommerce's own ?add-to-cart= URLs.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_loaded', 'wdl_headless_cart_handoff', 10 ); // before WC_Form_Handler::add_to_cart_action (20)

function wdl_headless_cart_handoff() {
	if ( ! isset( $_GET['wd_items'] ) || ! function_exists( 'WC' ) || ! WC()->cart ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}

	$raw   = sanitize_text_field( wp_unslash( $_GET['wd_items'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$pairs = array_slice( array_filter( explode( ',', $raw ) ), 0, 50 );
	$lines = array();
	foreach ( $pairs as $pair ) {
		if ( preg_match( '/^(\d{1,8}):(\d{1,2})$/', trim( $pair ), $m ) ) {
			$lines[] = array( absint( $m[1] ), min( max( absint( $m[2] ), 1 ), 99 ) );
		}
	}

	// Replace, don't append: the frontend basket is the source of truth.
	WC()->cart->empty_cart();

	$skipped = 0;
	foreach ( $lines as list( $id, $qty ) ) {
		$product = $id ? wc_get_product( $id ) : false;
		if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
			$skipped++;
			continue;
		}
		if ( $product->is_type( 'variation' ) ) {
			$added = WC()->cart->add_to_cart( $product->get_parent_id(), $qty, $id, $product->get_variation_attributes() );
		} else {
			$added = WC()->cart->add_to_cart( $id, $qty );
		}
		if ( ! $added ) {
			$skipped++;
		}
	}

	if ( $skipped > 0 && function_exists( 'wc_add_notice' ) ) {
		wc_add_notice( sprintf( _n( '%d item could not be added to your basket and has been removed.', '%d items could not be added to your basket and have been removed.', $skipped, 'wd-locks' ), $skipped ), 'notice' );
	}

	// Make sure WooCommerce's own handler doesn't run on this request.
	unset( $_REQUEST['add-to-cart'], $_GET['add-to-cart'] );

	wc_nocache_headers();
	wp_safe_redirect( WC()->cart->is_empty() ? wc_get_cart_url() : wc_get_checkout_url() );
	exit;
}
