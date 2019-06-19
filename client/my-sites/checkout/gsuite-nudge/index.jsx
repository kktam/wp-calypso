/** @format */

/**
 * External dependencies
 */
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';
import { get, some, compact } from 'lodash';
import page from 'page';

/**
 * Internal dependencies
 */
import DocumentHead from 'components/data/document-head';
import GSuiteDialog from 'components/upgrades/gsuite/gsuite-dialog';
import Main from 'components/main';
import QuerySites from 'components/data/query-sites';
import { getSiteSlug, getSiteTitle } from 'state/sites/selectors';
import { getReceiptById } from 'state/receipts/selectors';
import isEligibleForDotcomChecklist from 'state/selectors/is-eligible-for-dotcom-checklist';
import { addItems, removeItem } from 'lib/upgrades/actions';
import { getAllCartItems } from 'lib/cart-values/cart-items';
import { isDotComPlan } from 'lib/products-values';
import PageViewTracker from 'lib/analytics/page-view-tracker';
import { abtest } from 'lib/abtest';

/**
 * Style dependencies
 */
import './style.scss';

export class GSuiteNudge extends React.Component {
	static propTypes = {
		domain: PropTypes.string.isRequired,
		receiptId: PropTypes.number.isRequired,
		selectedSiteId: PropTypes.number.isRequired,
	};

	handleSkipClick = () => {
		const { siteSlug, receiptId, isEligibleForChecklist } = this.props;

		const destination = abtest( 'improvedOnboarding' ) === 'onboarding' ? 'view' : 'checklist';

		page(
			isEligibleForChecklist
				? `/${ destination }/${ siteSlug }`
				: `/checkout/thank-you/${ siteSlug }/${ receiptId }`
		);
	};

	handleAddEmailClick = cartItems => {
		const { siteSlug, receiptId } = this.props;
		this.removePlanFromCart();

		addItems(
			// add `receipt_for_domain` to cartItem extras
			cartItems.map( item => ( {
				...item,
				extra: { ...item.extra, receipt_for_domain: receiptId },
			} ) )
		);

		page( `/checkout/${ siteSlug }` );
	};

	removePlanFromCart() {
		const items = getAllCartItems( this.props.cart );
		items.filter( isDotComPlan ).forEach( function( item ) {
			removeItem( item, false );
		} );
	}

	render() {
		const { domain, receiptId, selectedSiteId, siteSlug, siteTitle, translate } = this.props;

		return (
			<Main className="gsuite-nudge">
				<PageViewTracker
					path={
						receiptId
							? '/checkout/:site/with-gsuite/:domain/:receipt_id'
							: '/checkout/:site/with-gsuite/:domain'
					}
					title="G Suite Upsell"
					properties={ { site: siteSlug, domain, ...( receiptId && { receipt_id: receiptId } ) } }
				/>
				<DocumentHead
					title={ translate( 'Add G Suite < %(siteTitle)s', {
						args: { siteTitle },
					} ) }
				/>
				<QuerySites siteId={ selectedSiteId } />
				<GSuiteDialog
					domain={ this.props.domain }
					onSkipClick={ this.handleSkipClick }
					onAddEmailClick={ this.handleAddEmailClick }
				/>
			</Main>
		);
	}
}

export default connect( ( state, props ) => {
	const { receiptId, selectedSiteId: siteId } = props;
	const purchases = get( getReceiptById( state, receiptId ), 'data.purchases', [] );
	const isEligibleForChecklist =
		some( compact( purchases ), isDotComPlan ) && isEligibleForDotcomChecklist( state, siteId );

	return {
		siteSlug: getSiteSlug( state, props.selectedSiteId ),
		siteTitle: getSiteTitle( state, props.selectedSiteId ),
		isEligibleForChecklist,
	};
} )( localize( GSuiteNudge ) );
