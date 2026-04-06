<?php

namespace MediaWiki\Extension\SurveyGizmo;

use MediaWiki\Config\Config;
use MediaWiki\Hook\BeforePageDisplayHook;
use MediaWiki\ResourceLoader\Hook\ResourceLoaderGetConfigVarsHook;
use Skin;

class Hooks implements BeforePageDisplayHook, ResourceLoaderGetConfigVarsHook {

	public function __construct(
		private readonly Config $config,
	) {}

	/**
	 * BeforePageDisplay hook — adds the modules to the page
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		if (
			!empty( $this->config->get( 'SurveyGizmoBeaconID' ) ) &&
			!empty( $this->config->get( 'SurveyGizmoBeaconUrl' ) )
		) {
			$out->addModules( 'ext.surveyGizmo' );
		}
	}

	public function onResourceLoaderGetConfigVars( array &$vars, $skin, Config $config ): void {
		if ( !empty( $this->config->get( 'SurveyGizmoBeaconID' ) ) ) {
			$vars['wgSurveyGizmo']['beaconID'] = $this->config->get( 'SurveyGizmoBeaconID' );
		}

		if ( !empty( $this->config->get( 'SurveyGizmoBeaconUrl' ) ) ) {
			$vars['wgSurveyGizmo']['beaconUrl'] = $this->config->get( 'SurveyGizmoBeaconUrl' );
		}
	}

}
