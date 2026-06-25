(function () {
    const config = window.DREAMS_SUPABASE_CONFIG || {};
    const isConfigured = Boolean(config.url && config.anonKey && window.supabase);
    const client = isConfigured ? window.supabase.createClient(config.url, config.anonKey) : null;

    function configured() {
        return Boolean(client);
    }

    async function getSession() {
        if (!client) return null;
        const { data } = await client.auth.getSession();
        return data.session;
    }

    async function signIn(email, password) {
        if (!client) throw new Error('Supabase no esta configurado.');
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function resetPassword(email) {
        if (!client) throw new Error('Supabase no esta configurado.');
        const { data, error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}${window.location.pathname.replace(/index\.html$/, '')}index.html#login-contabilidad`
        });
        if (error) throw error;
        return data;
    }

    async function signOut() {
        if (!client) return;
        await client.auth.signOut();
    }

    async function loadAccountingRecords() {
        if (!client) return null;
        const { data, error } = await client
            .from('accounting_records')
            .select('id, collection, data, updated_at')
            .order('updated_at', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async function upsertAccountingRecords(records) {
        if (!client || !records.length) return;
        const { error } = await client
            .from('accounting_records')
            .upsert(records, { onConflict: 'id' });
        if (error) throw error;
    }

    async function deleteAccountingRecord(id) {
        if (!client) return;
        const { error } = await client
            .from('accounting_records')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    window.dreamsSupabase = {
        configured,
        getSession,
        signIn,
        resetPassword,
        signOut,
        loadAccountingRecords,
        upsertAccountingRecords,
        deleteAccountingRecord
    };
})();
