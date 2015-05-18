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

$GLOBALS['wgExtensionCredits']['other'][] = array(
	'name' => 'SurveyGizmo Intercept Loader',
	'author' => array(
		'Dror S. [FFS] ([http://www.kolzchut.org.il Kol-Zchut])',
	),
	'version'  => '0.1.0',
	'license-name' => 'GPL-2.0+',
	'descriptionmsg' => 'surveygizmo-desc',
	'path' => __FILE__
);

/* Setup */

// Register files
$GLOBALS['wgAutoloadClasses']['SurveyGizmoHooks'] = __DIR__ . '/SurveyGizmo.hooks.php';
$GLOBALS['wgMessagesDirs']['SurveyGizmo'] = __DIR__ . '/i18n';


// Hooks
$GLOBALS['wgHooks']['BeforePageDisplay'][] = 'SurveyGizmoHooks::onBeforePageDisplay';
$GLOBALS['wgHooks']['ResourceLoaderGetConfigVars'][] =
	'SurveyGizmoHooks::onResourceLoaderGetConfigVars';


/* Configuration */
$GLOBALS['wgSurveyGizmoBeaconID'] = null;

/* ResourceLoader modules */

$resourceTemplate = array(
	'localBasePath' => __DIR__ . '/modules',
	'remoteExtPath' => 'WikiRights/SurveyGizmo/modules',
	//'dependencies' => array( '' ),
);
$GLOBALS['wgResourceModules']['ext.surveyGizmo'] = $resourceTemplate + array(
		'scripts' => 'ext.surveyGizmo.interceptLoader.js',
		'styles' => 'ext.surveyGizmo.interceptLoader.less',
		'dependencies' => 'mediawiki.cookie'
	);
