// @TODO should we handle .sg-b-p-c (survey close) as well?

/* @global sg_beacon */
mw.wr = mw.wr || {};	// Might not be defined yet

mw.wr.sg = {
	settings: mw.config.get( 'wgSurveyGizmo' ),
	_this: this,
	cookieName: 'Surveys',
	visitorCookie: '_sg_b_v',
	status: {},
	surveyID: null,
	// Exact scheme + host (+ port) origins the survey frame may post from
	allowedOrigins: [
		'https://www.alchemer.com',
		'https://survey.alchemer.com'
	],
	maxUserTypeLength: 64,

	isLandingPage: function () {
		return document.referrer.indexOf( location.protocol + '//' + location.host ) !== 0;
	},

	addSurveyGizmoCode: function () {
		/* eslint-disable camelcase */
		window.SurveyGizmoBeacon = 'sg_beacon';
		window.sg_beacon = window.sg_beacon || function () {
			( window.sg_beacon.q = window.sg_beacon.q || [] ).push( arguments );
		};
		/* eslint-enable camelcase */
		mw.loader.load( mw.wr.sg.settings.beaconUrl );
		sg_beacon( 'init', mw.wr.sg.settings.beaconID );
		sg_beacon( 'data', 'wgTitle', mw.config.get( 'wgTitle' ) );
		sg_beacon( 'data', 'referrerUrl', location.origin + location.pathname );
		sg_beacon( 'data', 'isLandingPage', mw.wr.sg.isLandingPage() ? 'true' : 'false' );
		sg_beacon( 'data', 'wgCategories', mw.config.get( 'wgCategories' ).join( ',' ) );
		sg_beacon( 'data', 'rejectedSurveys', mw.wr.sg.status.rejected.join( ',' ) );
		sg_beacon( 'data', 'startedSurveys', mw.wr.sg.status.started.join( ',' ) );
		sg_beacon( 'data', 'finishedSurveys', mw.wr.sg.status.finished.join( ',' ) );
		sg_beacon( 'data', 'userType', mw.wr.sg.status.userType );
		sg_beacon( 'onoffered', mw.wr.sg.onSurveyOffered );
		sg_beacon( 'onlit', mw.wr.sg.onInterceptLit );

	},

	onInterceptLit: function () {
		if ( mw.centralNotice ) {
			mw.centralNotice.setBannerLoadedButHidden( 'surveyloaded' );
		}
	},

	onSurveyOffered: function() {
		mw.wr.sg.trackAnalyticsEvent( 'offered' );

		// .sg-b-l-t is the "Take Survey" button on the intercept dialog
		$( '.sg-b-l-t' ).on( 'click', function () {
			if ( mw.wr.sg.getSurveyID() ) {
				mw.wr.sg.status.started.push( mw.wr.sg.surveyID );
				mw.wr.sg.trackAnalyticsEvent( 'started' );
				mw.wr.sg.updateCookie();
				mw.wr.sg.turnIntoRealModal();
			}
		} );
	},

	getSurveyID: function () {
		var $realLink,
			matches;

		if ( mw.wr.sg.surveyID ) {
			return mw.wr.sg.surveyID;
		}
		$realLink = $( '.sg-b-l-m' );
		matches = $realLink.length > 0 ?
			$realLink.attr( 'href' ).match( /\/s3\/(\d+)\// ) :
			null;

		if ( matches && $.isArray( matches ) && matches[ 1 ] ) {
			mw.wr.sg.surveyID = parseInt( matches[ 1 ] );
			return mw.wr.sg.surveyID;
		}

		return null;
	},

	addMessageListener: function () {
		$( window ).on( 'message', ( event ) => {
			const nativeEvent = event.originalEvent || event;
			mw.wr.sg.handleMessage( nativeEvent.data, nativeEvent.origin );
		} );
	},

	/**
	 * Act on a message posted by the survey frame.
	 *
	 * @param {*} rawData The message's data, expected to be a JSON string
	 * @param {string} origin The origin the browser reports for the sender
	 */
	handleMessage: function ( rawData, origin ) {
		let data;

		if ( !mw.wr.sg.isValidOrigin( origin ) ) {
			return; // La la la, I'm not listening to you!
		}
		if ( typeof rawData !== 'string' ) {
			return;
		}
		try {
			data = JSON.parse( rawData );
		} catch ( e ) {
			return;
		}
		if ( !data || typeof data !== 'object' ) {
			return;
		}

		if ( data.action === 'status' ) {
			const surveyID = mw.wr.sg.parseSurveyID( data.id );
			if ( data.status === 'submitted' && surveyID !== null ) {
				mw.wr.sg.status.finished.push( surveyID );
				mw.wr.sg.trackAnalyticsEvent( 'completed' );
				mw.wr.sg.updateCookie();
			}
		} else if ( data.action === 'userType' ) {
			if ( !mw.wr.sg.isValidUserType( data.status ) ) {
				return;
			}
			mw.log( 'User type: ' + data.status );
			mw.wr.sg.status.userType = data.status;
			mw.wr.sg.updateCookie();
		} else if ( data.action === 'closeDialog' ) {
			mw.wr.sg.closeDialog();
			// In case the survey was loaded in Extension:ShareBar's modal:
			if ( typeof window.closeActiveModal === 'function' ) {
				window.closeActiveModal();
			}
		}
	},

	/**
	 * @param {*} id A survey ID as received in a message
	 * @return {number|null} The ID as a positive integer, or null if it is not one
	 */
	parseSurveyID: function ( id ) {
		if ( typeof id === 'string' && /^[0-9]{1,15}$/.test( id ) ) {
			id = parseInt( id, 10 );
		}
		if ( Number.isSafeInteger( id ) && id > 0 ) {
			return id;
		}
		return null;
	},

	/**
	 * @param {*} userType A user type as received in a message
	 * @return {boolean}
	 */
	isValidUserType: function ( userType ) {
		return typeof userType === 'string' &&
			userType.length > 0 &&
			userType.length <= mw.wr.sg.maxUserTypeLength;
	},

	// @todo Find a way to send user type as a custom dimension in Universal Analytics
	trackAnalyticsEvent: function ( surveyAction ) {
		var surveyID = mw.wr.sg.getSurveyID();
		mw.track( 'survey.' + surveyAction, {
			action: surveyAction,
			label: surveyID ? surveyID.toString() : null,
			value: null
		} );
	},

	/**
	 * @param {*} origin
	 * @return {boolean} Whether origin is exactly one of the allowed origins
	 */
	isValidOrigin: function ( origin ) {
		return typeof origin === 'string' && mw.wr.sg.allowedOrigins.includes( origin );
	},

	updateCookie: function () {
		mw.loader.using( 'mediawiki.cookie', function () {
			mw.log( mw.wr.sg.status );
			// @NOTICE jQuery.cookie treats expires as days, mw.cookie treats it as seconds!
			mw.cookie.set(
				mw.wr.sg.cookieName,
				JSON.stringify( mw.wr.sg.status ),
				{ expires: 31536000 }
			);
		} );

	},

	setInterceptCloseHandler: function () {
		$( 'body' ).on( 'click', '.sg-js-d', function () {
			// On clicking the intercept "close" button
			if ( mw.wr.sg.getSurveyID() ) {
				mw.wr.sg.status.rejected.push( mw.wr.sg.surveyID );
				mw.wr.sg.trackAnalyticsEvent( 'rejected' );
				mw.wr.sg.updateCookie();
			} else {
				mw.log.warn( 'No survey ID to log' );
			}
		} );
	},

	closeDialog: function () {
		// Mime clicking on the close button...
		$( '.sg-b-p-c' ).click();
	},

	/**
	 * SurveyGizmo's survey window is closed on clicking the overlay,
	 * which is no good. This is a hack to prevent that.
	 * @TODO get this to actually work...
	 */
	turnIntoRealModal: function () {
		$( '.sg-b-p-m' ).on( 'click', function ( e ) {
			e.stopImmediatePropagation();
		} );
	},

	/**
	 * Read the stored status, falling back to an empty one for any part
	 * that is missing or malformed.
	 *
	 * @param {string|null} cookieVal
	 * @return {Object}
	 */
	parseStatusCookie: function ( cookieVal ) {
		let stored = null;
		const status = {
			rejected: [],
			started: [],
			finished: [],
			userType: null
		};

		if ( cookieVal ) {
			try {
				stored = JSON.parse( cookieVal );
			} catch ( e ) {
				stored = null;
			}
		}
		if ( !stored || typeof stored !== 'object' ) {
			return status;
		}
		[ 'rejected', 'started', 'finished' ].forEach( ( key ) => {
			if ( Array.isArray( stored[ key ] ) ) {
				status[ key ] = stored[ key ]
					.map( mw.wr.sg.parseSurveyID )
					.filter( ( id ) => id !== null );
			}
		} );
		if ( mw.wr.sg.isValidUserType( stored.userType ) ) {
			status.userType = stored.userType;
		}
		return status;
	},

	init: function () {
		// Cancel if a banner is already showing
		if (
			mw.centralNotice &&
			typeof ( mw.centralNotice.isBannerShown ) === 'function' &&
			mw.centralNotice.isBannerShown()
		) {
			return false;
		}

		mw.loader.using( 'mediawiki.cookie', () => {
			mw.wr.sg.status = mw.wr.sg.parseStatusCookie( mw.cookie.get( mw.wr.sg.cookieName ) );
		} );

		mw.wr.sg.addSurveyGizmoCode();

		this.addMessageListener();
		this.setInterceptCloseHandler();

	}

};

mw.wr.sg.init();
