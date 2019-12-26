import { useContext, useReducer } from 'preact/hooks';

import { useXProps } from './helpers';
import ServerContext from '../serverContext';
import request from '../request';

const reducer = (state, action) => {
    switch (action.type) {
        case 'input':
            return {
                ...state,
                inputValue: action.data
            };
        case 'fetch':
            return {
                ...state,
                isLoading: true,
                prevValue: state.inputValue
            };
        case 'terms':
            return {
                isLoading: false,
                terms: action.data,
                inputValue: action.data.formattedAmount,
                prevValue: action.data.formattedAmount
            };
        default:
            throw new Error('Invalid action type');
    }
};

const delocalize = (country, amount) => (country === 'DE' ? amount.replace(/\./, '').replace(/,/, '.') : amount);
const localize = (country, amount) => {
    const number = Number(amount) || Number(0);
    if (country === 'DE') {
        return number.toLocaleString('de-DE', {
            currency: 'EUR',
            minimumFractionDigits: 2
        });
    }

    return number.toLocaleString('en-US', {
        currency: 'USD',
        minimumFractionDigits: 2
    });
};

export default function useCalculator() {
    const { terms, meta } = useContext(ServerContext);
    const { payerId, clientId, country } = useXProps();
    const [state, dispatch] = useReducer(reducer, {
        inputValue: localize(country, terms.amount),
        prevValue: localize(country, terms.amount),
        terms,
        isLoading: false
    });

    // TODO: Input validation
    const changeInput = evt => {
        dispatch({ type: 'input', data: evt.target.value });
    };

    const submit = event => {
        event.preventDefault();

        if (state.prevValue !== state.inputValue) {
            dispatch({ type: 'fetch' });
            request(
                'POST',
                `http://localhost.paypal.com:8443/crcpresentmentnodeweb/calculateTerms?amount=${delocalize(
                    country,
                    state.inputValue
                )}&country=${country}&${clientId ? `client_id=${clientId}` : `payer_id=${payerId}`}`,
                {
                    headers: {
                        'x-csrf-token': meta.csrf
                    }
                }
            ).then(({ data }) => {
                dispatch({ type: 'terms', data });
            });
        }
    };

    return {
        terms: state.terms,
        value: state.inputValue,
        isLoading: state.isLoading,
        changeInput,
        submit
    };
}
