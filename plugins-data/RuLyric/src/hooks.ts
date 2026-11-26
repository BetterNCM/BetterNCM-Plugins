export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    parse: (string: string) => T = JSON.parse,
    stringify: (value: T) => string = JSON.stringify,
): [T, (value: T | ((prevValue: T) => T)) => void] {
    const [storedValue, setStoredValue] = React.useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? parse(item) : initialValue;
        } catch (error) {
            console.log(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((prevValue: T) => T)) => {
        try {
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, stringify(valueToStore));
        } catch (error) {
            console.log(error);
        }
    };

    return [storedValue, setValue];
}

import * as React from 'react';
// from react-use-promise

import { useEffect, useReducer } from 'react';

function resolvePromise(promise) {
    if (typeof promise === 'function') {
        return promise();
    }

    return promise;
}

const states = {
    pending: 'pending',
    rejected: 'rejected',
    resolved: 'resolved'
};

const defaultState = {
    error: undefined,
    result: undefined,
    state: states.pending
};

function reducer(state, action) {
    switch (action.type) {
        case states.pending:
            return defaultState;

        case states.resolved:
            return {
                error: undefined,
                result: action.payload,
                state: states.resolved
            };

        case states.rejected:
            return {
                error: action.payload,
                result: undefined,
                state: states.rejected
            };

        /* istanbul ignore next */
        default:
            return state;
    }
}

export function usePromise(promise, inputs) {
    const [{ error, result, state }, dispatch] = React.useReducer(reducer, defaultState);

    React.useEffect(() => {
        promise = resolvePromise(promise);

        if (!promise) {
            return;
        }

        let canceled = false;

        dispatch({ type: states.pending });

        promise.then(
            result => !canceled && dispatch({
                payload: result,
                type: states.resolved
            }),
            error => !canceled && dispatch({
                payload: error,
                type: states.rejected
            })
        );

        return () => {
            canceled = true;
        };
    }, inputs);

    return [result, error, state];
}

// https://www.30secondsofcode.org/articles/s/react-use-interval-explained
export function useInterval(callback, delay) {
    const savedCallback = React.useRef();

    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        function tick() {
            // @ts-ignore
            savedCallback.current();
        }
        let id = setInterval(tick, delay);
        return () => clearInterval(id);
    }, []);
}