<?php

namespace MediaWiki\Extension\SurveyGizmo\Tests\Unit;

use MediaWiki\Config\Config;
use MediaWiki\Extension\SurveyGizmo\Hooks;
use MediaWiki\Output\OutputPage;
use MediaWikiUnitTestCase;
use Skin;

/**
 * @covers \MediaWiki\Extension\SurveyGizmo\Hooks
 */
class HooksTest extends MediaWikiUnitTestCase {

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	private function makeConfig( array $values ): Config {
		$config = $this->createMock( Config::class );
		$config->method( 'get' )
			->willReturnCallback( static function ( $key ) use ( $values ) {
				return $values[$key] ?? null;
			} );
		return $config;
	}

	private function makeFullConfig( array $overrides = [] ): Config {
		return $this->makeConfig( array_merge( [
			'SurveyGizmoBeaconID'  => 'test-beacon-id',
			'SurveyGizmoBeaconUrl' => 'https://survey.example.com/beacon.js',
		], $overrides ) );
	}

	private function makeHooks( Config $config ): Hooks {
		return new Hooks( $config );
	}

	private function makeOutputPage(): OutputPage {
		return $this->createMock( OutputPage::class );
	}

	private function makeSkin(): Skin {
		return $this->createMock( Skin::class );
	}

	// -----------------------------------------------------------------------
	// onBeforePageDisplay — module NOT added
	// -----------------------------------------------------------------------

	public function testModuleNotAddedWhenBeaconIdMissing() {
		$hooks = $this->makeHooks( $this->makeFullConfig( [ 'SurveyGizmoBeaconID' => null ] ) );
		$out = $this->makeOutputPage();
		$out->expects( $this->never() )->method( 'addModules' );

		$hooks->onBeforePageDisplay( $out, $this->makeSkin() );
	}

	public function testModuleNotAddedWhenBeaconUrlMissing() {
		$hooks = $this->makeHooks( $this->makeFullConfig( [ 'SurveyGizmoBeaconUrl' => null ] ) );
		$out = $this->makeOutputPage();
		$out->expects( $this->never() )->method( 'addModules' );

		$hooks->onBeforePageDisplay( $out, $this->makeSkin() );
	}

	public function testModuleNotAddedWhenBothConfigMissing() {
		$hooks = $this->makeHooks( $this->makeConfig( [] ) );
		$out = $this->makeOutputPage();
		$out->expects( $this->never() )->method( 'addModules' );

		$hooks->onBeforePageDisplay( $out, $this->makeSkin() );
	}

	// -----------------------------------------------------------------------
	// onBeforePageDisplay — module IS added
	// -----------------------------------------------------------------------

	public function testModuleAddedWhenBothConfigSet() {
		$hooks = $this->makeHooks( $this->makeFullConfig() );
		$out = $this->makeOutputPage();
		$out->expects( $this->once() )
			->method( 'addModules' )
			->with( 'ext.surveyGizmo' );

		$hooks->onBeforePageDisplay( $out, $this->makeSkin() );
	}

	// -----------------------------------------------------------------------
	// onResourceLoaderGetConfigVars
	// -----------------------------------------------------------------------

	public function testConfigVarsHasNoBeaconIdWhenBeaconIdMissing() {
		$hooks = $this->makeHooks( $this->makeFullConfig( [ 'SurveyGizmoBeaconID' => null ] ) );

		$vars = [];
		$hooks->onResourceLoaderGetConfigVars( $vars, 'vector', $this->createMock( Config::class ) );

		$this->assertArrayNotHasKey( 'beaconID', $vars['wgSurveyGizmo'] ?? [] );
	}

	public function testConfigVarsPopulatedWhenBothConfigSet() {
		$hooks = $this->makeHooks( $this->makeFullConfig() );

		$vars = [];
		$hooks->onResourceLoaderGetConfigVars( $vars, 'vector', $this->createMock( Config::class ) );

		$this->assertArrayHasKey( 'wgSurveyGizmo', $vars );
		$this->assertSame( 'test-beacon-id', $vars['wgSurveyGizmo']['beaconID'] );
		$this->assertSame( 'https://survey.example.com/beacon.js', $vars['wgSurveyGizmo']['beaconUrl'] );
	}

	public function testConfigVarsHasOnlyBeaconIdWhenUrlMissing() {
		$hooks = $this->makeHooks( $this->makeFullConfig( [ 'SurveyGizmoBeaconUrl' => null ] ) );

		$vars = [];
		$hooks->onResourceLoaderGetConfigVars( $vars, 'vector', $this->createMock( Config::class ) );

		$this->assertArrayHasKey( 'wgSurveyGizmo', $vars );
		$this->assertSame( 'test-beacon-id', $vars['wgSurveyGizmo']['beaconID'] );
		$this->assertArrayNotHasKey( 'beaconUrl', $vars['wgSurveyGizmo'] );
	}

}
