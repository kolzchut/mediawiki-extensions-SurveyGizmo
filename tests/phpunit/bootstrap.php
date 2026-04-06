<?php

/**
 * Minimal bootstrap for standalone PHPUnit runs (bypasses the slow MW bootstrap).
 *
 * Usage from the MediaWiki root (inside Docker):
 *   vendor/bin/phpunit -c extensions/WikiRights/SurveyGizmo/phpunit.xml.dist
 *
 * If MW is not at the auto-detected path, set MW_INSTALL_PATH:
 *   MW_INSTALL_PATH=/var/www/html vendor/bin/phpunit -c extensions/WikiRights/SurveyGizmo/phpunit.xml.dist
 */

// Auto-detect MediaWiki installation path.
$candidates = array_filter( [
	getenv( 'MW_INSTALL_PATH' ),
	realpath( __DIR__ . '/../../../../../mediawiki' ),  // kz-docker layout: extensions/ beside mediawiki/
	realpath( __DIR__ . '/../../../../../../' ),        // extensions/ inside mediawiki/
	'/var/www/html',                                   // common Docker path
] );

$mwPath = null;
foreach ( $candidates as $candidate ) {
	if ( is_dir( $candidate ) && file_exists( $candidate . '/vendor/autoload.php' ) ) {
		$mwPath = $candidate;
		break;
	}
}

if ( !$mwPath ) {
	echo "ERROR: Could not find a MediaWiki installation.\n";
	echo "Set the MW_INSTALL_PATH environment variable to your MediaWiki root.\n";
	exit( 1 );
}

// Load MW's autoloader — registers MW core classes AND Composer packages.
require_once $mwPath . '/includes/AutoLoader.php';

// Register the extension's own PSR-4 namespace.
$extRoot = dirname( __DIR__, 2 );
spl_autoload_register( static function ( string $class ) use ( $extRoot ) {
	$prefix = 'MediaWiki\\Extension\\SurveyGizmo\\';
	if ( str_starts_with( $class, $prefix ) ) {
		$relative = substr( $class, strlen( $prefix ) );
		$file = $extRoot . '/includes/' . str_replace( '\\', '/', $relative ) . '.php';
		if ( file_exists( $file ) ) {
			require $file;
		}
	}
} );
