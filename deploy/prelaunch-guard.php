<?php
/**
 * Plugin Name: Pre-launch guard (DELETE AT GO-LIVE)
 * Description: This server holds a copy of the live shop while wdlocks.co.uk still runs at Tomia. The guard stops the copy
 * from emailing anyone, calling PayPal / WooPayments / ManageWP / Google / Meta / feeds, firing webhooks or running
 * scheduled actions. Go-live removes this file (wdlocks-golive).
 */
if ( ! defined( "ABSPATH" ) ) { exit; }
add_filter( "pre_wp_mail", "__return_false", PHP_INT_MAX );
add_filter( "pre_http_request", function ( $pre, $args, $url ) {
	$host = strtolower( (string) parse_url( $url, PHP_URL_HOST ) );
	if ( in_array( $host, array( "127.0.0.1", "localhost", "wdlocks.co.uk", "www.wdlocks.co.uk" ), true ) ) { return $pre; }
	return new WP_Error( "prelaunch_guard", "Blocked on the pre-launch copy: " . $host );
}, PHP_INT_MAX, 3 );
add_filter( "woocommerce_webhook_should_deliver", "__return_false", PHP_INT_MAX );
add_filter( "action_scheduler_allow_async_request_runner", "__return_false", PHP_INT_MAX );
add_filter( "action_scheduler_queue_runner_concurrent_batches", function () { return 0; }, PHP_INT_MAX );
add_filter( "wp_robots", function ( $r ) { $r["noindex"] = true; $r["nofollow"] = true; return $r; } );
add_action( "send_headers", function () { header( "X-Robots-Tag: noindex, nofollow" ); header( "X-Prelaunch-Guard: on" ); } );
