<?php
/**
 * Hooks for SurveyGizmo extension
 *
 * @file
 * @ingroup Extensions
 */

class SurveyGizmoHooks {
	/**
	 * BeforePageDisplay hook
	 * Adds the modules to the page
	 *
	 * @param $out OutputPage output page
	 * @param $skin Skin current skin
	 *
	 * @return bool
	 */
	public static function onBeforePageDisplay( OutputPage &$out, Skin &$skin ) {
		global $wgSurveyGizmoBeaconID, $wgSurveyGizmoBeaconUrl;

		if ( !empty( $wgSurveyGizmoBeaconID ) && !empty( $wgSurveyGizmoBeaconUrl) ) {
			$out->addModules( 'ext.surveyGizmo' );
		};

		return true;
	}

	/**
	 * @param $vars
	 *
	 * @return bool
	 */
	public static function onResourceLoaderGetConfigVars( &$vars ) {
		global $wgSurveyGizmoBeaconID, $wgSurveyGizmoBeaconUrl;

		if ( !empty( $wgSurveyGizmoBeaconID ) ) {
			$vars['wgSurveyGizmo']['beaconID'] = $wgSurveyGizmoBeaconID;
		}

		if ( !empty( $wgSurveyGizmoBeaconUrl ) ) {
			$vars['wgSurveyGizmo']['beaconUrl'] = $wgSurveyGizmoBeaconUrl;
		}

		return true;
	}

}
