/** @format */

/**
 * External dependencies
 */
import { connect } from 'react-redux';
import { useTranslate } from 'i18n-calypso';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

/**
 * Internal dependencies
 */
import { abtest } from 'lib/abtest';
import Button from 'components/button';
import CompactCard from 'components/card/compact';
import { areAllUsersValid, getItemsForCart, newUsers } from 'lib/gsuite/new-users';
import GoogleAppsProductDetails from './product-details';
import GSuiteNewUserList from 'components/gsuite/gsuite-new-user-list';
import { getCurrentUserCurrencyCode } from 'state/current-user/selectors';
import QueryProducts from 'components/data/query-products-list';
import { getProductCost } from 'state/products-list/selectors';
import { recordTracksEvent as recordTracksEventAction } from 'state/analytics/actions';

/**
 * Style dependencies
 */
import './style.scss';

const GSuiteDialog = ( {
	currencyCode,
	domain,
	gsuiteBasicCost,
	onAddEmailClick,
	onSkipClick,
	recordTracksEvent,
} ) => {
	const [ users, setUsers ] = useState( newUsers( domain ) );

	const canContinue = areAllUsersValid( users );
	// leave this as a variable for future g suite business support
	const productSlug = 'gapps';
	const translate = useTranslate();

	const recordClickEvent = eventName => {
		recordTracksEvent( eventName, {
			domain_name: domain,
			user_count: users.length,
		} );
	};

	const recordUsersChangedEvent = ( previousUsers, nextUsers ) => {
		if ( previousUsers.length !== nextUsers.length ) {
			recordTracksEvent( 'calypso_checkout_gsuite_upgrade_users_changed', {
				domain_name: domain,
				next_user_count: nextUsers.length,
				prev_user_count: previousUsers.length,
			} );
		}
	};

	const handleAddEmailClick = () => {
		recordClickEvent( `calypso_checkout_gsuite_upgrade_add_email_button_click` );

		if ( canContinue ) {
			onAddEmailClick( getItemsForCart( [ domain ], productSlug, users ) );
		}
	};

	const handleSkipClick = () => {
		recordClickEvent( `calypso_checkout_gsuite_upgrade_skip_button_click` );
		onSkipClick();
	};

	const handleUsersChange = changedUsers => {
		recordUsersChangedEvent( users, changedUsers );
		setUsers( changedUsers );
	};

	const renderAddEmailButtonText = () =>
		abtest( 'gSuiteContinueButtonCopy' ) === 'purchase'
			? translate( 'Purchase G Suite' )
			: translate( 'Yes, Add Email \u00BB' );

	return (
		<div className="gsuite-dialog__form">
			<QueryProducts />
			<CompactCard>
				<header className="gsuite-dialog__header">
					<h2 className="gsuite-dialog__title">
						{ translate( 'Add Professional email from G Suite by Google Cloud to %(domain)s', {
							args: {
								domain,
							},
						} ) }
					</h2>
					<h5 className="gsuite-dialog__no-setup-required">
						{ translate( 'No setup or software required. Easy to manage from your dashboard.' ) }
					</h5>
				</header>
			</CompactCard>
			<CompactCard>
				<GoogleAppsProductDetails
					domain={ domain }
					cost={ gsuiteBasicCost }
					currencyCode={ currencyCode }
					plan={ productSlug }
				/>
				<GSuiteNewUserList
					extraValidation={ user => user }
					selectedDomainName={ domain }
					onUsersChange={ handleUsersChange }
					users={ users }
				>
					<div className="gsuite-dialog__buttons">
						<Button onClick={ handleSkipClick }>{ translate( 'Skip' ) }</Button>

						<Button primary disabled={ ! canContinue } onClick={ handleAddEmailClick }>
							{ renderAddEmailButtonText() }
						</Button>
					</div>
				</GSuiteNewUserList>
			</CompactCard>
		</div>
	);
};

GSuiteDialog.propTypes = {
	currencyCode: PropTypes.string,
	domain: PropTypes.string.isRequired,
	gsuiteBasicCost: PropTypes.number,
	onAddEmailClick: PropTypes.func.isRequired,
	onSkipClick: PropTypes.func.isRequired,
};

export default connect(
	state => ( {
		currencyCode: getCurrentUserCurrencyCode( state ),
		gsuiteBasicCost: getProductCost( state, 'gapps' ),
	} ),
	{ recordTracksEvent: recordTracksEventAction }
)( GSuiteDialog );
