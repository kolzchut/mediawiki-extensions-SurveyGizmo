'use strict';

/* eslint-env node */
/**
 * Unit tests for the intercept loader's message handling, run in jsdom with
 * the same jQuery version as MediaWiki 1.43 and a stubbed `mw`.
 * Run with `npm run test:unit`.
 */
const { test } = require( 'node:test' );
const assert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { JSDOM } = require( 'jsdom' );

const root = path.join( __dirname, '..', '..' );
const jquerySource = fs.readFileSync( require.resolve( 'jquery' ), 'utf8' );
const loaderSource = fs.readFileSync(
	path.join( root, 'resources', 'ext.surveyGizmo.interceptLoader.js' ),
	'utf8'
);

// Arrays made inside the jsdom window have that window's prototypes, which a
// strict deep comparison against an array made here rejects
const plain = ( value ) => JSON.parse( JSON.stringify( value ) );

const SURVEY_ORIGIN = 'https://survey.alchemer.com';
const SUBMITTED = JSON.stringify( { action: 'status', status: 'submitted', id: 1234567 } );

/**
 * Load the module into a fresh window.
 *
 * @param {string|null} [initialCookie] Value of the Surveys cookie at page load
 * @return {Object} The window, the cookie jar, and the tracked events
 */
function makePage( initialCookie ) {
	const dom = new JSDOM( '<!DOCTYPE html><html><body></body></html>', {
		runScripts: 'outside-only'
	} );
	const window = dom.window;
	const cookies = new Map();
	const tracked = [];
	const errors = [];

	if ( initialCookie !== undefined && initialCookie !== null ) {
		cookies.set( 'Surveys', initialCookie );
	}
	window.addEventListener( 'error', ( e ) => {
		errors.push( e.error || e.message );
	} );
	window.eval( jquerySource );
	const config = {
		wgSurveyGizmo: { beaconUrl: 'https://beacon.invalid/beacon.js', beaconID: 'test' },
		wgTitle: 'Test',
		wgCategories: []
	};
	window.mw = {
		config: { get: ( key ) => config[ key ] },
		loader: {
			load: () => {},
			using: ( deps, ready ) => {
				ready();
			}
		},
		cookie: {
			get: ( name ) => ( cookies.has( name ) ? cookies.get( name ) : null ),
			set: ( name, value ) => {
				cookies.set( name, value );
			}
		},
		log: Object.assign( () => {}, { warn: () => {} } ),
		track: ( topic, data ) => {
			tracked.push( { topic, data } );
		}
	};
	window.eval( loaderSource );
	return { window, cookies, tracked, errors };
}

/**
 * Post a message to the page the way the browser delivers one from a frame.
 *
 * @param {Object} window The jsdom window
 * @param {*} data
 * @param {string} origin
 */
function post( window, data, origin ) {
	window.dispatchEvent( new window.MessageEvent( 'message', { data, origin } ) );
}

test( 'a message from a host that only starts with the survey host is ignored', () => {
	const page = makePage();
	post( page.window, SUBMITTED, 'https://survey.alchemer.com.example' );
	post( page.window, JSON.stringify( { action: 'userType', status: 'x' } ), 'https://survey.alchemer.com.example' );

	assert.equal( page.cookies.has( 'Surveys' ), false, 'the Surveys cookie is not written' );
	assert.deepEqual( page.tracked, [], 'no analytics event is sent' );
	assert.deepEqual( page.errors, [] );
} );

test( 'a lookalike origin leaves an existing cookie unchanged', () => {
	const before = JSON.stringify( { rejected: [], started: [ 1 ], finished: [], userType: 'a' } );
	const page = makePage( before );
	post( page.window, SUBMITTED, 'https://survey.alchemer.com.example' );

	assert.equal( page.cookies.get( 'Surveys' ), before );
	assert.deepEqual( plain( page.window.mw.wr.sg.status.finished ), [] );
} );

