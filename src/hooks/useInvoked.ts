import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export default function useInvoked<T>(
    cmd: string,
    args?: InvokeArgs,
): {
    data: T | undefined;
    loading: boolean;
    error: Error | undefined;
    refetch: () => Promise<void>;
} {
    const [result, setResult] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(undefined);
            try {
                const data = await invoke<T>(cmd, args);
                setResult(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cmd, args]);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const data = await invoke<T>(cmd, args);
            setResult(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [cmd, args]);

    return { data: result, loading, error, refetch };
}

export function buildInvokeHook<T, A extends InvokeArgs = InvokeArgs>(
    cmd: string,
): (args?: A) => ReturnType<typeof useInvoked<T>> {
    return function useCustomInvoked(args): {
        data: T | undefined;
        loading: boolean;
        error: Error | undefined;
        refetch: () => Promise<void>;
    } {
        return useInvoked<T>(cmd, args);
    };
}
