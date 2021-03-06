/** @format */
/**
 * External dependencies
 */
import { assign } from 'lodash';
import debugModule from 'debug';

/**
 * Internal dependencies
 */
import {
	CART_COUPON_APPLY,
	CART_COUPON_REMOVE,
	CART_DISABLE,
	CART_ITEM_REMOVE,
	CART_ITEM_REPLACE,
	CART_ITEMS_ADD,
	CART_ITEMS_REPLACE_ALL,
	CART_ON_MOBILE_SHOW,
	CART_PRIVACY_PROTECTION_ADD,
	CART_PRIVACY_PROTECTION_REMOVE,
	GOOGLE_APPS_REGISTRATION_DATA_ADD,
	CART_TAX_COUNTRY_CODE_SET,
	CART_TAX_POSTAL_CODE_SET,
} from 'lib/upgrades/action-types';
import Dispatcher from 'dispatcher';
import { domainRegistration } from 'lib/cart-values/cart-items';
import { urlParseAmpCompatible } from 'lib/analytics/utils';

// We need to load the CartStore to make sure the store is registered with the
// dispatcher even though it's not used directly here
import 'lib/cart/store';

/**
 * Constants
 */
const debug = debugModule( 'calypso:signup:cart' );
const MARKETING_COUPONS_KEY = 'marketing-coupons';

export function disableCart() {
	Dispatcher.handleViewAction( { type: CART_DISABLE } );
}

export function showCartOnMobile( show ) {
	Dispatcher.handleViewAction( {
		type: CART_ON_MOBILE_SHOW,
		show,
	} );
}

export function addPrivacyToAllDomains() {
	Dispatcher.handleViewAction( {
		type: CART_PRIVACY_PROTECTION_ADD,
	} );
}

export function removePrivacyFromAllDomains() {
	Dispatcher.handleViewAction( {
		type: CART_PRIVACY_PROTECTION_REMOVE,
	} );
}

export function addItem( item ) {
	addItems( [ item ] );
}

export function addItems( items ) {
	const extendedItems = items.map( item => {
		const extra = assign( {}, item.extra, {
			context: 'calypstore',
		} );
		return assign( {}, item, { extra } );
	} );

	Dispatcher.handleViewAction( {
		type: CART_ITEMS_ADD,
		cartItems: extendedItems,
	} );
}

export function replaceCartWithItems( items ) {
	const extendedItems = items.map( item => {
		const extra = assign( {}, item.extra, {
			context: 'calypstore',
		} );
		return assign( {}, item, { extra } );
	} );

	Dispatcher.handleViewAction( {
		type: CART_ITEMS_REPLACE_ALL,
		cartItems: extendedItems,
	} );
}

export function removeItem( item, domainsWithPlansOnly ) {
	Dispatcher.handleViewAction( {
		type: CART_ITEM_REMOVE,
		cartItem: item,
		domainsWithPlansOnly,
	} );
}

export function replaceItem( oldItem, newItem ) {
	Dispatcher.handleViewAction( {
		type: CART_ITEM_REPLACE,
		oldItem,
		newItem,
	} );
}

export function addDomainToCart( domainSuggestion ) {
	addItem(
		domainRegistration( {
			domain: domainSuggestion.domain_name,
			productSlug: domainSuggestion.product_slug,
		} )
	);
}

export function addGoogleAppsRegistrationData( registrationData ) {
	Dispatcher.handleViewAction( {
		type: GOOGLE_APPS_REGISTRATION_DATA_ADD,
		registrationData: registrationData,
	} );
}

export function removeDomainFromCart( domainSuggestion ) {
	removeItem(
		domainRegistration( {
			domain: domainSuggestion.domain_name,
			productSlug: domainSuggestion.product_slug,
		} )
	);
}

export function applyCoupon( coupon ) {
	Dispatcher.handleViewAction( {
		type: CART_COUPON_APPLY,
		coupon,
	} );
}

export function removeCoupon() {
	Dispatcher.handleViewAction( {
		type: CART_COUPON_REMOVE,
	} );
}

export function saveCouponQueryArgument() {
	// read coupon query argument, return early if there is none
	const parsedUrl = urlParseAmpCompatible( location.href );
	const couponCode = parsedUrl.query.coupon;
	if ( ! couponCode ) {
		return;
	}

	// read coupon list from localStorage, create new if it's not there yet, refresh existing
	const couponsJson = localStorage.getItem( MARKETING_COUPONS_KEY );
	const coupons = JSON.parse( couponsJson ) || {};
	const ONE_WEEK_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
	const now = Date.now();
	debug( 'Found coupons in localStorage: ', coupons );

	coupons[ couponCode ] = now;

	// delete coupons if they're older than a week
	Object.keys( coupons ).forEach( key => {
		if ( now > coupons[ key ] + ONE_WEEK_MILLISECONDS ) {
			delete coupons[ key ];
		}
	} );

	// write remembered coupons back to localStorage
	debug( 'Storing coupons in localStorage: ', coupons );
	localStorage.setItem( MARKETING_COUPONS_KEY, JSON.stringify( coupons ) );
}

export function getRememberedCoupon() {
	// read coupon list from localStorage, return early if it's not there
	const couponsJson = localStorage.getItem( MARKETING_COUPONS_KEY );
	const coupons = JSON.parse( couponsJson );
	if ( ! coupons ) {
		debug( 'No coupons found in localStorage: ', coupons );
		return null;
	}
	const COUPON_CODE_WHITELIST = [
		'ALT',
		'FIVERR',
		'GENEA',
		'KITVISA',
		'LINKEDIN',
		'PATREON',
		'ROCKETLAWYER',
		'SAFE',
		'SBDC',
		'TXAM',
	];
	const ONE_WEEK_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
	const now = Date.now();
	debug( 'Found coupons in localStorage: ', coupons );

	// delete coupons if they're older than a week; find the most recent one
	let mostRecentTimestamp = 0;
	let mostRecentCouponCode = null;
	Object.keys( coupons ).forEach( key => {
		if ( now > coupons[ key ] + ONE_WEEK_MILLISECONDS ) {
			delete coupons[ key ];
		} else if ( coupons[ key ] > mostRecentTimestamp ) {
			mostRecentCouponCode = key;
			mostRecentTimestamp = coupons[ key ];
		}
	} );

	// write remembered coupons back to localStorage
	debug( 'Storing coupons in localStorage: ', coupons );
	localStorage.setItem( MARKETING_COUPONS_KEY, JSON.stringify( coupons ) );
	if (
		COUPON_CODE_WHITELIST.includes(
			mostRecentCouponCode.substring( 0, mostRecentCouponCode.indexOf( '_' ) )
		)
	) {
		debug( 'returning coupon code:', mostRecentCouponCode );
		return mostRecentCouponCode;
	}
	debug( 'not returning any coupon code.' );
	return null;
}

export function setTaxCountryCode( countryCode ) {
	Dispatcher.handleViewAction( {
		type: CART_TAX_COUNTRY_CODE_SET,
		countryCode,
	} );
}

export function setTaxPostalCode( postalCode ) {
	Dispatcher.handleViewAction( {
		type: CART_TAX_POSTAL_CODE_SET,
		postalCode,
	} );
}