test( 'only the exact https origins are accepted', () => {
	const page = makePage();
	const sg = page.window.mw.wr.sg;

	assert.equal( sg.isValidOrigin( 'https://survey.alchemer.com' ), true );
	assert.equal( sg.isValidOrigin( 'https://www.alchemer.com' ), true );
	[
		'http://survey.alchemer.com',
		'https://survey.alchemer.com:8443',
		'https://survey.alchemer.com.example',
		'https://evil.example/https://survey.alchemer.com',
		'https://xsurvey.alchemer.com',
		'https://alchemer.com',
		'HTTPS://SURVEY.ALCHEMER.COM',
		'null',
		'',
		null,
		undefined
	].forEach( ( origin ) => {
		assert.equal( sg.isValidOrigin( origin ), false, String( origin ) );
	} );
} );

test( 'a submitted survey from the survey origin is recorded', () => {
	const page = makePage();
	post( page.window, SUBMITTED, SURVEY_ORIGIN );

	const stored = JSON.parse( page.cookies.get( 'Surveys' ) );
	assert.deepEqual( stored.finished, [ 1234567 ] );
	assert.deepEqual( page.tracked.map( ( t ) => t.topic ), [ 'survey.completed' ] );
	assert.deepEqual( page.errors, [] );
} );

test( 'a numeric-string survey ID is stored as a number', () => {
	const page = makePage();
	post( page.window, JSON.stringify( { action: 'status', status: 'submitted', id: '42' } ), SURVEY_ORIGIN );

	assert.deepEqual( JSON.parse( page.cookies.get( 'Surveys' ) ).finished, [ 42 ] );
} );

test( 'the user type from the survey origin is recorded', () => {
	const page = makePage();
	post( page.window, JSON.stringify( { action: 'userType', status: 'student' } ), SURVEY_ORIGIN );

	assert.equal( JSON.parse( page.cookies.get( 'Surveys' ) ).userType, 'student' );
} );

test( 'malformed or non-string message data is ignored without an error', () => {
	const page = makePage();
	[ 'not json', '{', '', 'null', '42', '"text"', 123, { action: 'status' }, null ].forEach( ( data ) => {
		assert.doesNotThrow( () => {
			page.window.mw.wr.sg.handleMessage( data, SURVEY_ORIGIN );
		}, String( data ) );
		post( page.window, data, SURVEY_ORIGIN );
	} );

	assert.equal( page.cookies.has( 'Surveys' ), false );
	assert.deepEqual( page.tracked, [] );
	assert.deepEqual( page.errors, [] );
} );

test( 'a survey ID or user type of the wrong type is not stored', () => {
	const page = makePage();
	[ { a: 1 }, [ 1 ], '12abc', '', -5, 0, 1.5, true, null, '9'.repeat( 20 ) ].forEach( ( id ) => {
		post( page.window, JSON.stringify( { action: 'status', status: 'submitted', id } ), SURVEY_ORIGIN );
	} );
	[ { a: 1 }, [ 'x' ], 5, true, null, '', 'x'.repeat( 65 ) ].forEach( ( status ) => {
		post( page.window, JSON.stringify( { action: 'userType', status } ), SURVEY_ORIGIN );
	} );

	assert.equal( page.cookies.has( 'Surveys' ), false );
	assert.deepEqual( page.tracked, [] );
	assert.deepEqual( page.errors, [] );
} );

test( 'closeDialog works when no ShareBar modal exists', () => {
	const page = makePage();
	post( page.window, JSON.stringify( { action: 'closeDialog' } ), SURVEY_ORIGIN );

	assert.deepEqual( page.errors, [] );
} );

test( 'a malformed stored cookie falls back to an empty status', () => {
	[
		'not json',
		'null',
		'[]',
		JSON.stringify( { rejected: 'x', started: [ 3, 'y', { a: 1 } ], finished: null, userType: { a: 1 } } )
	].forEach( ( cookie ) => {
		const page = makePage( cookie );
		const status = plain( page.window.mw.wr.sg.status );

		assert.deepEqual( page.errors, [], cookie );
		assert.deepEqual( status.rejected, [], cookie );
		assert.deepEqual( status.finished, [], cookie );
		assert.equal( status.userType, null, cookie );
		assert.ok( Array.isArray( status.started ), cookie );
	} );
	assert.deepEqual(
		plain( makePage( JSON.stringify( { started: [ 3, 'y', '7' ] } ) ).window.mw.wr.sg.status.started ),
		[ 3, 7 ]
	);
} );
