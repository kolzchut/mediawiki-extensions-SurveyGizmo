<?php
/**
 * SurveyGizmo extension
 **
 * @file
 * @ingroup Extensions
 * @author Dror S. [FFS]
 * @copyright © 2015 Dror S. & Kol-Zchut Ltd.
 * @license GNU General Public Licence 2.0 or later
 */

$wgExtensionCredits['other'][] = array(
	'name' => 'SurveyGizmo Intercept Loader',
	'author' => array(
		'Dror S. [FFS] ([http://www.kolzchut.org.il Kol-Zchut])',
	),
	'version'  => '0.2.0',
	'license-name' => 'GPL-2.0+',
	'descriptionmsg' => 'surveygizmo-desc',
	'path' => __FILE__
);

/* Setup */

// Register files
$wgAutoloadClasses['SurveyGizmoHooks'] = __DIR__ . '/SurveyGizmo.hooks.php';
$wgMessagesDirs['SurveyGizmo'] = __DIR__ . '/i18n';


// Hooks
$wgHooks['BeforePageDisplay'][] = 'SurveyGizmoHooks::onBeforePageDisplay';
$wgHooks['ResourceLoaderGetConfigVars'][] =
	'SurveyGizmoHooks::onResourceLoaderGetConfigVars';


/* Configuration */
$wgSurveyGizmoBeaconID = null;

/* ResourceLoader modules */

$resourceTemplate = array(
	'localBasePath' => __DIR__ . '/modules',
	'remoteExtPath' => 'WikiRights/SurveyGizmo/modules',
);

$wgResourceModules['ext.surveyGizmo'] = $resourceTemplate + array(
	'scripts' => 'ext.surveyGizmo.interceptLoader.js',
	'styles' => 'ext.surveyGizmo.interceptLoader.less',
	'dependencies' => array(
		'mediawiki.cookie',
		'ext.googleUniversalAnalytics.utils'
	),
	'position' => 'bottom'
);

unset( $resourceTemplate );

