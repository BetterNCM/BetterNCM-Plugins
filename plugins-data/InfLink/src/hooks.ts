import { useState } from "react";

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    parse: (string:string) => T = JSON.parse,
    stringify: (value:T) => string = JSON.stringify,
): [T, (value: T | ((prevValue: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState(() => {
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